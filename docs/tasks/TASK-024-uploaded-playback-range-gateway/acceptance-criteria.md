# Acceptance Criteria: Authorized Uploaded Playback Range Gateway

Status: Complete and deployed; owner approved PR #11 integration
Updated: 2026-09-05

Required implementation and QA gates are complete. Results and bounded evidence
limitations are in [the closure checkpoint](review-notes.md#2026-09-05-final-review-and-task-closure).
The owner explicitly approved PR #11 integration after this QA checkpoint.
The owner approved retaining the established opaque uploaded-media session
reference in canonical state. This narrow identifier exception does not permit
media credentials, secrets or object addresses in room state.

## Feasibility Gate

- Opera GX sends the dedicated host-only session credential and Range header to
  the stable app-origin URL, and the external rewrite preserves both upstream.
- Initial load, seek, resume, replay, and two concurrent session paths use the
  expected request forms.
- If this gate fails, implementation stops without using a long-lived URL token,
  public object URL, player remount, or canonical playback mutation.

## Functional Requirements

- Authorized uploaded media loads through one stable same-origin gateway URL.
- Later byte ranges still succeed after the former presigned-URL expiry window.
- Forward/back seeking and pause/resume do not replace the media source.
- A refresh obtains a new scoped credential through current room authority.
- Two authorized participants can play the same session and remain synchronized.
- Multiple session tabs do not overwrite each other's media credentials.

## Authorization And Security Requirements

- Vercel revalidates the current participant, room, active/unexpired media
  session, ready asset, and object selection before every R2 request.
- The Worker rejects requests without both a valid media credential and valid
  Worker-origin authentication.
- Durably removed participants and ended/expired/mismatched sessions are denied
  on the next unbuffered request, before any R2 read.
- R2 remains private and no public fallback is configured.
- Media credentials are host-only, `Secure`, `HttpOnly`, `SameSite=Strict`,
  session-path scoped, expire no later than the media session, and contain no
  account/guest token or object key.
- Provider credentials, origin secrets, media credentials, object keys, room and
  participant identifiers do not appear in client JSON, canonical state,
  analytics, browser console, or ordinary provider/application logs.
- The Supabase service-role credential remains server-only; no new exposed table,
  permissive RLS policy, or client authorization decision is introduced.

## HTTP And Storage Requirements

- Allowed full requests return correct `200` metadata and stream the body.
- Allowed single ranges return `206` with correct `Accept-Ranges`,
  `Content-Range`, `Content-Length`, `Content-Type`, and `ETag`.
- Unsatisfiable ranges return `416` with the correct total-size header.
- Invalid or unsupported multi-ranges fail explicitly and never broaden to the
  full object.
- Denied authorization performs zero R2 reads.
- The Worker streams R2 bodies without buffering the full object.
- Private responses are not stored by shared caches.

## Reliability And Performance Requirements

- Worker-to-Vercel timeouts and provider errors fail closed with bounded errors.
- Browser retries do not create an authorization bypass or corrupt range output.
- The rewrite preserves `200`, `206`, `416`, `Range`, `Content-Range`, and
  private no-store behavior without exposing the Worker origin.
- Representative playback records range count, authorization latency, Worker
  failures, and R2 reads without sensitive identifiers.
- Estimated Cloudflare, R2, and Vercel usage is reviewed against current limits
  and alert/rollback thresholds before production approval.
- No authorization cache or revocation delay is introduced in the first release.
- Live-only SpacetimeDB Kick remains an existing room-lifecycle boundary and is
  not misrepresented as durable Supabase membership revocation.

## Verification Requirements

- Required behavior has genuine test-first red evidence on the approved baseline.
- The same focused tests pass after implementation.
- Affected tests, full test suite, typecheck, lint, build, Prettier,
  file-length policy, and `git diff --check` pass.
- Worker tests run in the supported local Worker runtime with mocked and test-R2
  integration coverage at the appropriate layers.
- Non-production Chromium and Opera GX QA passes, including accelerated expiry,
  seek, revocation, multiple tabs, and two-participant synchronization.
- Independent security/code review and `qa-release-gate` pass before any merge or
  production approval.

## Must Not Break

- Host-authoritative canonical playback and room synchronization.
- Existing account and guest room authorization.
- Direct URL, HLS, and YouTube playback.
- Uploaded catalogue privacy, upload, processing, poster, and deletion flows.
- TASK-009's disabled public R2 domain.
- Current player controls, autoplay-blocked recovery, error reporting, and room
  session expiry.
- Vercel health/readiness and deployment flow.
