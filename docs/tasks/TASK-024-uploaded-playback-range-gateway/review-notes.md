# Review Notes: Authorized Uploaded Playback Range Gateway

Status: Replay QA passed and deployed; wider TASK-024 sign-off pending
Updated: 2026-09-05

## 2026-09-05: Final Replay Deployment And QA

The final source commit 9227d73584d8d47bdc740606d6d61fa772915c14 is deployed as
Vercel dpl_Fz4hYx1vnEWRwKDFsgiqck5ct3tH with unchanged Worker
461a7708-2d46-4a56-8533-9b91f2cdd316 at 100%. Candidate and public health and
readiness returned 200; unauthenticated gateway control returned 401. The
production hostname was read back to this exact deployment. This checkpoint
supersedes the restored state of earlier canaries. PR #11 remains draft and
unmerged. The prepared old-version rollback remains available.

Scoped replay QA PASSED in the real Opera profile with an independent in-app
guest, on the exact uploaded-media path:

- Play at completion restarted at the beginning; the initial replay converged
  at 20.21/20.05 seconds after the guest's normal first-play gesture.
- Midpoint seek loaded readyState 4, followed by end/back-20/Play. Both reached
  exactly 6333.233333 seconds and stopped, with no false autoplay prompt or
  media error. Canonical controls stopped at 105:33.
- Play after that natural completion replayed again (12.20/12.27 seconds).
- Guest reload caught up without a host action after its normal gesture:
  63.58/63.63 seconds. Pause plus backward seek converged at 56.161 seconds.
- The Opera source stayed unchanged, with one media element per participant.
  Final state was paused/readyState 4/error-free; temporary playback tabs closed.

The replay slice is complete. Full TASK-024 sign-off is still pending: true
background visibility/resume could not be established through the browser tool,
and a live post-revocation range denial remains unverified. A server-side probe
was attempted only against the QA room, but its configuration precondition
failed before an authorized range request: Vercel environment export supplies
[SENSITIVE] placeholders for secrets. No credentials were logged or rotated,
no database writes were made, and the QA room was not closed by that probe.
Automated authorization-denial/no-R2-read tests pass, but are not mislabeled as
live revocation evidence. The earlier 33.8-minute real Opera range check applies
to the unchanged gateway; no new 30-minute run is claimed for this player head.
The intake item remains in progress. No broader task closure or merge occurs.

## 2026-09-05: Replay Command Follow-Up Within Approved Scope

Commit 2a47932 was deployed as dpl_73PV8eqX8HrCvpVYhA6Xk28dTv8j with Worker
461a7708. Real Opera end/back-20/Play passed: host and guest reached the exact
6333.233333-second duration, both paused/ended without error or a false autoplay
prompt; canonical controls stopped at 105:33. The guest's initial genuine
interaction prompt was accepted normally. Direct Play at completion then
remained at the end. Production was restored using the prepared Vercel/Worker
rollback; health returned 200 and gateway control 404. This command correction
is inside the owner's approved end-of-file replay scope, not a new architecture.

Before command changes, node --test tests/spacetime/replay-command.test.mjs
failed 2/6 on baseline 2a47932 (exit 1): direct and HLS commands sent 120 instead
of zero. The tests execute the actual useLiveRoom hook and admission predicate.
The shared client command now maps Play at/after the completed native source's
position to zero. Earlier seeks, paused resume, YouTube behavior and admission/
playback-authority denials retain their behavior. No server reducer or schema
changes are needed. Focused tests pass 17/17; the complete suite passes 557/557,
with typecheck and lint passing (existing navigation warning only). Repeat
controlled Opera replay QA on the committed follow-up before release claims.

## 2026-09-05: Approved End-Of-File Replay Repair

Testing is test-first. Baseline 3fdfa3c was clean. The final ten initial
component tests ran against unchanged production source: 4 passed and 6 failed
(node --test tests/player/direct-media-replay.test.mjs, test process exit 1).
They reproduced false autoplay blocking on AbortError in Watch and Listen,
play() calls at the terminal position, a discarded host end event during sync,
and a stale end event publishing after rewind. A later eleventh test first
failed 0-versus-1 terminal publications before adding the end reconciliation.
The deterministic harness executes the actual component and sync code; only
React scheduling, browser media operations and room transport are substituted.
An initial harness promise-drain issue was corrected before recording red.

