---
id: TASK-023
status: blocked
type: compact-task
related: [MW-BUG-004, TASK-009]
created: 2026-09-01
updated: 2026-09-01
---

# Seamless Uploaded Playback URL Renewal

## Objective

Keep authorized uploaded media playing through short-lived R2 URL expiry without
refreshing the page, remounting the visible media element, resetting playback,
or exposing a permanent object URL.

## Confirmed Failure

- Room-upload playback currently resolves one presigned R2 URL when the source
  mounts.
- The room playback route issues that URL for 30 minutes and returns
  `expiresInSeconds`, but the client retains only `playbackUrl`.
- The browser can continue consuming bytes already in flight or buffered, while
  a later Range request or seek after expiry can receive an R2 `403`.
- The room-media session remains valid for 12 hours, so a still-authorized
  participant can obtain fresh object authorization without restarting the room
  source.
- Refreshing appears to recover playback because it resolves a new signature;
  requiring that refresh is the defect tracked by MW-BUG-004.

## Approved Experience

- Buffered media continues without interruption while authorization for future
  byte ranges is renewed.
- Forward playback and backward or forward seeks continue against the same
  visible media element and stable room source.
- Renewal produces no visible page refresh, player reload, time jump, duplicate
  audio, or room-state mutation.
- Genuine network loss may still buffer, but ordinary signature renewal must be
  invisible.

## Scope

- Introduce a stable, room-authorized playback address for an uploaded-media
  session.
- Preserve the current private R2 object and short-lived authorization model.
- Preserve browser Range requests so buffered, future, and previously unbuffered
  portions can be requested independently.
- Revalidate active participant, room, session, and ready-asset access at the
  existing server boundary.
- Prove the delivery behavior with accelerated expiry before selecting the
  production implementation.
- Keep renewal local to each participant and independent of canonical playback
  publication.

## Exclusions

- No permanent or public R2 URLs.
- No longer-lived URL as a substitute for renewal.
- No periodic replacement of `video.src` or visible media-element remount.
- No dual-player handoff, crossfade, duplicate download, or hidden second media
  element.
- No custom Media Source Extensions MP4 splicer.
- No HLS conversion requirement or CloudConvert pipeline expansion.
- No queue, SpacetimeDB reducer, canonical playback, room permission, schema, or
  uploaded-catalogue authorization change.
- No Vercel media-body proxy unless a separately reviewed cost and runtime
  boundary explicitly approves it.

## Decisions And Approach

### Candidate A: Stable Redirect Delivery

Use a stable application-owned room-session content URL as the media source.
For each request, validate the current room playback session and issue fresh,
short-lived R2 authorization for the requested resource. Keep redirect responses
private and non-cacheable.

This candidate is acceptable only if accelerated browser evidence proves Opera
GX and the supported Chromium path return to the stable endpoint for later Range
requests, including post-expiry seeks. Do not infer that behavior from an
initial successful redirect.

### Candidate B: Range Gateway Fallback

If Candidate A does not reliably re-enter the stable route, stop implementation
and prepare a separate architecture/security review for a Cloudflare Worker with
an R2 binding and stable room-playback authorization. The gateway must support
Range responses without sending media bodies through Vercel.

Candidate B is not implicitly approved by this compact task. It adds deployment,
authorization, cost, and operational boundaries and requires a scope revision
before implementation.

## Implementation Order

1. Install the repository dependencies and establish the current focused
   uploaded-playback and room-session baseline.
2. Add an accelerated-expiry browser fixture and observe a meaningful failing
   test: playback or a later seek fails once the first authorization expires.
3. Add route-level tests for authorized Range delivery and denial of missing,
   expired, ended, or unrelated room sessions.
4. Prototype Candidate A without changing production configuration.
5. Inspect the browser network sequence in Opera GX and supported Chromium:
   initial request, post-expiry continuation, backward seek, forward seek, and
   hidden-tab recovery.
6. If Candidate A passes, implement the smallest stable-route integration and
   keep the visible media source identity unchanged.
7. If Candidate A fails, record the evidence and stop before Candidate B.
8. Run focused, complete, static, build, private-delivery, and two-participant
   gates before release consideration.

## Testing Strategy

Classification: **test-first required**. This is a confirmed playback recovery
bug at a private authorization boundary.

The first red evidence must use an accelerated lease rather than waiting 30
minutes. It must fail because a later Range request cannot continue through
expiry, not because of an unrelated timer or fixture error.

