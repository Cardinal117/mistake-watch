# Integration QA — 2026-09-05

## Accepted release - 2026-09-05

Owner physical Huawei Y9 Prime QA passed: "This is perfect, I will pass QA, it all works as requested." The owner explicitly approved documentation, atomic commits, push/PR merge to main and final production deployment. This supersedes the temporary-window restoration requirement: retain the accepted candidate while completing Git integration. Earlier limitations and deployment states below are chronological evidence, not the current release status.

Accepted application tree: `0fb144fd9569146eb808f477180c5835249508cc`; Vercel `dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG`. The additive prepared-YouTube backend is deployed. See [release summary](release.md) and [bug reconciliation](bug-reconciliation.md). Merged through [PR #12](https://github.com/Cardinal117/mistake-watch/pull/12), merge 662597a1bda7ec458017303644874353d672d462. Final production/frontend/backend identities are verified in release.md.

## Candidate and authority

Branch `codex/task-026-watch-redesign`, integrated with main `f84a775ec348e260dbb9ca005fa55d47a80373f0` (PR #11). Retained pre-integration stash `47faef4eed6f45c286bebb190dd524e94ca57261`. Original checkout's unfinished Media Session/performance work and TASK-025 proposals are excluded. No Worker, database schema, R2 lifetime or server permission rule is changed.

The owner authorized real local testing, supplied a YouTube playlist, allowed any catalogue video for QA, and then explicitly authorized temporary production deployment followed by restoration when QA is done. This temporary deployment is not final release acceptance.

Restoration target verified before deployment: `dpl_1hQwBD9otKqAL4ouYrb4irogFShy`, `https://mistake-watch-6bk8jo0xj-cardinal117s-projects.vercel.app`. Recheck domain ownership immediately before promotion. Restore this deployment after the temporary production checks and verify the public domain afterward.

## Local real-backend evidence

The app at `http://127.0.0.1:5381` uses existing local credentials, real Supabase durable room/membership operations and a local SpacetimeDB service on port 5372. Both readiness checks passed. Vercel protects production secrets from export; the private R2 gateway must therefore be checked on a protected HTTPS deployment. Test browser identities and invite URLs are stored only in Git-ignored temporary files.

Two independent browser contexts used a disposable room and normal create/join/add/control UI. No design fixture controller or mocked network was used in these room checks. The short direct video is a local test asset; these checks prove room control/sync, not private R2 delivery.

- Room creation, separate guest invite and two-way presence passed.
- Host rename propagated to the guest; guest rename and transport controls were disabled.
- Direct-video host play/pause, fullscreen +30/-10 seek, local volume, player element continuity and guest reload recovery passed. Sampled local playback difference was 2–5 ms; this is a sample, not a general network latency guarantee.
- Watch → Listen → Watch propagated room-wide and preserved the playback position.
- Guest adding reached the host queue. The supplied Replay Mix playlist resolved through the real YouTube API with 250 playable entries and all entries reached both participants.
- Reordering propagated to the guest. After the fixes below, live playback and queue grant/revoke checks passed.
- The 251-item queue's last row remained reachable without horizontal overflow at 390×844, 667×375 and 320×568. These are emulated viewports, not physical-phone certification.
- Headless local YouTube playback did not establish sustained playback: the provider frame was initially paused, then the room advanced after a failure. Metadata/import success is not playback proof. Verify the actual provider in the signed-in production browser during temporary QA.

## Integration fixes and regression chronology

1. Watch elapsed time exposed fractional values such as `0:22.371000000000002`. Browser regression first reproduced the exact output, then passed after the Watch presentation formatter normalized whole seconds. The seek command retains its original precision.
2. A queue collaborator without playback permission saw an enabled Play now action that the existing backend client guard ignored. Browser regression reproduced enabled versus expected disabled, then passed after the Watch workspace omitted unavailable playback commands and both current/history queue rows preserved that signal. Queue management authority is unchanged.
3. The shared participant display OR-ed a saved queue grant with a live denial. A focused test of the actual snapshot adapter reproduced the stale enabled toggle; the live permission row now takes precedence, with saved fallback used only while that row is absent. Host authority remains explicit. Both adapter tests and the real grant/revoke flow passed. No reducer/RLS policy changed.

The queue-row design hook flagged existing 13px/11px typography untouched by the permission edit. These are inherited compact queue styling, not new visual changes; no typography change or suppression was added.

## Gates

- Full Node suite after integration fixes: 576 passed, 0 failed.
- Typecheck passed. Lint: 0 errors, 1 unchanged `room-experience.tsx` navigation warning.
- Full Watch browser rerun: 53 passed, 0 failed (2.2 minutes). Production webpack build passed. File-length policy and diff whitespace checks passed. Exact candidate upload review remains before promotion.
- Long R2 playback/seek after 30 minutes, actual YouTube playback, production two-participant sync, physical-phone fullscreen/rotation and deployment restoration: pending temporary production QA.

An intermittent 667×375 fixture-startup timeout showed only the fixture loading message, before layout assertions. A subsequent isolated run passed in 2.4 seconds with no UI change. The complete suite is being rerun; do not count skipped or failed runs as passes.

## Temporary production QA in progress

Immutable candidate tree: `4435f7d5ea8c477a5c8c4efc1b4351444bd4ca0b`. Export upload audit: 1,050 files, every file belongs to the reviewed tree, no environment/temporary/dependency credentials included. No commit or push yet.

Candidate deployment `dpl_6teAx9nqNNNotZC6VMkzoCSYMRMf` / `https://mistake-watch-nxetn7ygr-cardinal117s-projects.vercel.app` was promoted for the explicitly authorized temporary QA window. The public domain was read back to this exact deployment; health and readiness returned 200, and the development design route returned 404. **Restore the prior deployment recorded above when QA finishes.**

**RESTORED:** after the temporary checks, Vercel rollback succeeded and a fresh inspect of `https://watch.mistakestudios.com` resolved to `dpl_1hQwBD9otKqAL4ouYrb4irogFShy`, status Ready. Public `/api/health` returned 200 with `ok:true`. The redesign and subsequent phone fixes are not the final production release.

Endurance result: the same host video played continuously from approximately 16:53 UTC through 17:24 UTC. Before seeking its media clock was 1,899 seconds and buffered only through 1,918 seconds. A timeline click after the boundary fetched a new unbuffered range starting at 3,168 seconds. Both host and guest subsequently played around 3,192 seconds, readyState 4, paused false, no media error. Samples differed by approximately 47ms (sequential observations, not a latency guarantee). Host pause then settled at 3,208 seconds. Production desktop fullscreen was attempted but the automation did not establish `document.fullscreenElement`; do not count that attempt as a pass. Local browser fullscreen tests passed separately.

Long private catalogue video started at approximately **2026-09-05 16:53:00 UTC** (18:53 local). Duration 6,333 seconds, real `<video>` readyState 4, playing, no media error, actual source uses the same-origin `/media-gateway/` route. The host browser is Opera; a separate guest is joining through the in-app browser. Do not reload the host before the post-30-minute seek check. The required expiry-boundary check is due after **17:24 UTC**.

The owner has been asked to exercise physical-phone fullscreen/rotation and Queue/Add/More clipping during this window. Await their actual device evidence; no device result has been received yet.

## Physical-phone findings and local follow-up (not in the temporary deployment)

Owner reported Huawei Y9 Prime playback, pause and seeking initially very responsive. Found document overscroll exposing black space and moving the bottom navigation through the floating player, awkward landscape, and occasional roughly ten-second YouTube dock pause/play delay or repeated playback position while panels loaded. Browser/version requested. These findings block final release.

- Rotation regression reproduced hidden phone navigation at 844×390. The local shell now retains compact navigation through phone landscape, uses viewport height with a 100vh fallback, and contains document/inner-panel overscroll. The final focused test passes across rotation and navigation wheel gestures. The exact physical-browser overscroll still requires device retest; ordinary Chromium did not reproduce its rubber-band behavior.
- A provider fixture using the actual YouTube player component reproduced a seek remaining at 0 rather than 25 seconds while unrelated snapshots arrived every 100ms. The periodic correction effect restarted on every canonical snapshot. It now retains its timer and reads the latest committed canonical ref. The same test passes at 25 seconds during updates. This proves the timer starvation fix, not yet the entire physical-phone pause-delay report.
- Both focused browser checks passed (9.8 seconds); typecheck and targeted lint passed. Full Watch regression rerun is in progress.
- Design hook palette/typography findings are inherited values untouched by this geometry-only edit: black video canvas/scrims, existing compact labels and player-number labels. No new color/font values or suppression were added.
- Production Opera resolved the supplied 250-item playlist, imported two selected entries, played The Mad King and advanced to Maestro. Pause settled in the shell at 0:11. This confirms actual production provider playback; mini-player latency remains under review.

Final local phone follow-up evidence:

- The 55-test Watch run passed 54 tests and identified one landscape direct-player height regression. That was corrected; the affected 20 navigation/sync tests then passed. Visual inspection identified transport below the landscape fold, which an added viewport assertion reproduced with intersection ratio 0. Compact landscape chrome corrected this; the final 20 navigation/rotation/provider-continuity tests passed in 55.2 seconds. The provider remains at least 200px and the transport is visible alongside it.
- Shared player and YouTube Node suites: 133 passed, zero failures. Typecheck and targeted lint passed. The YouTube timer test passed under continuous unrelated snapshot updates.
- Production build compiled and passed TypeScript but first failed during 11-worker prerendering with a Windows process out-of-memory error. Retrying unchanged source with installed Next's `CIRCLE_NODE_TOTAL=3` environment setting used two workers and passed; no build configuration or dependency change was made. The final rebuild after the last landscape CSS adjustment also passed.
- Local portrait/landscape screenshots inspected at 390×844 and 844×390. Shell top remained 0 and navigation bottom matched viewport height after outer scroll attempts. The original Huawei browser's exact overscroll behavior still needs a physical retest.
- After the endurance seek and pause, the reloaded guest restored canonical time 3,208.015 seconds, paused, readyState 4, without a media error.

Release remains held for the corrected-build physical-phone scroll/fullscreen/rotation and mini-player responsiveness check. No final merge, commit, push or release has been performed. The previously staged Git tree is the temporary QA candidate, not the newer unstaged phone fixes.

## Second temporary production QA window

Owner explicitly approved proceeding with the corrected-build phone QA round, restoration afterward, then release only after acceptance. Main was refreshed and remains `f84a775ec348e260dbb9ca005fa55d47a80373f0`. The current public domain was verified again as `dpl_1hQwBD9otKqAL4ouYrb4irogFShy` (Ready); this remains the exact restoration target.

Candidate adds only the reviewed Watch viewport/landscape fixes, persistent YouTube correction timer, their focused regressions and task evidence to the first QA snapshot. The final local production build, 20 affected browser tests, timer regression, 133 player/YouTube tests, lint/typecheck and file policy have passed. No source changed since those checks. Export the staged tree for an immutable upload; preserve the first export. No database, Worker, credentials, reducer or production lifetime changes.

Second candidate exported as tree `09272a581fcaaa7e2841e16f996547db3e9c5612`; upload audit found 1,052 reviewed files and no environment/temporary/dependency credentials. Deployment `dpl_Dcy4iTfVqaFzVSVqxBJaz6HqGEfn` (`https://mistake-watch-h04tb0rpk-cardinal117s-projects.vercel.app`) built successfully and was promoted around 18:08 UTC on 2026-09-05. Public domain inspect matched the candidate; health/readiness returned 200 and the development route returned 404.

**SECOND QA WINDOW ACTIVE: restore `dpl_1hQwBD9otKqAL4ouYrb4irogFShy` when this round ends.** Physical Huawei retest was requested and acceptance is pending. No final release or commit has been performed.

**SECOND WINDOW RESTORED:** physical retest failed YouTube continuity and landscape Home. The rollback shortcut returned plan-limited HTTP 402; promoting the exact prior deployment succeeded. Fresh public-domain inspect resolved `dpl_1hQwBD9otKqAL4ouYrb4irogFShy` Ready and public health returned 200 / ok:true. No final release.

Phone evidence: portrait containment now works well. Huawei still hears repeated correction/loading and choppy YouTube audio. Landscape Home leaves the right side blank and clips the player/transport on the left (owner screenshot). User also requested one clear room-controlled mini-player transport/timeline instead of competing native embed controls. Browser/version remains unknown.

Production desktop follow-up: expanded fullscreen fallback and +30 seek worked; document.fullscreenElement remained false, so native desktop fullscreen is not certified. Emulated 390x844 and 844x390 navigation stayed at viewport bottom with window.scrollY=0. Extreme landscape panel scrolling exposed residual portrait dock padding; local correction is in progress. The initial added end-of-panel regression scrolled the wrong element, so its first failures are not valid red evidence for the padding issue; correct it to exercise the actual scrolling container.

## Second phone feedback: local corrections

- Actual delayed-provider regression (1,600ms seek under continuous 100ms room updates) failed with position 0 instead of 25. After adding a provider correction gate, both immediate and delayed seeks pass at 25. The gate permits new room commands to preempt settling, waits for in-flight iframe/buffering operations, allows bounded stalled-buffer retries, and avoids audible correction for small steady playing drift. Three focused unit cases pass. This is deterministic provider-fixture proof; the exact Huawei audio symptom still requires live retest.
- Removed redundant double application of the same seek/play when returning to a visible document or resuming blocked autoplay. Shared observation helpers moved unchanged into player-instance to preserve the existing component ceiling; no file-policy exception was enlarged.
- Landscape Home width regression first measured 337.6px at an 844px viewport. Home now uses the full stage width and keeps its header, seek, play, local volume and fullscreen reachable. A 667px volume regression exposed a zero-width slider; compact secondary controls now leave at least 40px for volume. Existing room-name/audience tests pass unchanged.
- Corrected the panel end test to scroll the actual watch-content container: the last Leave room link was outside the viewport at maximum landscape scroll. Restricting portrait dock clearance to tall viewports fixed it. Navigation/More rotation test passes. Earlier wrong-container failures are excluded from red evidence.
- Native YouTube transport setting reproduced as controls=1 before the change and now initializes as controls=0 only for the redesigned Watch stage. The room timeline remains visible and the exact iframe survives navigation/fullscreen. Provider branding/start prompts are not cropped or covered. Supported options verified against https://developers.google.com/youtube/player_parameters .
- Whole-browser discovery accidentally matched the project directory name and included unrelated extension tests: 59 passed, 2 skipped, 3 failures. One was an unavailable extension fixture on hardcoded port 5371; two landscape header failures were corrected by keeping the room header visible. The final affected header/rotation/provider run passed 18 tests (49.5s); all other Watch cases passed in the broad run. Shared player/YouTube Node tests: 136 passed. Typecheck, targeted lint and file policy passed (0 violations, 18 inherited warnings).
- Design hook findings reviewed: existing black video canvas/fullscreen scrims and compact type values are unchanged by these fixes. They are contextual/inherited findings, not newly introduced palette/type choices; no suppression or design-system change added.

Production remains restored to dpl_1hQwBD9otKqAL4ouYrb4irogFShy. Corrected candidate build/export and a new physical retest are pending; no final commit/merge/release.

Final v3 local production webpack build passed with two build workers. No generated next-env change remains. Diff whitespace passed. Review note: YouTube automatic playing drift correction tolerates up to two seconds (iframe clock/keyframe uncertainty); new canonical position/status commands still bypass settling. This trades tiny automatic corrections for stable audio and must be assessed in real-device/two-participant QA. Direct/HLS correction thresholds are unchanged. The second temporary deployment remains restored while the third reviewed snapshot is prepared.

## Third temporary production QA window

Reviewed tree `1e2522ec9c02a5ca62458c965812ceb7a2aad29e`, 92 scoped changed files. Immutable export `.tmp/deploy-watch-20260905-v3`; upload audit passed 1,054 reviewed files, no credentials/temporary files. Vercel build passed and candidate readiness reports both backends ready. Candidate deployment `dpl_AeBKiczm8AmZTPW8a2swXoAytVUa` / `https://mistake-watch-9ed7zzj4d-cardinal117s-projects.vercel.app`.

**THIRD QA WINDOW CLOSED: restored `dpl_1hQwBD9otKqAL4ouYrb4irogFShy`; public-domain inspect reports that exact Ready deployment and health returned 200 / ok:true.** No final release or commit/merge/push. Phone acceptance remains required.

Third-window observation: opening the uncached Queue briefly replaced the entire production room with Loading room. Installed Next lazy-dynamic code confirms an import without a loading option suspends to the parent layout boundary. The original direct-render fixture lacked that production parent boundary, so a cold-chunk test initially passed falsely. After matching RoomExperience's Suspense boundary in the fixture, holding the actual workspace chunk request reproduced the video becoming hidden. Local dynamic panel loading boundaries now keep the media/transport visible and its clock advancing until the panel arrives; the same regression passes. This small additional fix is not yet in the third deployment.

Third candidate actual YouTube evidence: The Mad King played beyond 100 seconds; the underlying iframe video sampled at 84.026s, paused=false, readyState=4, no media error. Native transport parameter reads controls=0. Independent guest invite opening was blocked by the browser URL policy and has not been counted as a pass or circumvented.

## Fourth local refinement (not deployed)

- Third phone reply: continuous correction substantially improved; asks for a smaller four-corner dock and smoother first seconds. Follow-up confirms onset can happen on automatic next-song playback, possibly on rejoin. Rejoin is separately required to catch up, not rewind.
- Watch queue: compact rows, title/thumbnail play target, explicit Next, secondary action menu, pointer/touch handle with edge scrolling, measured reorder animation, left-swipe reveal then trash tap or second left-swipe removal. Existing permission checks retained. Header/More leave now confirm Yes/No with native dialog focus/escape behavior.
- Red evidence before implementation: queue row 120.375px exceeded 88px target; leave confirmation absent; dock 293.594px exceeded compact target. Green: queue/confirmation + four-corner/player identity tests pass. Drag/drop and revoked-permission coverage added post-hoc and passes. Browser full run had 57 passes and five stale-selector failures (old Leave link / arrow action). Updated those assertions for the approved button/drag controls; all 19 affected tests pass. Shared player/YouTube/queue tests passed 199 before the readiness change.
- Cold dynamic panel boundary regression passes; this keeps the media visible while an uncached workspace loads.
- Rejected local spike: existing advance's autoplay=false does NOT prepare paused; verified reducer always commits playing. Do not reuse that flag as readiness control. Additive prepare/start reducers now preserve old method signatures and all table schemas. Prepare verifies current source/occurrence, autoplay permission and expected next YouTube item, then selects paused at zero. Ready compares raw server timestamp, source, item, position and status before starting. Original playback update behavior is reused, including recommendation occurrence handling.
- Preserve raw serverRevisionMs separately from client-adjusted playback clock; acknowledgements must never compare an adjusted timestamp with server time.
- New contract tests: no-op interface red for missing preparation/start; 20 helper/reducer tests green (denied/stale/new seek/rejoin/lost permission). Missing-module and harness-extraction errors were setup failures, not red evidence. Slow-provider browser test passes: 3-second buffering, one load at zero, no playback command until first PLAYING, one canonical start below 0.5s, unchanged iframe across navigation.
- Real isolated Spacetime runtime on 127.0.0.1:5392: prepare stayed paused/zero for 3.2 seconds; denied guest ready, stale ready after seek, duplicate ready, new guest rejoin and legacy advance checked with independent clients. Old v3 generated bindings also connected and controlled the extended module successfully. Scripts retained under scripts/verify-youtube-autoplay.mjs; disposable databases are in memory only. No production backend update yet.
- Local module compiler build and explicit spacetime TypeScript check pass. CLI build itself warns tsc missing inside nested node_modules, so the explicit root TypeScript invocation is the type-check evidence. Full final frontend build/browser/regression gates remain to run after readiness integration.

Final fourth local checks: all 598 existing/current Node tests passed, followed by 20 prepared-autoplay helper/reducer checks including the additional empty-provider-ID guard. Watch browser run: 62 passed and one subpixel sizing assertion failed (199.9997px versus 200px). Corrected rounding tolerance and compact Direct-video expected height; all 19 affected responsive/provider cases passed with WATCH_DESIGN_QA=1. An earlier invocation without that opt-in skipped tests and is not counted. Production webpack build and frontend TypeScript pass. Lint has zero errors and one inherited RoomExperience navigation warning; temporary archived exports excluded from the scoped lint run. File policy: zero violations, 18 inherited warnings. Phone/landscape/desktop screenshots reviewed; leave-dialog encoding blemish corrected. No final release or Git commit.

Rollback preparation: saved the exact live Spacetime st_module program bytes under ignored .tmp/watch-v4-backend-rollback.js, SHA256 d581888471a713e1d933290c3392413a4244f5bc21fdc01401c7f962bc5e8d1f, program hash 0x70210637ac1694998055270b24d60f66f21d9bbdaaee04514e8a74cee6dd6af7. Compiled prior v3 backend executable code matches live byte-for-byte after excluding compiler region/source-map comments. Thus no unrelated live backend behavior is replaced. GET database initial_program is not the current st_module program hash and must not be used as rollback proof. Restore frontend dpl_1hQwBD9otKqAL4ouYrb4irogFShy first, then republish exact rollback JS with --delete-data=never; verify st_module hash.

## Fourth temporary production QA window - OPEN

Candidate tree 0fb144fd9569146eb808f477180c5835249508cc, 116 scoped changed files; isolated export .tmp/deploy-watch-20260905-v4 prepared using a separate Git index (owner staging unchanged). Vercel upload audit passed 1,071 files, no credentials/temporary data. Production Vercel build passed; candidate dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG / https://mistake-watch-i1g3rr084-cardinal117s-projects.vercel.app temporarily promoted to https://watch.mistakestudios.com.

The additive backend was published from the exact candidate bundle with --delete-data=never. No table migration/breaking change was required. Locally verified publishing candidate then exact prior rollback bytes with data deletion prohibited. Production health is 200/ok, Spacetime and Supabase readiness pass, /dev/watch-design is 404. Actual isolated QA room reconnected, loaded private catalogue, added The Mad King from history using Play next, and rendered compact queue rows. Physical-device gestures and automatic YouTube start acceptance remain pending.

Restore BOTH after this phone QA: first Vercel dpl_1hQwBD9otKqAL4ouYrb4irogFShy, then .tmp/watch-v4-backend-rollback.js via --js-path --delete-data=never --break-clients --yes=remote; verify prior st_module program_hash. Final release/commit/merge/push is not performed.

Fourth candidate real-provider evidence: Maestro automatically advanced to The Mad King; browser observed new title at 0:00 and then playing, same iframe id throughout. Read-only canonical room query confirmed the new playing baseline was 0.03589711444091797 seconds, rather than several seconds into the song. Actual leave dialog opened with No focused and dismissed without interruption. Isolated QA playback paused after verification. Physical Huawei feedback was requested; this QA window remains OPEN pending that response. No claim of physical touch/audio acceptance yet.

Final release recheck after owner acceptance: 599/599 Node tests and 63/63 Watch browser tests passed with zero skips. Updated final queue, landscape Home, top-corner dock and leave-dialog screenshots in qa/. Earlier screenshots and notes are historical milestones. The fourth window is owner-accepted and retained for release; no automatic restoration remains pending.