The fix uses precise native duration for local terminal sync, preserves valid
host end events during correction, ignores stale events after rewind, and lets
AbortError retry normally. A real NotAllowedError still requires interaction.
The timer also reconciles media.ended through the same host/queue guards if a
seek consumes the native event. No source reload, hidden player, delivery,
queue reducer, schema or authority redesign was introduced. Other play errors
retain existing handling. Direct/HLS native media share this path; YouTube is
unchanged. Native browser event ordering remains the required manual gate.

Green: 11/11 focused, 188/188 affected player/realtime, 551/551 full. Typecheck,
production build, formatting and diff checks pass. Lint has only the existing
room-experience navigation warning; file-length policy has zero violations and
18 existing threshold warnings (direct player now 624 lines). The final small
ref-update adjustment was followed by fresh full-suite/type/build checks.

Prepared rollback remains Vercel promote dpl_79vfekpDWSrzBr1mqivyYdUbAFL7 plus
Worker rollback 8637e61a-0d98-49ab-a217-af3252c969c3. Both restored versions were
read back before release. Reuse unchanged Worker 461a7708 for the controlled
candidate. Verify real Opera end/back/Play, natural completion/replay, pause,
seek and independent guest sync; retain the earlier 33-minute range evidence
as evidence for the unchanged gateway, not new-head browser evidence. No merge
or undraft is approved. Production QA is pending at this checkpoint.

## 2026-09-05: Final QA Result And Restoration

This final checkpoint supersedes the interim deployment state below. The exact
Git diff was reviewed after automatic approval review questioned owner-work
preservation: only this agent's 14-line runtime checkpoint and status were dirty;
tasks.md and the intake item were clean. Their historical content is preserved.

Passed: real Opera host and independent in-app guest reconnected in sync without
a host action (138.58/138.56 seconds). The original Opera source stayed unchanged
with one media element. A second session in the same Opera profile loaded and
sought independently; that temporary second room was closed normally.

Post-expiry evidence: at 32.5 minutes the buffer covered 0-356.797 and
3159.933333-4700.118. At 33.8 minutes a backward seek to 3157 added
3151.6-3159.36; both participants reached 3157 with readyState 4 and no media
error. A forward seek added the previously unbuffered 6326.6-6333.2 end segment,
again ready/error-free in both participants. Both bootstraps were older than
30 minutes. The original source was not refreshed or replaced.

Replay gate FAILED: seek-to-end, back and Play produced an Opera autoplay prompt
and stopped media at 6316.236 while the guest reached 6333.233333. Canonical UI
continued playing past duration; no media network error was reported. After
returning to mid-file, the visible autoplay prompt and Play recovered both
participants (3188.20/3188.24) without refresh, roughly 38 minutes into the run.
Do not equate this end-of-file observation with signed-URL expiry or claim its
cause/pre-existence is proven. No speculative player change was made.

Live revocation denial remains inconclusive: Opera blocked direct navigation to
the closed second room's old media path. Background/resume was not established.
The full release gate is NOT PASSED; PR #11 stays draft and unmerged and
MW-BUG-004 is not closed. The prepared rollback restored Vercel
dpl_79vfekpDWSrzBr1mqivyYdUbAFL7, then Worker
8637e61a-0d98-49ab-a217-af3252c969c3 at 100%. Health/readiness returned 200;
gateway control returned 404. Temporary playback tabs were closed.

Recommended next scope: reproduce end/back/resume with pending play and ended
events, then validate duration clamping and autoplay-error classification before
any player/queue repair. That implementation is outside this clock-only slice.

## 2026-09-05: Reconnect Candidate Runtime Checkpoint

Commit 1249b19 is pushed and deployed as Vercel
dpl_4sfsNqq2yXjvmbf9X99MzHhLKFdV, paired with the unchanged verified Worker
461a7708-2d46-4a56-8533-9b91f2cdd316 at 100%. Candidate and production
health/readiness pass; unauthenticated gateway access returns 401. Exact
production deployment and draft/unmerged PR head were read back.

