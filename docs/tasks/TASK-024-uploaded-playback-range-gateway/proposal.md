# Proposal: Authorized Uploaded Playback Range Gateway

Status: Approved and implemented locally; release pending
Updated: 2026-09-02

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

- Add a dedicated Cloudflare Worker Custom Domain for uploaded playback only.
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
- Add provider configuration and release documentation only if implementation is
  separately approved and verified.

## Non-Goals

- No Worker in front of the main Vercel application hostname.
- No public R2 domain, permanent URL, or unauthenticated media delivery.
- No Vercel media-byte proxy, caching CDN redesign, HLS conversion, DRM, or
  catalogue redesign.
- No longer-lived presigned URL, automatic player remount, hidden second player,
  or playback-state mutation.
- No Supabase schema or RLS change in the preferred design.
- No authorization cache or tolerated revocation delay in the first release.
- No production mutation, commit, push, merge, or deploy in this planning step.

## Recommended Approach

Use `mw-gateway.mistakestudios.com` as a Worker Custom Domain. Opera GX blocked
the provisional nested and playback-labelled hostnames before requests reached
Cloudflare, while the neutral first-level hostname was accepted. The existing
Vercel playback route continues to establish participant authority, then sets a
new `__Secure-` media credential scoped to the session path and returns the
clean Worker URL. The Worker sends that opaque credential to an internal Vercel
authorization endpoint for every request. Only an allowed response returns the
private object key server-to-server. The Worker then reads the requested range
through its R2 binding and streams it to the browser.

The approved first-level hostname requires `Domain=mistakestudios.com`. This is
a broader cookie scope than the provisional child-host design, but the
credential remains Secure, HttpOnly, SameSite=Strict, session-path-scoped,
short-lived, signed, and revalidated on every request.

This leaves Vercel as the policy authority, avoids a broad DNS migration, and
keeps large response bodies off Vercel.

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
  Worker request, one Vercel authorization call, and one R2 Class B read.
- **Secret leakage:** use provider secret stores, redact logs, and never serialize
  tokens or object keys into client or realtime state.
- **Operational coupling:** deploy and validate a non-production Worker and test
  bucket before any production binding or DNS change.

## Success Criteria

- The same stable Worker URL serves initial load and later ranges after the old
  signed-URL expiry window.
- Seeking and resuming work in Chromium and Opera GX without changing the media
  element source or canonical playback state.
- Ended sessions, removed participants, invalid credentials, and unavailable
  assets fail closed before R2 is read.
- Two authorized participants remain synchronized while using independent
  gateway requests.
- Private object identifiers and all credentials remain server-side.
- Measured request volume and configured provider limits are acceptable before
  production release approval.