Required automated coverage:

- uninterrupted playback across accelerated expiry;
- backward and forward seek after accelerated expiry;
- paused and hidden-tab expiry handling;
- one stable visible media element and no duplicate audio path;
- stale request cancellation after the room source changes;
- independent renewal for two participant clients;
- denial for missing membership, unrelated room, ended session, expired
  session, and non-ready asset;
- no permanent R2 URL in queue, room state, catalogue responses, or player
  contracts;
- no canonical playback or queue mutation caused by renewal.

Required regression gates:

- focused uploaded-media and room-session tests;
- complete `npm test`;
- TypeScript, ESLint, changed-file formatting, file-length policy, and
  production build;
- private catalogue and guest room-playback denial checks;
- normal YouTube, direct URL, and HLS playback remain unchanged.

## Acceptance Criteria

- An authorized participant plays uploaded media beyond accelerated expiry with
  no page refresh, media-element remount, duplicate audio, visible reload, or
  time reset.
- Forward playback remains continuous while already buffered bytes are used and
  later byte ranges receive fresh authorization.
- Seeking to an unbuffered future position or an earlier position after expiry
  succeeds without replacing the room source.
- Two participants remain synchronized while renewing independently.
- Refresh is no longer required to recover ordinary URL expiry.
- Short-lived R2 authorization remains in use; permanent object access remains
  unavailable.
- Unauthorized users and invalid room sessions cannot use the stable delivery
  path.
- Candidate A has explicit Opera GX and supported Chromium network evidence. If
  that evidence fails, the task stops for Candidate B planning rather than
  shipping a browser-dependent workaround.
- Production QA includes a real long-duration uploaded-media pass before
  MW-BUG-004 is resolved.

## Risks

- A browser may retain the redirected R2 target for later Range requests instead
  of revisiting the stable application route.
- Caching a redirect could retain an expired signature; all authorization and
  redirect responses must use the established private no-store boundary.
- Proxying media through Vercel would increase bandwidth cost and serverless
  runtime exposure.
- A renewal path could accidentally publish local recovery position as
  canonical room state.
- Hidden-tab timer throttling makes timer-only renewal insufficient; the stable
  request path must remain authoritative.
- A broad fallback could weaken uploaded-catalogue or room-participant privacy.

## Evidence At Handoff

- Current R2 playback default: `lib/media/r2.ts` uses a 30-minute GET signature.
- Room playback route:
  `app/api/media/room-sessions/[sessionId]/playback/route.ts` explicitly returns
  the 30-minute URL and `expiresInSeconds`.
- Current player: `components/room/direct-media-player.tsx` resolves the URL once,
  assigns it to the media element, discards expiry metadata, and reports a
  generic media-source error without renewal.
- Room-media sessions remain authorized for 12 hours in
  `lib/media/room-media-sessions.ts`.
- Existing intake item: MW-BUG-004.
- No production implementation, provider configuration, migration, Git commit,
  push, or deployment is included in this planning checkpoint.

## Candidate A Feasibility Evidence

Testing: **test-first red; implementation stopped**

- Baseline: `eeb456c`; the proposed stable content route and player integration
  were absent. The six approved documentation changes were already uncommitted.
- Harness: `scripts/verify-task023-redirect-candidate.mjs` serves one stable URL
  that returns a private no-store `307` to a Range-capable object with a
  1.2-second lease. Responses are bounded to 64 KiB so later byte requests cross
  the accelerated expiry boundary.
- Command: `node scripts/verify-task023-redirect-candidate.mjs`.
- Red result: exit `1`, reproduced twice in Playwright Chromium 149.0.7827.55
  and Opera GX 150.0.7871.187.
- Both browsers requested the stable URL once with `bytes=0-`, followed the
  redirect, and requested successive ranges directly from the redirected object.
  The first request after expiry was `bytes=524288-`; it received `403` with no
  second stable-route request. Both media elements then reported network error
  code `2`.
- Candidate verdict: **rejected**. Stable redirect delivery cannot provide
  reliable invisible renewal in the supported browser paths, even during
  ordinary sequential continuation before the explicit post-expiry seek.
- Stop boundary honored: no route-level production integration, player change,
  Vercel media proxy, signature extension, remount, second player, canonical
  playback mutation, provider configuration, migration, commit, push, or
  deployment was performed.
- Next decision: Candidate B requires a separately approved Cloudflare R2 Range
  gateway architecture/security task before implementation can continue.