Real Opera host plus an independent in-app browser guest now pass the formerly
failing guest reload: after accepting the autoplay prompt, the guest caught up
without a host action (138.58/138.56 seconds), with no media errors. The original
Opera source remained unchanged. Long-session/post-expiry ranges are still
under test; this checkpoint is not completion or permission to merge PR #11.

## 2026-09-05: Approved Reconnect Clock Repair

Baseline d105c8f, with only uncommitted report updates and the new tests present.
The production hook/snapshot/sync regression reproduced lost playback age:
100 seconds instead of 700 on a ten-minute-late join, and 100 instead of
548.54 on reconnect. The final eight-case red run passed 1/8 (exit 1), failing
for those behaviors, unrelated session updates, uncalibrated source exposure
and invalid/historical clock handling. Paused-state characterization passed.
Command: `node --test tests/spacetime/room-clock-reconnect.test.mjs`.

The repair reads fresh SDK Reducer event timestamps rather than a session row's
last playback-update time. Historical SubscribeApplied/Transaction events never
calibrate the clock. A new client waits for its fresh join-result sample before
publishing a source; reconnect keeps the previous valid clock until refreshed.
Existing join/heartbeat events supply samples. No new network call, dependency,
schema, provider setting, permission, media source or player remount is added.

Green: the same eight tests pass. Connection/player suites pass 177/177; full
suite 540/540. Typecheck and production build pass. BigInt construction uses the
existing compilation target. The test harness executes the real production
hook, snapshot adapter and sync math with simulated React scheduling and SDK
transport; it does not claim real browser or hosted SDK integration coverage.
The installed SDK 2.3.0 emits ReducerResult timestamps to row callbacks and
separates historical subscription events (verified in its source).

One-way clock samples include response transit delay; this bounded repair does
not add round-trip clock estimation. Hosted reconnect/late-join QA and the full
30-minute gateway run remain required before release acceptance. The existing
commit/push/deployment approval is used for this explicitly approved repair;
PR #11 stays draft and unmerged. Rollback uses the proven promotion of Vercel
dpl_79vfekpDWSrzBr1mqivyYdUbAFL7, followed by Worker version
8637e61a-0d98-49ab-a217-af3252c969c3.

## 2026-09-05: Failed Reconnect QA And Restoration

Initial Opera gateway load, unbuffered forward/back seeks, pause/resume and
synchronization passed. After guest reload and the autoplay gesture, the guest
remained about 448.54 seconds behind the uninterrupted host (1164.70/716.18,
then 1282.80/834.26 seconds). Both streams played without media errors. The
30-minute test stopped before completion; MW-BUG-004 is not verified fixed.

Vercel rollback returned 402 under its previous-deployment plan restriction.
The exact known-good dpl_79vfekpDWSrzBr1mqivyYdUbAFL7 was instead restored with
Vercel's documented promote command. Worker 8637e61a-0d98-49ab-a217-af3252c969c3
was then restored at 100%. Production health/readiness returned 200 and the
gateway control path returned 404. The baseline reconnect comparison was
inconclusive because restored direct-R2 playback showed a load error. Temporary
QA tabs were closed. PR #11 remains draft and unmerged; 7a8e592/d105c8f are pushed.

The initial final-report write and its retry timed out in automatic permission
review; no outdated interim report was committed. The owner subsequently
approved finishing this report and a separate test-first reconnect clock repair.
Source hypothesis: a stale session-update timestamp is incorrectly treated as
current server time on subscription insertion. Player and clock code are
unchanged from the former production source; isolate this before changing it.

## 2026-09-05: Deployment And Active Browser QA

- Commits 7a8e592 and d105c8f are pushed; PR #11 is open, draft and unmerged.
- Worker version 461a7708-2d46-4a56-8533-9b91f2cdd316 is deployed.
  The Worker-only fake-credential control reached Vercel and returned the
  expected upstream 404 before application activation. This confirms the
  receiver repair restores outbound I/O; no generic fetch exception occurred.
