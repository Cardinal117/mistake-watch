# TASK-026 accepted Watch release

Status: complete, owner-accepted, merged to main and production-verified on 2026-09-05.

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

Merged [PR #12](https://github.com/Cardinal117/mistake-watch/pull/12) at 2026-09-05 20:29 UTC using merge commit 662597a1bda7ec458017303644874353d672d462. Atomic commits preserved:

- c4f58a6: additive YouTube readiness reducers, generated bindings and runtime tests.
- c98b8da: persistent Watch UI, touch queue, player/integration fixes and tests.
- f337792: accepted QA packet, root documentation and report reconciliation.

Final read-back: the public domain resolves to Ready production deployment dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG; health and Supabase/Spacetime readiness pass. Every non-documentation file in merged main matches the owner-accepted deployment tree. The live backend bytes exactly match the accepted compiled artifact; current program hash 0x7d8b24e21730a7e9a31bb3b3d76c147a722cb391a523334a156085096e723e63. Therefore retain this accepted production deployment rather than rebuild unchanged application code. This final release-record commit changes documentation only.

The isolated release worktree is clean after committing this record. The original checkout remains on its previous local main with unrelated dirty work; it was not reset or pulled over those changes. Remote main contains the release. No production rollback, credential commit, Worker update or unrelated bug closure occurred.
