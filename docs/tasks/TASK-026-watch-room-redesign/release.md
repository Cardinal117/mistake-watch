# TASK-026 accepted Watch release

Status: owner-accepted in production on 2026-09-05; atomic Git integration and final main deployment verification in progress.

## What ships

A persistent Watch room with artwork-themed catalogue browsing, collections/history/details, explicit catalogue/link adding, Queue/Social/More, shared room identity controls, Cinema and working fullscreen. The single player survives local navigation and phone docking. Compact touch queues, four-corner player placement, viewport fixes and leave confirmation complete the accepted phone flow.

YouTube correction waits for in-flight provider work instead of repeatedly interrupting it. Automatic next prepares at zero and commits canonical playback only after provider readiness. The server still owns source, time, queue and permissions. No Supabase schema, R2 gateway/lease, provider OAuth, new ranking algorithm, Listen redesign or Media Session follow-up ships here.

## Verification

- Integrated onto main f84a775 (PR #11); current live backend executable baseline matched that source before the additive change.
- Local real Supabase/Spacetime room with independent participants: creation/join, rename, permissions, 250-item playlist import, reorder, direct play/pause/seek, reconnect, Watch/Listen and fullscreen passed.
- Real production R2 playback exceeded 30 minutes; distant unbuffered range seek and participant continuity passed. TASK-024 denial/revocation evidence retained.
- Slow YouTube fixture and isolated real Spacetime clients verify pause-at-zero preparation, unauthorized/stale acknowledgement denial, new seek preservation, rejoin and old generated-client compatibility. Real production automatic next began at 0.03589711444091797 seconds.
- Final release rerun: all 599 Node tests and all 63 Watch browser tests passed (zero skips). TypeScript and local production webpack build pass; Vercel production build passed. Lint: zero errors, one inherited RoomExperience navigation warning. File policy: zero violations, 18 inherited warnings.
- Owner Huawei Y9 Prime production QA accepted final gestures, size/movement, landscape/portrait layout, fullscreen and playback. Browser version was not supplied. Physical Safari and unrelated affected-user provider failures are not certified.
- Mixed test chronology is documented honestly in integration-qa.md: original visual checks/coverage include post-hoc tests; fullscreen/header/viewport/loading/correction regressions include recorded failures before fixes. Setup failures and skipped invocations are not counted.

## Deployment and rollback

Accepted code tree: 0fb144fd9569146eb808f477180c5835249508cc (116 scoped changed files). Vercel dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG, https://mistake-watch-i1g3rr084-cardinal117s-projects.vercel.app, promoted to https://watch.mistakestudios.com. Upload audit: 1,071 files; credentials and temporary artifacts excluded. Health/readiness passed for both backends; development fixture returns 404 in production.

The fourth temporary window is accepted and retained by explicit owner release approval. Do not apply its old automatic restoration instruction. The previous Vercel dpl_1hQwBD9otKqAL4ouYrb4irogFShy and exact backend program remain emergency rollback targets. Locally tested candidate-to-prior module rollback with data deletion prohibited. Prior backend program hash: 0x70210637ac1694998055270b24d60f66f21d9bbdaaee04514e8a74cee6dd6af7; exact bytes are retained only in ignored .tmp/watch-v4-backend-rollback.js, SHA256 d581888471a713e1d933290c3392413a4244f5bc21fdc01401c7f962bc5e8d1f. Restore old frontend before old backend; never delete database data. The canonical st_module hash, not GET database initial_program, verifies rollback identity.

## Remaining work

See bug-reconciliation.md for intentionally open reports. No outstanding accepted TASK-026 functional defect remains. Recommendations, full Listen touch parity, affected-profile provider diagnostics and TASK-025 performance work are separate workstreams. Original checkout dirty work and safety stash 47faef4eed6f45c286bebb190dd524e94ca57261 are preserved.

## Git integration

Approved plan: additive backend commit, Watch frontend/integration commit, documentation/QA commit; merge by PR with a merge commit to preserve atomic history. Final commit/PR/deployment evidence follows after execution.
