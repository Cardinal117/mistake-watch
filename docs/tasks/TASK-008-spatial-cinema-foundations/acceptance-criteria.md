# Acceptance Criteria: Spatial Cinema Foundations

## Packet Approval Criteria

- The packet preserves the original spatial-cinema vision and the downward-swipe guarantee.
- Confirmed repository facts, locked direction, proposals, and open questions are distinguishable.
- The implementation roadmap is staged and does not imply blanket approval.
- TASK-007 refactor paths are marked for revalidation.
- The first vertical slice and deferred work have explicit boundaries.

## Product Boundary

- Spatial Cinema is a per-client presentation over an existing room.
- Entering Spatial Cinema does not change shared Watch/Listen mode for other participants.
- Standard Watch, desktop 3D, and Quest/WebXR participants can coexist.
- Entering/exiting spatial presence does not create, rejoin, reset, or leave the Watch room.
- No duplicate room, account, queue, chat, playback, permission, or media-library authority is introduced.

## Spatial Lifecycle

- A valid existing room participant can enter Spatial Cinema.
- Spatial presence is created separately from Watch membership.
- Pose publication starts only when the spatial presentation is active and ready.
- Desktop 3D can enter and exit without losing canonical playback position.
- WebXR can start and end without leaving the room.
- Explicit exit, disconnect, inactivity timeout, and stale-session replacement clean up pose and seat state.
- Multiple clients for the same account do not overwrite each other through a user-only pose key.

## Realtime Presence and Seats

- Spatial subscriptions are filtered to the active room.
- One current pose record exists per active spatial session; pose history does not accumulate.
- Pose updates carry monotonically increasing sequence and server-time information.
- Stale/out-of-order pose updates are rejected or ignored.
- Remote head movement is interpolated at render frequency.
- Extrapolation is short and bounded; stale avatars freeze/fade rather than drift indefinitely.
- Pose publishing begins at a measured 10-15 Hz hypothesis and is tunable.
- Two simultaneous claims for one seat resolve atomically to one owner.
- Seats release on explicit leave, disconnect, replacement, and inactivity cleanup.

## Avatars

- Remote users show an existing Mistake Watch avatar badge and display name.
- Host status uses the existing crown/explicit role treatment, not color alone.
- Current `avatarKey` is sufficient for the first slice; arbitrary remote profile image URLs are not required.
- Hands/controllers appear only when tracking is available.
- No full body is required.

## Playback and Queue Authority

- Spatial Cinema consumes the existing live room session and queue.
- Existing `LiveRoomState` capability/command boundaries or their post-refactor equivalents are reused.
- Playback controls are enabled only for users with current playback authority.
- Queue actions use existing queue permissions and reducers.
- Passive local video events cannot overwrite canonical playback state during source load, remount, or synchronization.
- Existing sync calculation and correction thresholds remain authoritative.
- Standard Watch participants observe the same active source and playback state.

## Uploaded-Media Security

- Starting uploaded media retains `canStartUploadedMedia` or its approved equivalent.
- Playback resolution retains `canWatchRoomMedia` or its approved equivalent.
- Catalogue visibility retains `canAccessUploadedCatalogue` or its approved equivalent.
- Spatial playback resolves room-session references through a short-lived/proxied authorized endpoint.
- Permanent private R2/object URLs do not enter SpacetimeDB room/spatial state, scene manifests, local persistence, or diagnostic output.
- Expired or revoked playback access produces a recoverable spatial error state.

## Media Screen

- One supported direct or authorized uploaded source renders on the cinema screen through one video texture.
- HLS support matches the approved standard-player capability where the browser supports it.
- Audio remains usable and personal volume remains local.
- Video texture, HLS worker, media listeners, and underlying media resources are disposed on exit/source change.
- Autoplay-blocked, buffering, unsupported, and failed states are visible and recoverable.
- YouTube projection and screen sharing are absent from the first vertical slice.

## System Menu and Interaction