- Vercel dpl_4YAnBKKRaiy5fpuXEtqfdiJj71mB was built from d105c8f with
  domain promotion disabled, checked, then explicitly promoted under owner
  approval. The primary production hostname resolves to this Ready deployment.
- Candidate and production health/readiness returned 200. The active production
  gateway returned 401 without a cookie and 403 with a fake cookie.
- Real Opera profile QA uses a separate room and an existing 105-minute uploaded
  video. A separate in-app browser joined as a room-scoped guest. Both play;
  host pause synchronized exactly, and resumed snapshots differed by about
  0.02 seconds. Unbuffered forward/end/backward seeks succeeded without a media
  error. Opera retains the same same-origin gateway source and one video.
- The real elapsed-time test beyond the original 30-minute expiry boundary is
  still running. Do not interpret this checkpoint as completion or bug closure.
- Rollback remains Vercel dpl_79vfekpDWSrzBr1mqivyYdUbAFL7 first, then Worker
  8637e61a-0d98-49ab-a217-af3252c969c3. No R2 privacy, DNS, browser protection,
  secrets, database schema or realtime schema settings were changed.

## 2026-09-05: Approved Release Preparation

The owner approved commit, push, controlled deployment and subsequent QA, then
explicitly approved timeout/cache-header hardening as a separate test-first
commit. The established opaque uploaded-session reference is retained by owner
agreement; it remains an identifier rather than an access credential.

- Fetch repair committed and pushed as 7a8e592; PR #11 stays draft and unmerged.
- Hardening baseline: 7a8e592. Focused red: exit 1, 11/16 passed; object
  metadata overrode private caching in both native and Node tests, and stalled
  authorization headers/body and diagnostic health exceeded bounded deadlines.
- Guards: authorization signal expires after 5 seconds (including response-body
  consumption); diagnostic health after 2 seconds. Private response headers are
  reapplied after R2 metadata. No permission or media-source change.
- Focused green: 16/16. Full suite: 532/532. Typecheck, lint, build, Worker
  dry-run, formatting and file-length policy pass (existing warnings only).
  Timeout cases live in range-gateway-timeout.test.mjs to stay below file limits.
- The initial automatic approval review rejected these adjacent guards; the
  owner then explicitly approved both before any corresponding code mutation.
- Rollback targets reverified: Vercel dpl_79vfekpDWSrzBr1mqivyYdUbAFL7 and Worker
  8637e61a-0d98-49ab-a217-af3252c969c3 at 100%. Both must remain recoverable.
- Deployment sequence: Worker-only fake-credential check with application path
  inactive; build a pinned Vercel production candidate without domain promotion;
  verify candidate health/protection, then promote and run exact-path Opera QA.
  Any failed runtime/media gate restores Vercel first, then the Worker.
- Production playback and long-session QA are pending at this checkpoint.

## 2026-09-05: Native Fetch Receiver Repair (Local Only)

This checkpoint supersedes older claims below that the differential probe
proved a host-wide Worker-to-Vercel transport failure. Both authorization and
health used native fetch as a dependency-object method; workerd throws before
outbound I/O for that receiver. Historical canary observations and rollback
records are preserved. Cloud success is still unverified.

Owner-approved scope: correct the native fetch receiver, add native-runtime
regression coverage and a sanitized diagnostic category, and record evidence.
No architecture, origin, cookie, player, permission, or provider change.

- Baseline: `0364d105feca5af36a059bf12363254324ddd6da`; production fix absent.
  Three pre-existing dirty documents were reviewed and preserved; the intake
  item was not edited in this repair.
- Test-first command:
  `node --test tests/media/range-gateway-runtime.test.mjs tests/media/range-gateway.test.mjs`.
- Red: exit 1, 11/13 passed. The new native-runtime test returned 503 where
  authorized 206 was required. The diagnostic case returned `unknown` where
  `invalid_fetch_receiver` was required.
- Green: the same command exited 0, 13/13 passed after replacing raw fetch with
  a wrapper calling `globalThis.fetch` and adding the allowlisted category.
- Runtime: Miniflare `5.20260828.0-alpha`, workerd `1.20260828.1`, compatibility
  date `2026-09-01`. Reuses the existing pinned Worker dependency tree;
  prerequisite is `npm ci --prefix workers/uploaded-media-gateway`.
