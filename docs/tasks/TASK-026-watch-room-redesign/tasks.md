# Implementation sequence

- [x] Inspect current main, adjacent work and approved references; create isolated worktree.
- [x] Establish browser red evidence for navigation and player persistence; run pre-change player/queue tests.
- [x] Implement Watch-only shell, browser, details, collection navigation and persistent responsive player.
- [x] Integrate existing Queue/Add/Social/account/management actions and permission-aware transport.
- [x] Verify desktop/mobile/landscape, keyboard, player DOM continuity, actions, denial/errors and bounded catalogue rendering.
- [x] Run typecheck, lint, build, file policy, regression suite; inspect screenshots and exact local route.
- [x] Record final evidence, remaining real-service/device limits and handoff. No automatic Git release actions.

## User refinement

- [x] Reuse Listen artwork theme, ambient presentation and styled transport; fix focus, collections and Invite.
- [x] Clarify catalogue/link navigation and polish mobile More and content reachability.
- [x] Verify source/theme changes, desktop and mobile interactions, continuous player identity and regression checks; refresh preview evidence.

## Queue and fullscreen follow-up

- [x] Remove duplicate queue adding/header chrome and compact queue mode/actions on desktop and mobile.
- [x] Establish a failing browser test for the fullscreen button, then implement real media fullscreen with the existing player and permission-aware transport.
- [x] Verify seek +/-10/30 seconds, clamping, actual video seeking, play/pause, mute/volume, next, overlay visibility, exit/focus restoration and denied actions.
- [x] Review desktop/mobile screenshots and Opera interaction; run browser and Node regression suites, typecheck, lint, production build and file policy.

## Room identity and mobile follow-up

- [x] Adopt Listen save star, inline live rename action and shared audience/member dialog in Watch.
- [x] Preserve authority checks, member counts, failure handling, theme inheritance and keyboard focus.
- [x] Stress-test long names, 24 members, small phones, landscape and reduced keyboard height; fix the 2px account crown overflow.
- [x] Run header/mobile and existing Watch regressions, Node tests, typecheck, lint, production build and visual review.

## Approved integration and release

- [x] Reconcile main's merged playback fixes without importing unrelated dirty Media Session/performance work.
- [x] Verify actual local room creation, two-participant join, permissions, adding/reordering, sync, reconnect, fullscreen and Watch/Listen switching.
- [x] Repeat integrated static/build checks and review the candidate diff.
- [x] Prepare a shareable HTTPS deployment without moving production domains; test real catalogue/YouTube and R2 playback beyond the expiry boundary.
- [x] Obtain physical-phone fullscreen/rotation evidence and final acceptance.
- [ ] Complete the authorized atomic commits, PR merge and final main deployment verification.

## Physical-phone findings during temporary production QA

Owner tested a Huawei Y9 Prime: direct room play/pause/seek was responsive, but scrolling could move the shell beyond its viewport and leave the floating player behind the bottom navigation. Landscape felt awkward. Mini-player YouTube controls sometimes took about ten seconds and playback could repeat a position while other panels loaded. These are release blockers, not accepted limitations.

- [x] Contain document scrolling while preserving internal content scrolling and keyboard access; keep phone navigation consistent after rotation. Local and owner physical-phone retests passed.
- [x] Reproduce and address delayed YouTube dock controls without changing room authority or hiding/remounting the provider.
- [x] Verify the fixes locally and repeat physical-device QA before final release.

## Second physical-phone refinement (explicitly requested)

- [x] Diagnose repeated YouTube correction under real provider buffering, cached iframe observations and unrelated room updates. Establish a provider regression before changing synchronization; preserve canonical room authority, explicit pause/seek responsiveness, guest permission checks and end/replay behavior.
- [x] Make phone landscape Home emphasize the player across the available stage width with accessible transport; use the side-by-side dock only while browsing another screen. Test Home versus Browse/Queue/Add/More and rotation.
- [x] Disable native YouTube transport through supported player configuration for Watch; add a compact room-controlled dock timeline without hiding/cropping provider branding or remounting the player on navigation. Verify permission denial and seek behavior.
- [x] Remove portrait dock clearance from landscape panels and verify the final content remains visible at maximum scroll.
- [x] Run focused and shared-player regression gates, visual portrait/landscape checks, then another actual-device acceptance check before final release. Prior temporary windows were restored before the final accepted window.

## Third phone QA and queue gestures (owner-approved)

Third phone feedback confirms the repeated correction and portrait fixes are much improved. Prior production dpl_1hQwBD9otKqAL4ouYrb4irogFShy was restored and independently inspected after this QA window. All 58 Watch browser tests pass, including the cold-panel loading regression. Historical third-window checkpoint; superseded by the accepted fourth window below.

- [x] Reduce mobile dock chrome and default size; permit four-corner positioning with restrained motion, an enlarge action and uninterrupted single-provider playback. Preserve provider minimum dimensions.
- [x] Investigate skipped opening seconds during fresh YouTube startup; never rewind a joining client or overwrite a newer canonical command.
- [x] Compact Watch queue rows with a generous play target, explicit Play next, touch/pointer drag ordering with edge scrolling, animated swipe reveal and second-swipe removal. Preserve keyboard alternatives, permissions, history and canonical ordering.
- [x] Confirm leaving through the room back arrow (Yes/No, Escape, focus restoration); apply the same protection to the More leave action.
- [x] Run test-first interaction regressions, shared queue/player tests, responsive visual QA and build before another temporary phone acceptance round.

### Autoplay readiness contract (scope clarification from verified reducer behavior)

The existing `advance_queue_item` always commits playing; autoplay=false only changes permission/event semantics. A frontend-only wait using that flag was rejected during the local spike and must not ship. Add separate, additive prepare/start reducers without changing existing reducer arguments or database tables. Prepare validates the current source/occurrence, autoplay permission and predicted next item, then selects YouTube paused at zero. Only the initiating browser prepares the existing embed. Its first PLAYING acknowledgement requests canonical start with an exact source/item/position/status/timestamp comparison on the server. Newer commands, disconnect, lost permission or a failed provider cancel the pending local start. Joining clients have no local intent and follow canonical playback. Existing direct/R2/legacy-client advance behavior stays intact. Verify actual reducer guards and local two-client behavior before a coordinated temporary frontend/backend QA deployment.

## Accepted release - 2026-09-05

Owner physical Huawei Y9 Prime QA passed: "This is perfect, I will pass QA, it all works as requested." The owner explicitly approved documentation, atomic commits, push/PR merge to main and final production deployment. This supersedes the temporary-window restoration requirement: retain the accepted candidate while completing Git integration. Earlier limitations and deployment states below are chronological evidence, not the current release status.

Accepted application tree: `0fb144fd9569146eb808f477180c5835249508cc`; Vercel `dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG`. The additive prepared-YouTube backend is deployed. See [release summary](release.md) and [bug reconciliation](bug-reconciliation.md). Final Git/deployment identifiers will be recorded in the release summary after merge.
