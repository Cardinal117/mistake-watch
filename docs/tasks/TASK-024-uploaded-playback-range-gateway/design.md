# Design: Authorized Uploaded Playback Range Gateway

Status: Proposed
Updated: 2026-09-01

## Architecture

```text
Browser on watch.mistakestudios.com
  1. GET current Vercel playback bootstrap route with normal app credentials
  2. Receive a session-path-scoped HttpOnly media credential and clean URL
  3. Set <video|audio>.src to media.watch.mistakestudios.com/.../content

Cloudflare Worker on media.watch.mistakestudios.com
  4. Receive every initial and later Range request at the same stable URL
  5. Send the opaque media credential plus Worker-origin secret to Vercel

Vercel internal authorization route
  6. Verify origin secret and signed credential
  7. Recheck active participant, matching active/unexpired room-media session,
     room identity, and ready asset in Supabase
  8. Return the selected private object key and safe metadata server-to-server

Cloudflare Worker
  9. Read the authorized range through the private R2 binding
 10. Stream 200/206 or return a precise fail-closed error
```

## Host And DNS Boundary

- Keep `watch.mistakestudios.com` directly on Vercel.
- Create a dedicated Worker Custom Domain, provisionally
  `media.watch.mistakestudios.com`.
- Do not use a Worker Route on the app hostname: that requires Cloudflare-proxied
  DNS and expands the task into an application-edge migration.
- Do not reuse the disabled public R2 custom domain.

## Browser Credential

The bootstrap route should set a new cookie with these properties:

- dedicated name such as `__Secure-mw_media_access`;
- `Secure`, `HttpOnly`, and `SameSite=Strict`;
- `Domain=watch.mistakestudios.com`, so the media child host can receive it;
- `Path=/room-sessions/{sessionId}/`, so simultaneous sessions do not collide;
- expiry no later than the room-media session expiry;
- signed versioned payload bound to `roomId`, `sessionId`, `memberId`, expiry,
  and a random token identifier;
- no account token, guest token, email, object key, or provider credential.

The cookie is a capability to request a fresh authorization decision, not proof
that access is still allowed. Vercel must verify the signature and current
database state for each range. Use constant-time secret/signature comparison.

The feasibility spike must prove that the real media element sends this cookie
on repeated cross-origin requests. If not, stop. Query-string credentials are
not an approved fallback.

## Vercel Authorization Boundary

Add a server-only route, provisionally
`POST /api/internal/media/range-authorize`, which:

1. accepts only the configured Worker origin credential;
2. validates the media credential signature, version, expiry, and identifiers;
3. loads the exact room-media session, room member, and ready asset;
4. reuses the existing `canWatchRoomMedia` policy where possible;
5. rejects ended/expired/mismatched sessions, inactive or missing members,
   unavailable assets, and missing object keys;
6. returns only the selected object key and safe delivery metadata over the
   Worker-to-Vercel channel;
7. sets `Cache-Control: no-store` and emits sanitized outcome telemetry only.

The route must not accept a member ID by itself as authority. The signed media
credential establishes the original identity, and current Supabase state decides
whether that identity is still allowed. The Supabase service-role client remains
server-only. The preferred design adds no table or policy.

## Worker Request Contract

Supported public methods:

- `GET` with no range for normal initial requests where the browser requires it;
- `GET` with one valid byte range;
- `HEAD` only if the browser feasibility evidence requires it.

Other methods fail with `405`. Unsupported multi-range requests fail explicitly;
they must not be broadened into a full-object response.

After authorization, use the R2 binding rather than an S3 presigned URL. Pass the
validated range to `R2Bucket.get`, stream the body, and preserve safe metadata.
Expected responses:

- `200` for an allowed full representation;
- `206` with correct `Accept-Ranges`, `Content-Range`, `Content-Length`,
  `Content-Type`, and `ETag` for a satisfiable range;
- `416` with `Content-Range: bytes */{size}` for an unsatisfiable range;
- `401` or `403` for missing, invalid, expired, or revoked credentials;
- `404` for an authorized session whose selected object no longer exists;
- `502` or `503` for a closed upstream/provider failure, never a public fallback.

Private responses use `Cache-Control: private, no-store`. Do not buffer the
entire object in Worker memory, transform the body, or log request cookies,
authorization headers, object keys, query strings, room IDs, session IDs, or
participant IDs.

## Secrets And Configuration

- Store the Worker-origin credential as a Cloudflare Worker secret and a Vercel
  server-only environment variable.
- Store the media-credential signing secret only in Vercel.
- Declare required secret names in Worker configuration but never values.
- Use separate test and production Workers, R2 bindings, secrets, and hostnames.
- Pin Wrangler and commit the lockfile if implementation introduces it.
- No secret-setting or provider mutation is part of source implementation or
  test execution without explicit approval.

## Client Integration

- Keep `mw-uploaded-session:{sessionId}` as canonical realtime state.
- Change only `resolveUploadedPlaybackUrl` and the uploaded-session source setup
  to receive the stable gateway URL and media cookie.
- Do not change `media.src` during renewal because renewal happens per request.
- Preserve current load, playback, error reporting, and synchronization logic.
- Ensure next-item metadata preloading never attempts to bypass gateway
  authorization or accidentally sends a gateway credential to another origin.

## Observability And Cost

Emit bounded counters/timings without identifiers or secrets:

- allowed and denied authorization outcomes by reason code;
- Worker-to-Vercel authorization latency;
- R2 status class and range/full request count;
- Worker exceptions and upstream timeouts.

Before production, record ranges per representative playback/seek session and
estimate:

```text
browser range ~= 1 Worker invocation + 1 Vercel authorization + 1 R2 Class B read
```

Confirm Cloudflare and Vercel limits, alerts, and a rollback threshold. No cache
optimization is permitted until revocation semantics receive separate review.

## Edge Cases

- Two room-media sessions open in separate tabs.
- Guest becomes inactive or is removed between consecutive ranges.
- Session ends or expires during buffered playback.
- Owner deletes or processing replaces the selected object.
- Browser retries the same range or requests an overlapping/suffix range.
- Browser sends no `Range`, an invalid range, or a multi-range value.
- Vercel authorization times out after the browser retries.
- R2 reports a missing object or fewer bytes than expected.
- Worker or Vercel secret rotation occurs while a media element is open.
- Credential cookie is blocked by browser privacy settings.

## Known Authorization Limitation

The existing room Kick reducer removes live SpacetimeDB participation but does
not delete the durable Supabase `room_members` row. This gateway revalidates the
durable room, member, media-session, and asset boundary on every request; it
therefore immediately observes room closure, session end/expiry, asset removal,
or durable membership removal, but not a live-only kick. Making Kick a durable
authorization revocation is separate room-lifecycle work and must not be hidden
inside this media transport fix.