- The runtime test imports the production entrypoint unchanged, uses its default
  fetch dependency, and intercepts outbound I/O below the native fetch boundary.
  Synthetic storage verifies exact partial bytes/headers and zero reads after
  upstream 401/403; each request reauthorizes. No external calls or live R2.
  Existing Node coverage checks sanitized diagnostics without fixture leakage.
- Regression: `npm test` 529/529; typecheck, lint, build, Worker dry-run,
  changed-file Prettier, file-length policy, and diff check pass. Lint retains
  the existing navigation warning; file-length policy has 0 violations.
  Initial sandboxed typecheck/Worker dry-run hit filesystem restrictions;
  reruns with authorized worktree/cache access passed.
- QA gate: this local repair is verified; TASK-024 is not release-ready.
  No commit, push, PR mutation, deployment, or hosted configuration change.

Next gate: separately approve a credential-free isolated cloud runtime/egress
control with a fixed destination allowlist and prepared cleanup. Then review a
matched Worker/Vercel candidate and rollback before exact-path Opera GX playback
QA (former expiry boundary, seek, background/resume, two participants, stable
media element and no duplicate audio). Preview deployment protection must be
handled through an approved server-side access path.

Still outside this repair: explicit authorization timeout, private cache-header
precedence over object metadata, the handoff/canonical-session-reference
specification conflict, and existing live-only Kick versus durable revocation.
Do not close MW-BUG-004 or treat local tests as proof of production playback.

