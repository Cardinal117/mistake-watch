# Tasks: Authorized Uploaded Playback Range Gateway

Status: Approved end-of-file replay repair; production restored
Updated: 2026-09-05

## Approved End-Of-File Replay Repair

The owner approved a separate test-first replay repair after the 33-minute
expiry and reconnect checks passed but end/back/Play failed. Baseline 3fdfa3c
is clean. Reproduce interrupted play promises, terminal sync corrections and
ended-event publication in the production direct player before changing it.
Preserve host authority, guest behavior, queue autoplay, source identity and
real autoplay denial prompts. Bound the change to direct-media replay and its
tests; no delivery, schema, privacy or player-remount redesign. Record red/green
evidence, run affected and full gates, then use the existing approved controlled
deployment/rollback procedure and real Opera owner plus guest QA. PR #11 stays
draft and unmerged. The final result in review-notes.md supersedes older
checkpoint text below.

## Current Checkpoint And Approved Reconnect Scope

The approved gateway repair passed local tests and initial Opera delivery but
failed guest-reload synchronization QA. Both providers are restored; health and
readiness are 200 and gateway routing is inactive (404). The 30-minute test is
incomplete. See [rollback evidence](review-notes.md#2026-09-05-failed-reconnect-qa-and-restoration).
PR #11 remains draft and unmerged. Existing commits are 7a8e592 and d105c8f.

The approved repair is locally complete (8/8 focused, 177/177 affected, 540/540 full).
See [test chronology](review-notes.md#2026-09-05-approved-reconnect-clock-repair).

The owner approved a separate test-first clock/reconnect repair and completion
of the rollback report. Reproduce elapsed-time loss on late join and reconnect
from stale playing snapshots before code changes. Preserve paused position,
fresh control updates, clock-skew handling and host authority. Use existing
clock signals if valid; do not derive clock skew from playback snapshot age.
Limit changes to clock adaptation/connection integration and meaningful tests.
No provider, schema, player-remount or delivery-architecture change is part of
this slice. Production stays restored during local verification; repeat the
full Opera release gate before claiming the original media defect resolved.

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
During a subsequent canary, preserved Opera DevTools evidence proved that the
bootstrap set `__Secure-mw_media_access` without a browser warning and that the
gateway request sent it. The request reached the Worker through Vercel and
returned the Worker's fail-closed `503` authorization-unavailable response. No
internal authorization callback appeared in either relevant Vercel deployment's
logs. The remaining boundary is the Worker's outbound authorization fetch or
its normalized upstream response. The canary was rolled back after the failed
interaction gate.

Test-first diagnostic evidence: on baseline `f97cf1f`, the focused test failed
because no safe authorization-failure classification was emitted. The Worker now
reports only `fetch_exception`, `upstream_status` with numeric status, or
`malformed_success`; the test proves that identifiers, credentials, and response
bodies are absent. The full 526-test suite and all local quality gates pass.

The approved diagnostic canary deployed Worker version
`9e84161a-88e7-413f-928f-5d8c7f6ce858` and reproduced the failure in Opera. The
sanitized outcome was `fetch_exception`, so the Worker received no HTTP response
from its Vercel authorization request. Vercel and the Worker were immediately
restored to their prior versions, and the public health/rollback checks passed.

The next diagnostic classifier is complete locally with test-first evidence. It
maps only allowlisted Cloudflare fetch families to fixed categories, defaults to
`unknown`, and never logs the raw exception. The focused test and full 526-test
suite pass, together with typecheck, build, Worker dry-run, formatting,
file-length, lint, and diff checks. It remains uncommitted and undeployed pending
the exact Git checkpoint approval.

Commit `4f6622a` was pushed to draft PR #11 and used for the approved classifier
canary. Worker version `51607b57-9905-419c-85ba-17bb23c0f02f` reproduced the
Opera failure and classified it as `unknown` / `fetch_exception`; Vercel again
recorded no internal authorization callback. Both providers were restored to
their prior versions, health/readiness and the inactive gateway route passed,
and the ordinary Opera player returned after reload. The next experiment must
be a separately reviewed differential probe, not a guessed compatibility flag.

The bounded differential probe is now complete locally with test-first evidence
at baseline `ba7f47c`. It runs one credential-free `/api/health` control fetch
only after the authorization fetch throws, records only its numeric status or a
sanitized exception category, preserves the same fail-closed `503`, and performs
no R2 read. The focused suite passes 11/11 and the full suite passes 527/527;
typecheck, build, Worker dry-run, file-length, and lint gates pass.

Commit `ed2c05f` was pushed to draft PR #11 and used for the approved differential
canary. Worker version `99284990-7e5c-4468-9755-7d4d64f3b210` classified both the
authorization request and credential-free `/api/health` control as `unknown` /
`fetch_exception`. This proves a host-wide Worker-to-Vercel fetch-routing failure
before Vercel receives either request. Both providers were restored and all
rollback checks passed. The next gate is a Worker-only
`global_fetch_strictly_public` canary against restored Vercel with a fake
credential, before any further Opera or Vercel canary.

The flag candidate is complete locally with test-first evidence at baseline
`bf9275d`. The focused test failed while Wrangler had no compatibility flag and
passed after adding only `global_fetch_strictly_public`. The focused suite passes
12/12 and the full suite passes 528/528; typecheck, build, Worker dry-run, and
lint pass. No provider state changed during implementation.

Commit `3403e54` was pushed and tested as Worker-only version
`e230d302-a017-4d5f-a03d-782480e8738b`. Both authorization and `/api/health`
still produced `unknown` / `fetch_exception`, so
`global_fetch_strictly_public` is rejected. The Worker was restored, Vercel was
never promoted, and all rollback checks passed. Remove the flag before review;
the next candidate is a Worker-only fetch to the stable `vercel.app` project
domain with a fake credential.

The Vercel-origin candidate is complete locally with test-first evidence at
baseline `b15dc7e`. The focused test failed while the Worker targeted the custom
domain and passed after changing only `AUTHORIZATION_ORIGIN` to
`https://mistake-watch.vercel.app`. The focused suite passes 12/12 and full suite
528/528; typecheck, build, Worker dry-run, and lint pass. The origin's public
health route returns `200`; provider state remained unchanged.

Commit `0364d10` updated draft PR #11 and Worker-only version
`6cfc0ef3-ae01-4d73-9933-bcaf99202f8a` tested the stable Vercel project origin.
The fake-credential request failed closed with `503`, while both authorization
and the public-health control again emitted `unknown` / `fetch_exception`. This
rejects the alternate origin as a fix. The Worker was restored to `8637e61a`;
Vercel remained on `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`; health, readiness, and
the inactive gateway checks passed. Do not run another Opera canary until a
reviewed scope revision addresses the broader Worker-to-Vercel transport issue.

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
not be merged or redeployed until test-covered, sanitized Worker diagnostics
distinguish an authorization fetch exception, upstream status class, or malformed
success response and the resulting defect is corrected.

No commit, push, PR, merge, provider mutation, or deployment occurs without its
applicable approval.
