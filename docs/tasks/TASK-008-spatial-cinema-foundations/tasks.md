# Tasks: Spatial Cinema Foundations

## Approval State

No implementation task below is approved merely because this roadmap exists. Approve one task or tightly coupled slice at a time. TASK-007 should reach a stable integration point before Task 1 names final source boundaries.

## Task 0: Direction and Packet Approval

Suggested files:

- `docs/tasks/TASK-008-spatial-cinema-foundations/*`

Work:

- Review product boundary, non-goals, state ownership, lifecycle, first vertical slice, and Orbital Cinema direction.
- Resolve blocking review questions.
- Confirm the clean-rewrite and same-room presentation model.
- Confirm that `OPEN_SYSTEM_MENU` and the downward swipe remain non-negotiable.
- Confirm whether the first supported Quest target is Quest 2, Quest 3, or another baseline.

Review checkpoint:

- User explicitly approves the direction packet or requests revisions.
- No app code, schema, dependencies, or assets changed.

Safe commit point:

- Task packet only, after report-first review and explicit approval.

## Task 1: Post-Refactor Repository and Dependency Spike

Suggested areas:

- final room presentation boundary;
- final live-room facade after TASK-007;
- player/media adapter boundaries;
- SpacetimeDB module organization;
- package manifest and lockfile only after dependency approval.

Work:

- Re-map exact post-TASK-007 modules, commands, view models, and reducers Spatial Cinema consumes.
- Verify current React/Next.js compatibility with Three.js, R3F, drei, and `@react-three/xr` using primary documentation.
- Compare R3F/WebXR against any credible alternative only where a concrete requirement is unsupported.
- Prove a minimal lazy-loaded canvas does not inflate the ordinary room bundle when Spatial Cinema is unused.
- Decide the local room-presentation state and entry/exit route behavior.
- Record dependency versions and bundle impact before approving installation.

Review checkpoint:

- No duplicate playback/queue/permission architecture.
- Ordinary Watch/Listen path does not eagerly load the spatial stack.
- Exact module map supersedes provisional paths in `design.md`.

Safe commit point:

- Research/spec update and, only if separately approved, minimal dependency/canvas spike.

## Task 2: Exact Asset Audit and Primitive Scale Contract

Suggested outputs:

- approved asset shortlist in this packet;
- generated contact sheet or orthographic previews;
- scene scale and anchor convention;
- no production environment yet.

Work:

- Calculate native GLB bounding boxes, origins, mesh/triangle/material counts, and animation presence for candidates.
- Render consistent front/three-quarter previews with a one-metre reference.
- Mark keep/reject/alternative for shell, seat, platform, stair, rail, screen frame, terminal, lounge, window, and exterior props.
- Define metres, forward/up axes, origin, eye height, seated eye height, screen dimensions, row spacing, reach zones, and collider rules.
- Build a primitive room blockout using the approved scale contract.

Review checkpoint:

- User approves the shortlist and blockout dimensions before the golden environment is authored.
- No hardcoded asset coordinate sprawl.

Safe commit point:

- Asset audit, preview artifacts, and primitive scene only.

## Task 3: Solo Spatial Presentation Proof

Work:

- Add a lazy local Spatial Cinema presentation entered from an existing Watch room.
- Support desktop 3D camera/input and Quest WebXR entry/exit.
- Render primitive cinema, one local rig, screen surface, and local diagnostics.
- Exit back to ordinary Watch without leaving/resetting the room.
- Add scene/XR loading, unsupported, failure, and recovery states.
- Add baseline frame/draw/triangle/load instrumentation.

Review checkpoint:

- Standard Watch and Listen remain unchanged when Spatial Cinema is unused.
- Desktop and target Quest can enter and exit safely.
- Frame baseline is recorded before multiplayer and Kenney assets.

## Task 4: Spatial Session, Pose, and Seat Authority

Suggested areas:

- SpacetimeDB spatial tables/reducers;
- generated bindings;
- post-refactor spatial adapter;
- focused reducer and interpolation tests.

Work:

- Add spatial session, current pose, and atomic seat claim contracts.
- Create room-filtered subscriptions active only during Spatial Cinema.
- Publish pose initially at 10-15 Hz with sequence numbers and server timestamps.
- Interpolate remote avatars outside normal React render state.
- Handle stale update rejection, bounded extrapolation, inactivity, disconnect, and explicit exit cleanup.
- Ensure Watch membership persists when spatial presence ends.

Review checkpoint:

