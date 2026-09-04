# Design: Authorized Uploaded Playback Range Gateway

Status: Candidate C locally complete; preview QA pending
Updated: 2026-09-04

## Architecture

```text
Browser on watch.mistakestudios.com
  1. GET current Vercel playback bootstrap route with normal app credentials
  2. Receive a host-only, session-path-scoped HttpOnly media credential
  3. Set <video|audio>.src to /media-gateway/.../content

Vercel external rewrite
  4. Preserve the browser URL and forward Cookie, Range, and media responses
     to the configured Worker upstream

Cloudflare Worker upstream
  5. Receive every initial and later request at one stable upstream path
  6. Send the opaque media credential plus Worker-origin secret to Vercel

Vercel internal authorization route
  7. Verify origin secret and signed credential
  8. Recheck active participant, matching active/unexpired room-media session,
     room identity, and ready asset in Supabase
  9. Return the selected private object key and safe metadata server-to-server

Cloudflare Worker
 10. Read the authorized range through the private R2 binding
 11. Stream 200/206 or return a precise fail-closed error through the rewrite
```

## Host And DNS Boundary

- Keep `watch.mistakestudios.com` directly on Vercel.
- Expose the gateway only as a same-origin path on that hostname.
- Configure the Worker origin as a server-side external-rewrite destination;
  never return it in client JSON or canonical state.
- Do not use a Worker Route on the app hostname: that requires Cloudflare-proxied
  DNS and expands the task into an application-edge migration.
- Do not reuse the disabled public R2 custom domain.

## Browser Credential

The bootstrap route should set a new cookie with these properties:

- dedicated name such as `__Secure-mw_media_access`;
- `Secure`, `HttpOnly`, and `SameSite=Strict`;
- no `Domain` attribute, so the cookie is host-only;
- `Path=/media-gateway/room-sessions/{sessionId}/content`, so simultaneous
  sessions do not collide;
- expiry no later than the room-media session expiry;
- signed versioned payload bound to `roomId`, `sessionId`, `memberId`, expiry,
  and a random token identifier;
- no account token, guest token, email, object key, or provider credential.

The cookie is a capability to request a fresh authorization decision, not proof
that access is still allowed. Vercel must verify the signature and current
database state for each range. Use constant-time secret/signature comparison.

The feasibility spike must prove that Vercel forwards this cookie and each Range
request to the Worker without exposing the upstream URL. If not, stop.
Query-string credentials are not an approved fallback.

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
- Store the external-rewrite Worker origin in a server/build-time variable that
  is never serialized into client responses.
- Declare required secret names in Worker configuration but never values.
- Use separate test and production Workers, R2 bindings, secrets, and hostnames.
- Pin Wrangler and commit the lockfile if implementation introduces it.
- No secret-setting or provider mutation is part of source implementation or
  test execution without explicit approval.

## Client Integration

- Keep `mw-uploaded-session:{sessionId}` as canonical realtime state.
- Change only the uploaded-session bootstrap transport so
  `resolveUploadedPlaybackUrl` receives the stable same-origin URL and cookie.
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