- `OPEN_SYSTEM_MENU` is a local action, not shared SpacetimeDB state.
- Downward hand swipe can trigger the action on supported hand-tracking hardware.
- Controller, keyboard, and visible desktop fallbacks trigger the same action.
- Gesture recognition provides immediate feedback and a cooldown against repeated activation.
- The initial menu exposes playback, queue preview, participants, spatial settings, and Leave Spatial Mode.
- Menu placement starts relative to the user, faces them, and becomes world anchored.
- Invalid, obstructed, unreachable, or lost placement automatically recovers.
- Close and Bring Menu Here are available.
- Reset View/Height is distinct from menu repositioning.
- Menu interaction prevents unintended activation of world objects behind it.
- Full desktop UI parity is not required for the first slice.

## Visual Requirements

- Spatial UI follows the Obsidian Lounge design language from root `DESIGN.md`.
- Deep charcoal remains dominant; Signal Blue indicates technical/live/focus state; Signal Gold indicates host/authority state.
- The cinema screen is visually dominant while UI recedes when not needed.
- Kenney default orange/white and Sci-fi UI styling are remapped rather than becoming a conflicting product theme.
- Spatial UI has an approved design appendix before visual implementation locks panel sizes and motion.
- Avatar labels, controls, and status remain legible at intended seat/panel distances.

## Accessibility and Comfort

- No essential action requires hand tracking exclusively.
- Controller and desktop input equivalents exist.
- State is not communicated through color alone.
- Text and interaction targets are readable and reachable from seated use.
- Reduced-motion preferences disable or simplify nonessential movement.
- Teleport, snap turn, and menu movement avoid unnecessary acceleration or camera animation.
- A clear exit and recovery path remains available during tracking or connection failure.
- Unsupported WebXR produces a useful desktop/fallback path rather than a dead end.

## Performance and Instrumentation

- Primitive prototype instrumentation exists before the Kenney environment is introduced.
- Frame time, long frames, draw calls, triangles, scene load time, material/texture counts, pose rates, interpolation delay, avatar count, video drift, and menu spikes can be observed.
- Target Quest hardware is identified before final performance approval.
- The first prototype targets 72 Hz and treats 13.9 ms as the mathematical frame budget.
- Initial scene hypotheses are validated or revised from hardware evidence, not intuition.
- One video texture is active.
- Realtime shadows are disabled initially unless measured evidence supports an exception.
- Spatial code and assets are lazy loaded and do not materially inflate the unused ordinary room path without explicit review.

## Orbital Environment

- The primitive blockout is approved before authored-environment work.
- Exact shortlisted GLBs have measured native bounds, origins, geometry/material cost, proposed scale, classification, collider requirement, instance count, and keep/reject status.
- One-metre-reference previews/contact sheets support human approval.
- The golden room exposes named functional anchors rather than scattering hardcoded coordinates.
- Repeated static geometry is merged or instanced where useful.
- Collision geometry is simpler than visible geometry.
- Lighting is baked, unlit, or emissive-first; initial shadow-casting light count is zero.
- Orbital Cinema is fixed for the first vertical slice; environment selection is not synchronized.

## Error and Recovery States

- Scene loading does not look frozen.
- Scene load failure provides retry/return-to-Watch actions.
- XR session denial/failure provides a desktop or standard Watch path.
- Connection loss is visible and does not silently accept shared commands.
- Permission rejection explains why an action was not applied.
- Tracking loss exposes an input fallback.
- Seat conflict returns a clear unclaimed/alternative state.
- Media authorization expiry can retry or return safely without leaking the source.
- Spatial exit during an in-flight request does not resurrect disposed state.

## Must Not Break

- Existing standard Watch and Listen behavior.
- Listen TV presentation.
- Room membership and guest-first joins.
- Host/member queue and playback permissions.
- Room chat authority.
- Uploaded catalogue privacy and room-media session authorization.
- Existing queue reducers and playback synchronization.
- Existing avatar catalogue and host crown semantics.
- Mobile/desktop non-spatial room performance when Spatial Cinema is unused.

## Explicitly Deferred

- YouTube immersive projection.
- Screen sharing and WebRTC distribution.
- Shared remote browser projection.
- Voice chat.
- Full bodies and inverse kinematics.
- Wrist queue drawer beyond a later quick-action surface.
- Multiple finished themes or shared theme switching.
- Public worlds, physics, props, and complex customization.