- Two clients join/leave spatial presence accurately.
- No pose history accumulates.
- Conflicting seat claims resolve atomically.
- Tests cover stale sequence, cleanup, and session identity collisions.

Safe commit point:

- Spatial authority and tests, without media/UI expansion.

## Task 5: Avatar Presence

Work:

- Render current Mistake Watch avatar badges, names, and host crown.
- Render hands/controllers only when tracked.
- Add distance legibility and stale-pose treatment.
- Confirm desktop and WebXR users appear consistently.
- Avoid introducing arbitrary remote profile URLs in the first slice.

Review checkpoint:

- Two people can identify each other and the host without full bodies.
- Labels do not dominate the screen or become unreadable at expected seat distances.

## Task 6: Secure Spatial Media Adapter

Work:

- Extract/reuse canonical direct/HLS synchronization behavior.
- Resolve uploaded room-session sources through the existing authorized playback endpoint.
- Create one video texture and dispose it correctly on source/exit.
- Keep authority-aware event publication and autoplay recovery.
- Expose buffering, expired authorization, codec/CORS, and media failure states spatially.
- Add focused tests around source resolution and authority boundaries.

Review checkpoint:

- One direct/R2 source plays on the cinema screen for two clients.
- Existing drift thresholds remain authoritative.
- No private permanent object URL enters live/shared state.
- YouTube and screen sharing remain absent.

Safe commit point:

- Secure direct/uploaded cinema playback only.

## Task 7: Main Spatial Menu and Guaranteed Gesture Contract

Work:

- Add local `OPEN_SYSTEM_MENU` action dispatcher.
- Wire desktop button, keyboard, controller, and downward-hand-swipe inputs.
- Build spatially appropriate playback, queue preview, participant, settings, and leave surfaces from existing capabilities.
- Add placement validation, Close, Bring Menu Here, and Reset View/Height.
- Capture modal pointer interactions and prevent world click-through.
- Add gesture feedback, cooldown, tracking-unavailable state, permission feedback, and disconnect recovery.
- Respect reduced motion, seated reach, controller-only use, and readable spatial targets.

Review checkpoint:

- The user can always open and recover the menu through at least one supported input.
- The gesture feels intentional and does not trigger repeatedly by accident.
- The menu does not reproduce the desktop layout wholesale.

Safe commit point:

- Main menu shell and input contract after desktop and Quest interaction QA.

## Task 8: First Vertical Slice Gate

Work:

- Exercise one desktop/Quest pair and standard Watch coexistence.
- Test enter/exit, poses, seats, avatars, playback, menu, permissions, URL expiry, disconnect, and recovery.
- Record frame time, draw calls, triangles, pose rates, interpolation delay, drift, menu spikes, and scene load.
- Adjust hypotheses only from measured evidence.
- Update implementation and QA review artifacts.

Review checkpoint:

- All first-slice acceptance criteria are met or blockers are explicit.
- User approves continuation to the golden Orbital environment.

## Task 9: Golden Orbital Cinema

Work:

- Assemble the approved Kenney shortlist into one authored environment.
- Apply Obsidian Lounge material remapping.
- Add named spawn, screen, menu, host, queue, seat, teleport, and collision anchors.
- Merge/instance repeated static geometry.
- Use baked/unlit/emissive-first lighting and no initial realtime shadows.
- Compress and budget textures/assets appropriately.
- Compare performance against the primitive baseline on the target Quest.
- Extract an environment manifest only after the golden room is accepted.

Review checkpoint:

- The authored room improves atmosphere without breaking comfort, readability, media focus, or frame budget.
- Asset pipeline decisions are documented for future themes.

## Future Tasks: Explicitly Deferred

- YouTube immersive presentation spike.
- Screen sharing/WebRTC source type.
- Voice chat and speaking indicators.
- Wrist queue quick drawer.
- Full avatars and body tracking.
- Additional environment themes and shared theme selection.
- Physics, props, public worlds, and social lobbies.

## Final Task: QA, Release Readiness, and Commit Prep

Work:

- Run focused reducer, sync, media-security, interaction, and performance tests.
- Run `npm run typecheck`, `npm run lint`, `npm run build`, and applicable existing suites.
- Run two-client desktop QA and real target-Quest QA.
- Use `qa-release-gate` to confirm acceptance, scope, design, and evidence.
- Use `git-commit-assistant` only after QA passes and the user requests commit preparation.
- Do not stage, commit, push, publish SpacetimeDB, migrate Supabase, deploy, or release without explicit approval.
