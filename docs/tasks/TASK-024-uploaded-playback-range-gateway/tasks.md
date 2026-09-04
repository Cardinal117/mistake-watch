# Tasks: Authorized Uploaded Playback Range Gateway

Status: Tasks 1-6A complete locally; Candidate C Opera canary failed and rolled back
Updated: 2026-09-04

## Preconditions

- Merge or otherwise establish the reviewed TASK-023 evidence checkpoint first.
- Refresh this branch from the resulting `origin/main` before implementation.
- Review and explicitly approve this architecture and provider scope.
- Candidate C same-origin rewrite scope was approved by the owner on 2026-09-04.
- Confirm a dedicated Cloudflare test Worker, test hostname, and non-production
  R2 object can be used without touching production.

## Task 1: Browser Credential And Range Feasibility Spike

Build an isolated non-production harness before editing application behavior.

- Set a path-scoped dedicated media cookie from the app origin.
- Load a stable test Worker URL in a real media element.
- Record sanitized request method, range shape, cookie-present boolean, response
  status, and timing only.
- Exercise initial load, playback, seek forward/back, pause/resume, replay, and
  two concurrent session paths.
- Run supported Chromium and Opera GX normal profiles; add private-profile
  evidence if privacy settings affect the result.

Review gate:

- Continue only if every later media request reliably reaches the stable Worker
  URL and carries the correct session-scoped credential.
- If the cookie or stable-path contract fails, record evidence and stop. Do not
  implement a token-in-URL fallback.

## Task 2: Establish Test-First Red Evidence

On the refreshed approved implementation branch, add the smallest meaningful
tests before production changes:

- Vercel bootstrap contract returns a stable gateway URL and scoped credential,
  not a presigned object URL.
- Internal authorization denies invalid origin secret, invalid/expired media
  credential, inactive member, wrong room/session, ended/expired session,
  unavailable asset, and missing object key.
- Worker range contract covers full, open-ended, bounded, suffix,
  unsatisfiable, invalid, and unsupported multi-range requests.
- Worker never reads R2 when authorization is denied.
- Credential and object-key fields do not enter client/realtime payloads or
  sanitized logs.

Record baseline revision, command, test identifiers, intended assertion failures,
and exit status. Syntax, fixture, or unavailable-provider failures are not valid
red evidence.

## Task 3: Vercel Credential And Authorization Boundary

Suggested areas:

- `app/api/media/room-sessions/[sessionId]/playback/route.ts`
- a new server-only internal media authorization route
- `lib/media/room-media-sessions.ts`
- a small server-only media credential helper
- focused route/security tests

Implement the scoped media cookie, stable URL response, origin-secret check,
credential validation, and current-state authorization. Reuse existing policy and
query helpers without weakening current account/guest behavior. Do not add a
schema migration unless a separate reviewed revision proves it necessary.

Review gate: all Vercel authorization tests green; no browser-readable object key,
account token, guest token, or service-role credential.

## Task 4: Private R2 Range Worker

Suggested area: `workers/uploaded-media-gateway/` with its own source, tests, and
Wrangler configuration.

- Add typed R2 and required-secret bindings.
- Parse only the approved request forms.
- Call Vercel authorization before every R2 operation.
- Use the returned object key only in Worker memory for that request.
- Stream correct full/range responses and fail closed.
- Add timeouts and sanitized outcome telemetry.
- Keep test and production environments distinct.

Review gate: Worker unit/integration tests green under the local Worker runtime;
denied requests prove zero R2 reads.

## Task 5: Client Transport Integration

Update uploaded-session playback resolution only.

- Set the returned stable URL once on the existing media element.
- Preserve the canonical uploaded-session reference and playback state.
- Keep existing direct/HLS/YouTube behavior unchanged.
- Confirm error messages distinguish authorization denial from transient gateway
  failure without exposing internals.

Review gate: focused player tests green and the media source is not replaced
during simulated later ranges.

## Task 6A: Same-Origin Rewrite Revision

- Add test-first coverage for a host-only credential and browser-visible
  `/media-gateway/room-sessions/{sessionId}/content` URL.
- Add a narrowly configured external rewrite to the Worker upstream.
- Keep the upstream URL out of client JSON and require HTTPS in production.
- Prove the production build includes the expected rewrite without changing
  provider state.

Review gate: focused tests, typecheck, lint, build, Worker check, formatting,
file-length policy, and diff checks pass. Provider mutation remains separately
approved.

## Task 6B: Non-Production End-To-End QA

Use a test Worker hostname, test R2 object, and Vercel preview/staging authority.

- Chromium and Opera GX: load, play beyond accelerated legacy expiry, seek,
  pause/resume, replay, refresh, and recover from a network interruption.
- Two participants: shared source and playback convergence while both issue
  independent ranges.
- Revocation: remove a participant and end a session; the next unbuffered request
  must be denied before R2 is read.
- Multiple tabs: two session paths must not overwrite credentials.
- Security: inspect browser network, Worker logs, Vercel logs, and realtime state
  for leaked credentials or object keys.
- Operations: record authorization latency, range counts, R2 reads, and estimated
  provider cost.

Review gate: use `qa-release-gate`; obtain independent code/security review and
explicit production approval. Automated tests and GitHub mergeability do not
replace this interaction QA.

2026-09-04 evidence: the protected Vercel preview preserved ordinary and
unsupported Range requests, and a fake non-secret cookie changed the Worker
response from missing-credential `401` to authorization-upstream `503`, proving
the external rewrite forwards both headers. Opera GX could not use the protected
preview hostname, so the owner approved a rollback-ready production canary.
The real uploaded-media attempt created a fresh session and resolved to the
same-origin gateway path, but the media element failed when Play was pressed.
During a repeated canary, sanitized Worker tails proved that this Opera request
reached the Worker with a Range header and a generic Cookie header, while the
exact `__Secure-mw_media_access` cookie did not match and no internal Worker
authorization callback appeared. The remaining boundary is therefore the
browser's storage or transmission of the media-access cookie. The canary was
rolled back after the failed interaction gate.

## Task 7: Controlled Release And Rollback

The owner approved a controlled production deployment on 2026-09-01, subject to
the feasibility, automated, review, and exact-commit gates above.

Release order:

1. deploy the Worker version without switching production playback;
2. verify required secrets and private R2 binding by read-back;
3. deploy the pinned Vercel commit;
4. configure and verify the same-origin external rewrite to the Worker upstream;
5. enable the app transport change with a bounded rollback path;
6. run owner plus guest production playback, seek, and revocation smoke tests;
7. monitor denial/error rate, latency, invocations, and R2 reads;
8. roll back the app transport if the gate fails; do not make the bucket public.

The first Candidate C canary used Vercel deployment
`dpl_GhvNQkgHHaXJkdjFwAEwMEsjn8gy` and failed the Opera media gate. Production
was restored to `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`; health and readiness passed,
and the gateway path returned to the prior `404`. PR #11 remains draft and must
not be merged or redeployed until Opera DevTools confirms whether the playback
bootstrap emits the media `Set-Cookie` header and why Opera does not return that
cookie to the gateway route.

No commit, push, PR, merge, provider mutation, or deployment occurs without its
applicable approval.
