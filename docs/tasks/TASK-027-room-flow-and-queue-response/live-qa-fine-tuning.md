# Live QA fine tuning — 2026-09-07

Production remains live at the accepted working candidate until a tested replacement is ready. PR #13 stays unmerged. Fix and verify locally first.

Owner evidence: three devices in one room: Opera/private window without catalogue access, Opera GX with access, Huawei Chrome with access (browser versions not supplied). Play/pause, item loading, seeking/skipping and mode switching propagated successfully across devices. This is owner-reported physical/live acceptance, not agent instrumentation.

Remaining scoped findings:
1. Desktop Cinema fullscreen transport is constrained to the left. Keep controls distributed across the fullscreen width; preserve mobile sizing and provider visibility.
2. Local volume must survive Watch/Listen switching, including mute. It stays device-local and must not issue a room playback command.
3. Roughly half-second mobile transport/clock lag: distinguish display cadence, command position freshness and actual provider drift. Do not increase correction frequency blindly.
4. Catalogue video in Listen should remain visible in the media/artwork stage rather than being forced into hidden audio. Keep audio-only artwork fallback and one provider while browsing/expanding.
5. One unreproduced catalogue token-expiry report after queue/mode activity. Inspect resolution/renewal lifetimes; preserve expiry and authorization checks, and do not claim a fix without reproduction.
6. YouTube occasionally restarts after room rename or permission/control changes. Reproduce with playing media and nonzero position, retain iframe, and assert no load/seek/restart from metadata or permissions alone. Preserve genuine source changes, seeks and autoplay preparation.

Verification: reproduce confirmed behavioral defects before source edits; focused browser/player tests, existing provider/queue regressions, types/lint/build as appropriate. Record unresolved diagnostics honestly. No rollback, merge or deployment during local fine tuning.


## Local implementation and evidence — 2026-09-07

- Confirmed connection-lifetime defect: replacing the room name/current-member object or mode re-ran the connection effect, disconnected the active client and forced a new admission. The effect now uses stable room/member identity and role boundaries; current seed metadata is read when a real connection starts. The actual-hook harness failed for all three metadata refresh cases before the fix and passes afterwards with uninterrupted elapsed playback at a nonzero position. Changing member identity still reconnects. This is a reproduced mechanism consistent with the owner report, not yet physical-device confirmation of every YouTube restart case.
- Fullscreen transport explicitly removes the inherited 1200px Cinema maximum. Browser verification at 1920x1080 passes and the captured controls span the viewport. The assertion waits for asynchronous fullscreen entry.
- Stored volume preserves zero/mute and nonzero values. UI mount no longer broadcasts temporary default 72% before reading storage. Direct and YouTube initialization respect stored mute. Browser tests verify 0% and 37% through Watch → Listen → Watch route mounts; this is local remount coverage, not a new live provider-switch acceptance.
- Both control displays tick at 250ms rather than 500ms. Play/pause commands compute canonical position at click time instead of using the last display tick. Fake-clock browser tests confirm both modes preserve an intervening 125ms when pausing. Owner clarified the controls and duration definitely lag, while actual audio/video misalignment was not established. No drift tolerances, server timing or correction frequency changed; physical cross-device confirmation remains pending.
- Listen renders direct/catalogue video in its existing artwork stage with object-contain while retaining Listen playback mode and one media instance. Audio-only WAV coverage confirms retained poster, successful play/pause and one element. Existing navigation, breakpoint, permission and drag tests were updated from audio to video because the original fixture is a video file; they still assert actual element identity.
- Two YouTube SDK-fixture cadence cases (instant and delayed seek) retain the original iframe and requested nonzero position while names and playback permissions change repeatedly. This supplements the actual connection-hook tests; it does not substitute for live YouTube QA.

Validation: 240 player/YouTube/Spacetime tests passed; 20 existing Listen browser cases passed; 7 fine-tuning browser cases passed (fullscreen, two volume values, visible video, audio-only fallback, two click-time checks), plus 2 YouTube cadence cases. Typecheck and scoped lint passed; file-length policy has zero violations (17 existing/legacy warnings). Screenshots inspected for desktop fullscreen and completed mobile expansion. Initial red cases, final results and captures are in ignored `.fine-*.log` and `.tmp/fine-*.png`; these are local evidence, not release artifacts.

## Remaining diagnostics / release boundaries

The one-off catalogue message is still un-reproduced. The existing client catch labels every playback-URL resolution failure as expired/not allowed; that text alone cannot distinguish genuine expiry from another request failure. Resolution is guarded against disposed media instances. No gateway, TTL, authorization or database behavior was changed. Capture exact error and triggering action if it recurs. Archived MW-BUG-004 is not reopened or declared regressed on this evidence alone.

MW-BUG-006 (refresh then resume minutes away) remains open: preventing unnecessary metadata reconnects is related, but does not prove its original manual-refresh scenario fixed. No intake entries were closed by these fixture results.

The current production release must remain live until the fine-tuned replacement is reviewed. All changes here are local and uncommitted; PR #13 remains unmerged. Next acceptance is the actual-room rename/permission sequence during YouTube playback, volume switching, fullscreen and the Huawei display timing. No deployment or rollback was performed during this follow-up.

Build: optimized Next.js Webpack build passed, including TypeScript and route generation. Default Turbopack could not traverse this worktree's external node_modules link; it failed before application compilation. This local infrastructure limitation remains distinct from a clean deployment build, which was not attempted for these changes.


## Fine-tuning deployment — 2026-09-07

User authorized Git, deployment and documentation updates. Commits `eacaad4`,
`6342bc0` and `fe7b28c` are pushed on `codex/task-027-room-flow`; PR #13's
scope/evidence description is updated and remains draft/unmerged. A clean
1,147-file tracked archive at `fe7b28c` excluded environment files, caches and
uncommitted/generated noise. Vercel's production Turbopack build passed.

Deployment `dpl_AEkhfVx3PikrQ4e1YPe9HR4SztgE`:
https://mistake-watch-3h9qude29-cardinal117s-projects.vercel.app
was promoted and verified at https://watch.mistakestudios.com. Health/readiness
return 200 (readiness ready); both design-preview routes return 404; dashboard
browser smoke passed. This is smoke evidence, not new multi-device acceptance.

Rollback frontend: `dpl_2rG6qaf8oMmzbSWm453DTUQqfX8X`. No backend, database,
Worker or authorization changes were deployed. Keep the new release live while
targeted owner acceptance is pending. README, handoff and roadmap were reconciled;
subsequent documentation-only commits do not change the deployed application.
This checkpoint supersedes the earlier local-only/uncommitted status above.
