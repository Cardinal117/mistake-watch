# Review Notes: Spatial Cinema Foundations

## Current Recommendation

Approve the product and architecture direction first. Do not approve the entire implementation roadmap at once. After TASK-007 reaches a stable point, approve Task 1 as a repository/dependency spike, then approve the primitive scale/asset audit before multiplayer implementation.

## Resolved Decisions

- Task ID is `TASK-008` because `TASK-006` and `TASK-007` already exist.
- Packet name is **Spatial Cinema Foundations**.
- Spatial Cinema is inside Mistake Watch, not a separate app or iframe.
- It is a per-client presentation, not a shared `room_session.mode`.
- Desktop 3D and Quest WebXR share the same room and spatial presence system.
- The implementation is a clean rewrite.
- Existing playback, queue, permission, participant, chat, and uploaded-media authority is reused.
- SpacetimeDB owns new transient spatial presence, poses, and seats.
- Supabase does not receive high-frequency poses.
- Guest settings are local-first; signed-in preference sync is optional later.
- Orbital Cinema is fixed for the first vertical slice.
- Primitive blockout precedes a manually authored Kenney environment.
- A golden room precedes generalized environment automation.
- Avatar v1 uses a floating existing avatar badge, name, host crown, and optional hands/controllers.
- Direct/HLS and authorized uploaded media are first.
- YouTube and screen sharing are deferred separate problems.
- Downward swipe to open the main spatial UI is non-negotiable.
- `OPEN_SYSTEM_MENU` is local and has controller/keyboard/desktop fallbacks.
- The first menu is useful but not full desktop feature parity.
- Real Quest measurement starts with the primitive proof.

## Confirmed Repository Findings

- `RoomExperience` currently chooses Watch or Listen from the shared live session mode.
- TV is implemented within Listen rather than as a peer `TVMode` room authority.
- `LiveRoomState` currently exposes queue, playback, participants, permissions, chat, mode switching, connection, and error capabilities.
- Current room subscriptions are filtered by `room_id`.
- `spacetime/src/index.ts` currently owns public room session, participant, permission, queue, chat, error, and kick tables plus reducers.
- Playback synchronization is centralized in `lib/player/sync.ts`.
- Uploaded playback already uses room-session references and an authorized playback endpoint.
- `canAccessUploadedCatalogue`, `canStartUploadedMedia`, and `canWatchRoomMedia` exist with focused tests.
- Live participants currently carry `avatarKey`, not arbitrary account avatar URLs.
- Current code has no `useRoomQueue()` hook; that name was illustrative.
- TASK-007 is actively decomposing room, media, and realtime boundaries without changing authority.

## Assumptions Made

- The first meaningful hardware target will support 72 Hz WebXR.
- Four simultaneous spatial participants are enough for initial proof; eight is a sensible architecture target.
- Seat-focused locomotion plus comfort-safe navigation is more important than free-roaming physics.
- The existing sync math can be reused through a spatial media adapter rather than copied.
- The target browser permits authorized media playback as a video texture when CORS, codec, and user-gesture requirements are satisfied.
- Kenney GLBs require material remapping and an authored optimization step before production use.

## Questions For Product Review

1. What is the minimum target headset: Quest 2, Quest 3, or best-effort Quest 2 with Quest 3 as the quality baseline?
2. Should desktop 3D v1 allow limited WASD movement, or begin with seat selection plus mouse look?
3. Should the first spatial entry be a third presentation button beside Watch/Listen controls, or an action inside Watch Mode only?
4. Is the first participant validation target exactly two clients, or should acceptance require four simultaneous clients?
5. Should the hardware-avatar catalogue remain the permanent visual identity, or should signed-in profile photos become a later optional spatial portrait source?
6. When the menu is summoned, should it appear near the swiping hand or consistently in front of the user's view?

None of these questions changes the central architecture. Questions 1-3 should be resolved before the first implementation slice.

## Technical Decisions To Validate

- Exact package versions for Three.js, R3F, drei, and `@react-three/xr` after TASK-007.
- Lazy-loading boundary and bundle impact.
- SpacetimeDB field representation for poses and the best bounded reaction mechanism.
- Whether the same spatial session can survive desktop-to-WebXR transition in the target browser.
- CORS and color-space behavior for current R2/signed playback URLs used by a video texture.
- Native bounds, origins, material counts, and geometry cost of shortlisted GLBs.
- Concrete world-unit UI measurements and swipe thresholds from device testing.

## Possible Simplifications

- Fixed Orbital environment.
- One screen and one video texture.
- Existing hardware-avatar badges instead of profile-photo propagation.
- Four-person initial validation.
- No hands when tracking is unavailable.
- Seat selection and snap turn before free locomotion.
- Queue preview instead of full spatial drag-and-drop reordering.
- No chat composer in the earliest interaction proof if participants and existing messages are enough to prove the adapter.

## Rejected Additions

- Separate VR application.
- Separate SpacetimeDB deployment before measurement proves isolation is needed.
- Spatial mode in the shared room mode enum.
- Full desktop layout floating in 3D.
- Synced menu positions or comfort settings.
- Permanent private R2 URLs.
- YouTube texture claims.
- Screen sharing in the media-sync slice.
- Multiple authored themes before the golden Orbital room.
- Full bodies, physics, voice, public worlds, and decorative interactables in the first milestone.

## Review Classification

**Spec-First.** This is cross-cutting, realtime, media-sensitive, security-sensitive, performance-sensitive, device-dependent, and design-heavy. It requires approval gates and real hardware evidence.

## Implementation Notes

No implementation has begun. Populate this section only after a specific task is approved.

## Verification Notes

- Planning-only repository inspection completed on 2026-07-14.
- Relevant current source boundaries and local Kenney pack contents were inspected read-only.
- No application code, schema, dependencies, generated bindings, assets, commits, or deployments were changed by the opening packet.
