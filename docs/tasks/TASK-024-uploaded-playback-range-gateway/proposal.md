# Proposal: Authorized Uploaded Playback Range Gateway

Status: Candidate C locally complete; preview QA pending
Updated: 2026-09-04

## Problem

Uploaded playback currently resolves to an expiring R2 object URL. Browsers keep
using that resolved URL for later byte ranges instead of revisiting the
application redirect. Once the signature expires, a later seek or uncached read
can freeze playback.

TASK-023 produced cross-browser evidence that a stable redirect route does not
provide transparent renewal. The remaining bounded architecture is a stable
gateway that serves private R2 ranges while rechecking application authority.

## Goal

Allow an authorized room participant to play and seek uploaded media for the
life of an active room-media session without exposing a permanent object URL or
weakening current room access rules.

## User Value

- Long uploaded videos continue after the old signed-URL lifetime.
- Seeking after a long pause does not require a refresh or player remount.
- Durably removed participants and ended sessions lose access on the next
  request.
- The owner keeps a private R2 catalogue and current room authority model.

## Scope

- Expose uploaded playback through a same-origin app path and forward it to the
  Worker with an external rewrite.
- Bind the Worker to the existing private R2 bucket.
- Mint a dedicated, signed, path-scoped media credential only after the existing
  Vercel playback authorization succeeds.
- Add a Worker-only Vercel authorization route that revalidates the credential,
  participant, session, room, and ready asset on every media request.
- Stream supported R2 byte ranges with correct HTTP media headers.
- Replace only the uploaded-session transport URL resolved by
  `DirectMediaPlayer`; preserve its canonical uploaded-session reference.
- Add automated authorization/range tests and controlled Chromium plus Opera GX
  playback, seek, expiry, revocation, and synchronization QA.
- Add provider configuration only after local review and separate approval.

## Non-Goals

- No Worker in front of the main Vercel application hostname.
- No public R2 domain, permanent URL, or unauthenticated media delivery.
- No Vercel Function media-byte proxy, caching redesign, HLS conversion, DRM,
  or catalogue redesign. The Candidate C external rewrite/CDN hop is the only
  approved proxy exception.
- No longer-lived presigned URL, automatic player remount, hidden second player,
  or playback-state mutation.
- No Supabase schema or RLS change in the preferred design.
- No authorization cache or tolerated revocation delay in the first release.
- No production mutation, commit, push, merge, or deploy in this planning step.

## Recommended Approach

Candidate C keeps the existing Worker and private R2 binding, but the playback
route returns only
`/media-gateway/room-sessions/{sessionId}/content` on the current app origin.
Vercel externally rewrites that request to a separately configured Worker
upstream. The Worker still sends the opaque credential to the internal Vercel
authorization endpoint for every request and reads R2 only after approval.

The credential becomes host-only and is scoped to the same browser-visible
session path. This removes the broad cookie domain and prevents Opera from
navigating directly to the custom gateway hostname. Vercel remains policy
authority; the Worker remains the R2 byte-serving authority. Production remains
blocked until a preview proves Range forwarding, long responses, seeking,
revocation, and two-participant behavior in Opera GX.

## Major Risks And Mitigations

- **Cross-origin cookie behavior:** prove it in both supported browsers before
  production code; stop if unreliable.
- **Authorization bypass:** require both a signed participant/session credential
  and a separate Worker-origin secret; fail closed on every error.
- **Revocation lag:** requery current room/session/member state on every request;
  do not add an authorization cache in this task.
- **Live-only kick semantics:** the existing SpacetimeDB Kick action does not
  delete durable Supabase membership. TASK-024 preserves that established
  boundary; durable membership removal is the revocation event this gateway can
  enforce without expanding room lifecycle scope.
- **Range correctness:** test ordinary, open-ended, suffix, invalid, and
  unsatisfiable ranges plus seek and resume behavior.
- **Multiple tabs:** path-scope the credential to the session URL and test two
  concurrent sessions.
- **Cost amplification:** measure actual range counts; each range may incur one
  Vercel edge/proxy request, one Worker request, one Vercel authorization call,
  and one R2 Class B read.
- **Rewrite behavior:** prove Cookie and Range forwarding, `200`/`206`/`416`
  preservation, no shared caching, and response duration before release.
- **Secret leakage:** use provider secret stores, redact logs, and never serialize
  tokens or object keys into client or realtime state.
- **Operational coupling:** deploy and validate a non-production Worker and test
  bucket before any production binding or DNS change.

## Success Criteria

- The same stable app-origin URL serves initial load and later ranges after the
  old signed-URL expiry window.
- Seeking and resuming work in Chromium and Opera GX without changing the media
  element source or canonical playback state.
- Ended sessions, removed participants, invalid credentials, and unavailable
  assets fail closed before R2 is read.
- Two authorized participants remain synchronized while using independent
  gateway requests.
- Private object identifiers and all credentials remain server-side.
- Measured request volume and configured provider limits are acceptable before
  production release approval.
