# Proposal: Spatial Cinema Foundations

## Status

Draft for product and architecture approval. Spec-first classification. No implementation task is approved yet.

## Problem

Mistake Watch has mature room, playback, queue, identity, media-security, and realtime authority systems, but it has no spatial presentation. The earlier 3D prototype proved that shared browser presence was compelling, yet its implementation attempted multiplayer, provider playback, screen sharing, and VR simultaneously and could not rely on the systems now available in Mistake Watch.

Reviving the idea without explicit boundaries would create the largest risks possible:

- a duplicate room or playback authority;
- spatial preferences incorrectly synchronized as shared state;
- private uploaded-media URLs bypassing current authorization;
- desktop UI copied into an unreadable floating panel;
- pose traffic driving React rerenders or durable Supabase writes;
- a polished 3D environment built before Quest performance and scale are proven;
- YouTube or screen sharing silently inflating the first milestone.

## Goal

Define and then deliver Spatial Cinema as a clean, maintainable presentation layer inside an existing Mistake Watch room, beginning with one measurable cross-platform vertical slice and one validated Orbital Cinema environment.

## User Value

- Friends can share the feeling of sitting together rather than merely viewing the same player page.
- Desktop users can participate without owning a headset.
- Quest users receive a native-feeling WebXR presentation without joining a separate product.
- Existing queues, uploads, permissions, avatars, and room identity gain a new presentation instead of being rebuilt.
- The feature gives Mistake Watch a distinctive identity beyond conventional watch-together players.

## Locked Product Direction

- Spatial Cinema is a per-client presentation, not a new shared room mode.
- The normal room remains authoritative while participants mix presentations.
- The implementation is a clean rewrite; the historical prototype is reference-only.
- SpacetimeDB remains the live room authority and gains narrowly scoped transient spatial state.
- Supabase remains the durable authority and does not receive high-frequency pose data.
- Direct/HLS and authorized uploaded media are the first screen sources.
- Orbital Cinema is the fixed first environment.
- Desktop 3D and Quest/WebXR must share the same spatial session.
- Existing avatar artwork, display names, and host crown define avatar v1.
- The downward swipe that dispatches `OPEN_SYSTEM_MENU` is non-negotiable.
- Controller, keyboard, and desktop fallbacks are mandatory.

## Scope

### Foundation specification

- Confirm repository integration boundaries after TASK-007 settles.
- Define spatial lifecycle, state ownership, authority, security, and recovery.
- Validate the proposed Three.js/R3F/WebXR stack against the actual application versions.
- Establish a measurement-first Quest performance workflow.
- Audit exact Kenney assets and approve a golden Orbital Cinema shortlist.

### First implementation milestone

- Enter and leave Spatial Cinema from an existing room without changing room membership.
- Desktop 3D presentation and Quest WebXR presentation.
- Spatial session presence, head pose, optional hands/controllers, cleanup, and interpolation.
- Atomic seat claim and release.
- Avatar badge, display name, and host overlay.
- One authorized direct/R2 media source on a true 3D cinema screen.
- Existing playback, queue, participant, permission, chat, and media-resolution capabilities exposed through spatially designed controls.
- Guaranteed `OPEN_SYSTEM_MENU` action with keyboard/button/controller/gesture input sources.
- Primitive cinema and performance instrumentation before the final Kenney environment.

### Golden environment milestone

- One authored Orbital Cinema using approved Kenney GLBs.
- Named functional anchors and simple colliders.
- Obsidian Lounge material remapping.
- Baked or unlit/emissive-first lighting appropriate for Quest.
- Optimized repeated geometry and texture/material budget.

## Non-Goals

- Salvaging or porting the old prototype implementation.
- Replacing Watch or Listen Mode.
- Making `spatial` another value in the shared `room_session.mode` field.
- A second queue, playback model, permissions system, chat system, or media library.
- YouTube video as a Three.js texture in the first milestone.
- Screen sharing or shared remote browser projection.
- Voice chat.
- Full avatar bodies, inverse kinematics, lip sync, or customization.
- Physics, interactable toys, public worlds, or social lobbies.
- Multiple production environments.
- Environment selection synchronization.
- Permanent private R2 URLs.
- A full desktop settings interface reproduced as a single floating DOM panel.

## Primary Risks

| Risk                                | Consequence                                | Direction                                                                           |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Spatial added as shared room mode   | Switching one participant changes everyone | Keep presentation local; leave `room_session.mode` for shared Watch/Listen behavior |
| Pose updates coupled to React state | Frame drops and rerender storms            | Use refs/dedicated interpolation state and render-loop mutation                     |
| Pose history inserted indefinitely  | Storage and subscription growth            | One current pose per spatial session; sequence and overwrite                        |
| User identity used as pose key      | Multiple-tab and reconnect collisions      | Introduce a distinct spatial-session identifier                                     |
| Uploaded source bypass              | Private media exposure                     | Reuse room-media session resolution and short-lived URLs                            |
| YouTube promise                     | Unshippable video texture                  | Defer to a hardware/provider spike                                                  |
| Gesture unreliability               | User cannot reach controls                 | Keep multiple equal fallbacks and visible recovery                                  |
| World menu gets lost                | User becomes trapped                       | Bring Menu Here, placement validation, and automatic relocation                     |
| Kenney scene assembled naively      | Excessive draw calls/materials             | Golden-room pipeline, merging/instancing, measured budgets                          |
| Current refactor paths become stale | Spec points at obsolete modules            | Revalidate exact integration map after TASK-007                                     |

## Success Criteria

- Product and architecture reviewers can explain why Spatial Cinema is a presentation rather than a new room mode.
- No proposed spatial component owns playback, queue, permission, or uploaded-media authorization independently.
- Shared, local, and durable state have explicit ownership.
- The first milestone has a clear stop line and excludes provider/live-streaming expansion.
- Quest performance is measured from the primitive proof onward.
- The user can always summon and recover the main interface.
- One desktop and one Quest client can share a room and spatial session without disturbing standard Watch participants.
- The ordinary Watch and Listen experiences remain operational and visually unchanged unless a separately approved entry control is added.