References: [Cloudflare receiver errors](https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors)
and [the matching workerd report](https://github.com/cloudflare/workerd/issues/6904).

## Evidence Dependency

This packet depends on the unmerged TASK-023 Candidate A evidence. TASK-023 must
be reviewed and checkpointed before implementation begins. The implementation
branch must then be created or refreshed from the resulting `origin/main`.

## Decisions Made

- Candidate A is rejected: later browser ranges do not revisit a stable redirect.
- Keep the app hostname directly on Vercel.
- Candidate B provisionally preferred a dedicated Worker Custom Domain over a
  Worker Route on the app host; its Opera GX production hostname gate failed.
- Candidate C retains the Worker but places a Vercel external rewrite in front
  so Opera sees only the existing app hostname. The owner approved this bounded
  revision on 2026-09-04.
- Keep Vercel/Supabase as the authorization authority and the Worker as the
  byte-serving boundary.
- Revalidate on every request; do not optimize with an authorization cache yet.
- Prefer one path-scoped media cookie per session so concurrent tabs can coexist.
- Keep the first design schema-free and use current room/session/member rows for
  revocation.
- Stop if browser credential delivery is unreliable; URL credentials are not an
  automatic fallback.
- Treat durable membership removal, room closure, and media-session end/expiry as
  gateway revocation. The existing live-only Kick behavior remains separate.

## Why A Full Packet Is Proportional

Although the user-facing fix is narrow, it introduces a new provider runtime,
external media proxy, private-object delivery path, per-range authorization hop,
and metered request flow. Separate design, security, test, release, and rollback
gates are necessary; the packet intentionally avoids unrelated product
documentation.

## Assumptions To Validate

- The Cloudflare account controls a zone suitable for the proposed custom domain.
- The existing R2 bucket can be bound privately to a Worker without enabling a
  public domain.
- A Vercel response on `watch.mistakestudios.com` can set a candidate domain and
  path-scoped cookie, but the supported Opera GX profile must first be able to
  reach that gateway hostname.
- Current `room_members`, `room_media_sessions`, and `media_assets` state is
  sufficient for per-request revocation without a new grant table.
- Browser request patterns can be supported with single-range R2 reads.

## Review Decisions And Open Questions

1. A neutral first-level hostname and the corresponding
   `Domain=mistakestudios.com` cookie scope were approved on 2026-09-02.
2. The Cloudflare Worker/custom-domain/R2 production test was approved for this
   personal deployment.
3. Confirm whether the preferred no-schema signed credential is acceptable after
   security review; a persisted opaque-grant table would be a separate scope
   revision.
4. Define acceptable per-range authorization latency and monthly request budget
   after the spike supplies real counts.

## Opera GX Hostname Evidence

- The original `media.watch.mistakestudios.com` certificate was recovered and
  reached `Active`; the Worker then returned the expected fail-closed HTTP 401.
- Opera GX blocked `media.watch.mistakestudios.com`,
  `playback.watch.mistakestudios.com`,
  `mw-gateway.watch.mistakestudios.com`, and
  `mw-playback.mistakestudios.com` with `ERR_BLOCKED_BY_CLIENT` before the
  Worker received a request.
- Public DNS, TLS, and the Worker 401 response passed for
  `mw-gateway.mistakestudios.com`, but the final Opera GX VPN test showed that
  the gateway-labelled hostname is also blocked. `watch.mistakestudios.com`
  passed as the same-session control.
- `mw.mistakestudios.com` was the final bounded minimal candidate. After public
  DNS and TLS activation, a complete Opera restart, and an active Opera VPN,
  both its root and exact gateway path returned `ERR_BLOCKED_BY_CLIENT`.
- `watch.mistakestudios.com` loaded normally in the same restarted Opera session,
  isolating the failure to the Worker custom-domain path rather than Opera or
  the VPN generally.
- Verdict: Candidate B is not releasable for the supported Opera GX profile.
  Further hostname guessing, blocker allowlisting, or privacy-setting changes
  require a separately approved design revision.

## Implementation Evidence

- Candidate B feasibility passed in Playwright Chromium 149.0.7827.55 and Opera
  GX 150.0.7871.187. Two session-path cookies remained isolated; every observed
  cross-origin media request carried its correct cookie and returned `206` from
  the unchanged stable URL.
- Test-first baseline `d718286`: seven credential, authorization, and Worker
  tests initially failed with the production gateway absent. The same tests now
  pass, including deny-before-R2 and bounded `416` behavior.
- The focused media set passes 12/12 and full `npm test` passes 524/524.
- TypeScript, the Next.js production build, Worker dry-run compilation,
  file-length policy, and ESLint pass. ESLint retains one unrelated existing
  `room-experience.tsx` navigation warning and reports no errors.
- The private Worker binding targets existing bucket `watch2bucket`; no public
  bucket domain or Vercel media-body proxy is introduced.
- No schema or RLS change is required. After the failed Opera gate, Cloudflare
  was rolled back to no Worker custom domains and the two Vercel production
  variables were restored to their previous values. No application merge or
  deployment occurred.
- Cloudflare certificate read-back shows only the zone's baseline Universal and
  Backup certificates; the failed gateway certificates were removed.
- Review found that Kick is not a durable membership mutation. The gateway does
  not claim otherwise; changing that room-lifecycle contract is deferred rather
  than folded into this playback fix.

## Candidate C Gate

- The existing provider rollback remains untouched during local implementation.
- The browser-visible route must be same-origin and the credential host-only.
- A preview must prove Vercel forwards Cookie and Range headers and preserves
  streamed media statuses before any production approval.
- The Worker upstream, secrets, and object identifiers must remain absent from
  browser JSON, canonical room state, and logs.

## Candidate C Local Evidence

- Baseline: clean `f81aa3f` on the dedicated TASK-024 branch; no Candidate C
  transport implementation was present.
- Test-first red: focused gateway tests failed 2/9 because bootstrap still
  required a cross-origin URL and `next.config.mjs` had no rewrite.
- Green: focused gateway/reference tests pass 13/13; the full suite passes
  525/525; typecheck and production build pass.
- The production build manifest contains the exact same-origin rewrite to the
  configured server-side Worker origin.
- Worker dry-run, file-length policy, targeted Prettier, and `git diff --check`
  pass. ESLint has zero errors and one unrelated existing navigation warning.
- The repository-wide format script reports 214 pre-existing formatting files;
  no unrelated formatting rewrite was performed.
- No commit, push, Worker deployment, Vercel deployment, environment mutation,
  DNS change, R2 change, merge, or production change was performed.
- Refreshed `origin/main` contains one TASK-023 merge commit not in this branch's
  ancestry, but its tree matches the branch's TASK-023 base. Reconcile that
  ancestry after commit approval and before refreshing the draft PR.

## Candidate C Canary Evidence

- Cloudflare Worker version `8637e61a-0d98-49ab-a217-af3252c969c3` deployed on
  the correct account with the private `watch2bucket` binding and existing
  origin-secret binding. Its exact route failed closed with `401`.
- Preview deployment `dpl_6KL6qdqXiLF81NfuYkmfeG8h7Vqs` proved the external
  rewrite preserved an ordinary Range request (`401` without a credential), an
  unsupported multi-range request (`416`), and a fake non-secret cookie (`503`
  after the Worker attempted upstream authorization). No persistent Preview
  variables were created.
- Because Opera GX could not use the protected Vercel preview hostname, the
  owner approved a rollback-ready production canary at exact branch commit
  `96d66ff899d32db68b1ab745cb4637179f041a9c`.
- Canary deployment `dpl_GhvNQkgHHaXJkdjFwAEwMEsjn8gy` passed health and
  readiness. The exact same-origin gateway path reached the Worker and failed
  closed when probed without a credential.
- In the normal Opera GX profile, a fresh uploaded-media session returned the
  same-origin gateway URL, but the video failed when Play was pressed and the UI
  reported that the browser could not load the source.
- A repeated canary with sanitized Worker tails initially left the exact cookie
  boundary unresolved. A subsequent preserved Opera DevTools capture proved
  that the `200` playback bootstrap set `__Secure-mw_media_access` without a
  browser warning and that Opera included it in the gateway request. The request
  reached the Cloudflare-backed Worker through Vercel and returned `503` with
  the Worker's 35-byte fail-closed authorization-unavailable response.
- Direct log reads of both the pinned canary deployment and the rollback
  deployment found no internal authorization callback. The current Worker
  deliberately normalizes fetch exceptions, non-authorization upstream errors,
  and malformed successful payloads to the same `503`, so the remaining boundary
  cannot be narrowed safely without sanitized Worker-side classification.
- The release gate therefore failed. Vercel was immediately rolled back to
  `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`. Both public aliases, health, readiness,
  and the prior gateway-path `404` were verified after rollback. R2 remained
  private, the Worker remained inert, and PR #11 remained draft and unmerged.
- Verdict: Candidate C is not release-ready. Add test-covered Worker diagnostics
  that record only `fetch_exception`, upstream status class, or
  `malformed_success`; never log request URLs, identifiers, cookies, secrets,
  object keys, or response bodies. Obtain separate approval before deploying
  that Worker revision or repeating the canary. Do not rotate secrets, rename
  paths, merge, or redeploy speculatively.
- Diagnostic test-first evidence at baseline `f97cf1f`: the focused test failed
  because the Worker emitted no classification, then passed after adding only
  `fetch_exception`, `upstream_status` with numeric status, and
  `malformed_success` diagnostics. The full suite passes 526/526; typecheck,
  production build, Worker dry-run, Prettier, file-length policy, and diff check
  pass. Lint has zero errors and the existing unrelated navigation warning.
- Diagnostic commit `fb87908` was pushed to draft PR #11. Worker version
  `9e84161a-88e7-413f-928f-5d8c7f6ce858` and the pinned Vercel canary reproduced
  the Opera failure and emitted `fetch_exception`, proving that no HTTP response
  returned from the Worker's outbound authorization request.
- Vercel was restored to `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7` and the Worker was
  restored to `8637e61a-0d98-49ab-a217-af3252c969c3`. Health and readiness
  returned `200`, the same-origin gateway route returned to `404`, and the
  diagnostic tail was stopped.
- Current Cloudflare documentation identifies several distinct runtime fetch
  exception families, so a compatibility change is not justified from the broad
  `fetch_exception` result alone. The next diagnostic may map only documented,
  allowlisted exception families; it must not log the raw exception.
- Classifier red/green evidence: the focused diagnostic test first failed because
  the fetch exception lacked a category, then passed after adding only fixed
  categories for the documented families plus `unknown`. A secret-bearing
  unknown message remains unreported. The full suite passes 526/526; typecheck,
  build, Worker dry-run, Prettier, file-length policy, lint, and diff checks pass.
  Lint retains the unrelated existing navigation warning.
- Classifier commit `4f6622a` was pushed to draft PR #11. Worker version
  `51607b57-9905-419c-85ba-17bb23c0f02f` reproduced the Opera failure and emitted
  only `{ kind: 'unknown', reason: 'fetch_exception' }`. A narrowly filtered
  Vercel log read-back again found no internal authorization callback.
- Vercel was restored to `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7` and the Worker to
  `8637e61a-0d98-49ab-a217-af3252c969c3`. Health and readiness returned `200`,
  the inactive gateway route returned `404`, and an Opera reload restored the
  ordinary synced player. No compatibility flag or speculative fix was applied.
- Differential-probe red/green evidence at clean baseline `ba7f47c`: the focused
  test failed because the Worker made only the authorization fetch (`1 !== 2`),
  then passed after adding one credential-free `/api/health` control fetch on
  that failure path. R2 remains unread and diagnostics contain only an HTTP
  status or sanitized category. The focused suite passes 11/11 and the full
  suite passes 527/527; typecheck, build, Worker dry-run, file-length, and lint
  gates pass. Lint retains the unrelated existing navigation warning.
- Differential commit `ed2c05f` was pushed to draft PR #11. Worker version
  `99284990-7e5c-4468-9755-7d4d64f3b210` reproduced the Opera failure and emitted
  `unknown` / `fetch_exception` for both the authorization request and the
  credential-free `/api/health` control. This isolates a host-wide Worker fetch
  routing failure before Vercel, rather than request method, body, or headers.
- Vercel and the Worker were restored to their prior versions; health/readiness
  returned `200`, the inactive gateway route returned `404`, and Opera restored
  the ordinary player. Cloudflare documents `global_fetch_strictly_public` as
  public-Internet routing for same-zone global fetches. Test it first with a
  Worker-only fake-credential probe; do not enable it in release configuration
  until that result is known.
- Flag test-first evidence at clean baseline `bf9275d`: the focused configuration
  test failed because no compatibility flag was present, then passed after
  adding exactly `global_fetch_strictly_public`. The focused suite passes 12/12
  and the full suite passes 528/528; typecheck, build, Worker dry-run, and lint
  pass. Lint retains the unrelated existing navigation warning.
- Flag commit `3403e54` was pushed to draft PR #11. Worker-only version
  `e230d302-a017-4d5f-a03d-782480e8738b` returned the same sanitized exception
  for authorization and `/api/health`, disproving the public-routing flag as a
  fix. The Worker was restored to `8637e61a-0d98-49ab-a217-af3252c969c3`;
  Vercel remained on `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`, and rollback health,
  readiness, and inactive-route checks passed.
- Origin test-first evidence at clean baseline `b15dc7e`: the focused test failed
  while Wrangler still targeted `watch.mistakestudios.com`, then passed after
  changing only `AUTHORIZATION_ORIGIN` to the public, stable
  `https://mistake-watch.vercel.app` project domain. The focused suite passes
  12/12 and full suite 528/528; typecheck, build, Worker dry-run, and lint pass.
  No provider state changed during implementation.
- Origin commit `0364d10` updated draft PR #11. Worker-only version
  `6cfc0ef3-ae01-4d73-9933-bcaf99202f8a` returned the same fail-closed `503`
  and emitted `unknown` / `fetch_exception` for both authorization and the
  credential-free public-health control. This rejects the stable Vercel project
  domain as a transport fix. The Worker was restored to `8637e61a`; Vercel
  remained on `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`. Health and readiness returned
  `200`, and the inactive same-origin gateway route returned `404`.

## Required Handoff Order

1. Review the Candidate C local diff and automated evidence.
2. Obtain separate approval before commit, push, or draft-PR refresh.
3. Obtain separate provider approval for a Worker upstream and Vercel preview.
4. Continue only if exact-path Opera GX Range QA passes.
5. Review the updated draft, unmerged PR after all preview gates pass.
6. Treat merge and production deployment as separate approvals.
