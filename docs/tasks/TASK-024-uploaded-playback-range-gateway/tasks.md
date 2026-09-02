# Tasks: Authorized Uploaded Playback Range Gateway

Status: Tasks 1-5 complete locally; Task 6 failed at the Opera GX hostname gate
Updated: 2026-09-02

## Preconditions

- Merge or otherwise establish the reviewed TASK-023 evidence checkpoint first.
- Refresh this branch from the resulting `origin/main` before implementation.
- Review and explicitly approve this architecture and provider scope.
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

## Task 6: Non-Production End-To-End QA

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

## Task 7: Controlled Release And Rollback

The owner approved a controlled production deployment on 2026-09-01, subject to
the feasibility, automated, review, and exact-commit gates above.

Release order:

1. deploy the Worker version without switching production playback;
2. verify required secrets and private R2 binding by read-back;
3. deploy the pinned Vercel commit;
4. add/verify the dedicated media custom domain;
5. enable the app transport change with a bounded rollback path;
6. run owner plus guest production playback, seek, and revocation smoke tests;
7. monitor denial/error rate, latency, invocations, and R2 reads;
8. roll back the app transport if the gate fails; do not make the bucket public.

No commit, push, PR, merge, provider mutation, or deployment occurs without its
applicable approval.
