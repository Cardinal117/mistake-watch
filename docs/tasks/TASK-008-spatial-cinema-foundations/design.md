# Technical and Experience Design: Spatial Cinema Foundations

## Document Status

This design combines confirmed repository facts with proposed Spatial Cinema contracts.

- **Confirmed current:** observed in the repository on 2026-07-14.
- **Locked direction:** explicitly agreed product intent.
- **Proposed:** requires implementation-task approval or technical validation.
- **Revalidate:** exact file boundary may change during TASK-007 modularization.

## 1. Experience Classification

- Interface type: media/entertainment, realtime collaboration, game/VR/spatial, responsive cross-platform UI.
- Primary users: friends and family already participating in a Mistake Watch room.
- Primary job: sit together, understand who is present and in control, and watch synchronized media comfortably.
- Primary objects: cinema screen, current media, queue, participants, seats, spatial menu, local comfort state.
- Mistakes to prevent: leaving the room accidentally, controlling playback without authority, losing the system menu, exposing private media, motion discomfort, silent desynchronization.

The cinema screen remains the dominant surface. UI appears when needed and recedes during playback.

## 2. Product Boundary

### Locked direction

Spatial Cinema is a local presentation choice over a shared room.

The existing `LiveRoomMode` currently contains `watch`, `listen`, and future `browser`, and `RoomExperience` uses live room mode to choose the Watch or Listen layout. Spatial Cinema must not be added to this shared enum as a peer mode because that would make one participant's choice affect the entire room.

Proposed local presentation state:

```ts
type RoomPresentation = "standard" | "desktop-spatial" | "webxr-spatial";
```

This name is illustrative, not approved source code.

### Presentation coexistence

```text
Shared room_session.mode = watch
├── Participant A: standard Watch layout
├── Participant B: desktop spatial client
└── Participant C: Quest WebXR client

All three consume the same:
playback + queue + permissions + uploaded-media session + room identity
```

Listen-mode Spatial Cinema is not required in the first vertical slice. The architecture should avoid making it impossible, but the first proof targets watchable direct/uploaded video.

## 3. Confirmed Repository Integration Map

| Capability                            | Current source                                                                        | Spatial direction                                                           | Status                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Server room entry and account summary | `components/room/room-shell.tsx`                                                      | Reuse existing account and room context                                     | Confirmed; revalidate after TASK-007              |
| Watch/Listen presentation selection   | `components/room/room-experience.tsx`                                                 | Add a local presentation boundary without changing shared room mode         | Confirmed; revalidate                             |
| Live room capability facade           | `lib/spacetime/use-live-room.ts` / `LiveRoomState`                                    | Consume its stable commands/view models; do not duplicate reducers          | Confirmed; currently under TASK-007 decomposition |
| Live room types                       | `lib/spacetime/types.ts`                                                              | Extend deliberately for spatial tables after spec approval                  | Confirmed                                         |
| Room-scoped subscription builder      | `lib/spacetime/adapter.ts#getRoomSubscriptions`                                       | Add room-filtered spatial subscriptions only while Spatial Cinema is active | Confirmed                                         |
| SpacetimeDB authority                 | `spacetime/src/index.ts`                                                              | Add narrowly scoped spatial tables/reducers and disconnect cleanup          | Confirmed; exact module layout will change        |
| Playback sync math                    | `lib/player/sync.ts`                                                                  | Reuse canonical calculation/correction rules                                | Confirmed                                         |
| Direct/HLS player behavior            | `components/room/direct-media-player.tsx`                                             | Reuse/extract media and sync capabilities, not the full DOM component       | Confirmed; revalidate                             |
| YouTube player                        | `components/room/youtube-media-player.tsx`                                            | Standard UI only initially; no texture promise                              | Confirmed limitation                              |
| Uploaded catalogue gate               | `lib/media/uploaded-catalogue-policy.ts#canAccessUploadedCatalogue`                   | Catalogue visibility remains unchanged                                      | Confirmed                                         |
| Uploaded start gate                   | `lib/media/room-media-session-policy.ts#canStartUploadedMedia`                        | Spatial controls invoke the same start path                                 | Confirmed                                         |
| Uploaded watch gate                   | `lib/media/room-media-session-policy.ts#canWatchRoomMedia`                            | Required before resolving spatial playback URL                              | Confirmed                                         |
| Playback URL resolver                 | `/api/media/room-sessions/[sessionId]/playback` consumed by `direct-media-player.tsx` | Reuse authorized short-lived resolution before assigning video source       | Confirmed                                         |
| Queue/playback/permissions view model | `LiveRoomState`                                                                       | Spatial controls consume `snapshot`, authority flags, and existing commands | Confirmed                                         |
| Chat                                  | `LiveRoomState.sendChatMessage` and `room_chat_message`                               | Optional compact spatial surface; no duplicate chat channel                 | Confirmed                                         |
| Participant visual identity           | `lib/identity/avatars.ts`, `hostCrownSrc`, `LiveParticipant.avatarKey`                | Avatar badge/name/crown v1                                                  | Confirmed                                         |
| Signed-in profile image               | `AccountSummary.avatarUrl`                                                            | Not currently propagated to remote live participants                        | Confirmed gap; later decision                     |
| Listen TV                             | `components/room/listen/tv/tv-mode-layout.tsx`                                        | Treat as a nested Listen presentation, not a peer room authority            | Confirmed                                         |

There is no current `useRoomQueue()` hook. Any future shared queue adapter should be extracted from the stable post-TASK-007 capability boundary rather than invented as a parallel system.

## 4. State Ownership

### Existing authoritative shared state

Do not duplicate:

- `room_session`: source, playback status, position, server update time, room mode, host/controller, active item;
- `room_participant`: room membership and live identity;
- `room_permission`: queue/playback/browser/management capabilities;
- `live_queue_item`: active queue;
- `room_chat_message`, `room_error`, and room removal state.

### Proposed transient spatial state in SpacetimeDB

#### `spatial_session`

One row per active spatial client session, not per user.

Proposed responsibility:

- spatial session ID;
- room ID and member ID;
- Spacetime identity/connection association;
- presentation kind (`desktop-3d` or `webxr`);
- avatar key and display name snapshot where required for rendering;
- claimed seat ID or a relation to a separate seat claim;
- joined and last-active server timestamps.

#### `spatial_pose`

One current row per spatial session:

- spatial session ID;
- room ID;
- monotonically increasing sequence;
- server timestamp;
- head position and quaternion;
- optional left/right hand or controller transforms;
- tracking availability flags.

Pose history must not accumulate. Stale or out-of-order sequences are rejected. The exact scalar/product representation must follow current SpacetimeDB TypeScript capabilities when implemented.

#### `spatial_seat_claim`

Atomic reducer-owned claim keyed by room and seat:

- room ID;
- fixed environment seat ID;
- owning spatial session ID;
- claimed timestamp.

Claim, transfer, and release must be reducer-atomic. Disconnect and inactivity cleanup must release the seat.

#### Temporary reactions

Use a bounded event/expiry mechanism verified against the installed SpacetimeDB version. Do not create unbounded reaction history.

### Local ephemeral state

- WebXR session and reference space;
- current camera/head render transform;
- remote interpolation buffers;
- pointer and hover targets;
- menu open/closed state and world transform;
- gesture phase, velocity samples, cooldown, and dominant hand;
- teleport and snap-turn state;
- selected local graphics quality;
- personal volume;
- comfort vignette state;
- load/error state for scene, XR session, media texture, and tracking.

High-frequency transforms must stay outside ordinary React render state. Scene nodes should be updated through refs or a dedicated render-oriented store.

### Local persisted and optional account-synced preferences

Local persistence is required for guests. Signed-in profile sync may be added later for:

- dominant menu hand;
- gesture sensitivity;
- snap-turn angle;
- reduced motion;
- comfort vignette;
- quality preference;
- seated/standing preference.

No Supabase schema change is required for the first vertical slice unless a later approved task explicitly adds account synchronization. Every exposed Supabase table must retain RLS and ownership-safe policy design.

## 5. Spatial Lifecycle

### Enter

1. User is already a valid Watch-room participant.
2. User chooses Enter Spatial Cinema locally.
3. Client loads the spatial bundle and primitive environment.
4. Client creates a spatial-session ID and invokes an authorized enter-spatial reducer.
5. Room-filtered spatial subscriptions start.
6. Pose publication starts only after the scene and tracking/camera are ready.
7. Existing Watch membership, queue, playback, and uploaded-media session remain intact.

### Switch desktop 3D to WebXR

- Prefer continuing the same spatial session when the same browser client enters XR.
- Update presentation/tracking capability without duplicating presence.
- If the browser requires a new client session, explicitly retire the previous spatial session.

### Exit

1. Stop pose publication immediately.
2. Release seat through the reducer.
3. Remove spatial session and pose rows.
4. End WebXR and dispose scene resources/listeners/video texture.
5. Return to ordinary Watch presentation at the current canonical playback position.
6. Remain a Watch-room participant.

### Disconnect and timeout

- Associate the spatial session with connection identity where supported.
- On disconnect, remove spatial presence, pose, and seat ownership.
- Use a short inactivity timeout as a second cleanup path.
- A stale tab must not overwrite a newly reconnected session.

## 6. Pose Publication and Rendering

- Initial hypothesis: 10-15 network updates per second.
- Only publish while Spatial Cinema is active and the client is connected.
- Quantization/compression is a later optimization; correctness first.
- Reject older sequence numbers.
- Keep previous and latest accepted pose samples locally.
- Interpolate at render frequency with a small buffer.
- Permit only short, bounded extrapolation before freezing/fading stale avatars.
- Do not update global React state per pose frame.
- Subscribe only to the active room's spatial rows.
- Add distance-based frequency reduction only if later room sizes require it.

## 7. Media Adapter

### Direct and HLS

The spatial screen should own an HTML `video` element suitable for a Three.js `VideoTexture`, but it must consume the same canonical playback state and correction rules as the standard player.

Required adapter responsibilities:

- resolve the canonical source and uploaded-session reference;
- obtain authorized short-lived playback URL when needed;
- configure HLS/native HLS consistently;
- apply existing sync correction rules;
- prevent passive media events from claiming playback authority;
- publish controls only when `canControlPlayback` is true;
- expose autoplay-blocked, buffering, expired authorization, unsupported codec, and load failure states;
- keep audio local to the media element while projecting video to the cinema mesh;
- dispose textures, media sources, and HLS workers on exit/source change.

The current `DirectMediaPlayer` is evidence and likely extraction input, not a component to mount invisibly and manipulate indirectly.

### Uploaded media security

```text
Spatial screen requests active uploaded source
        ↓
Existing room-media session reference
        ↓
canWatchRoomMedia authorization
        ↓
Short-lived playback URL response
        ↓
HTML video element
        ↓
Three.js VideoTexture
```

Permanent private object URLs must not enter SpacetimeDB pose/session state, queue state, scene manifests, logs, or client persistence.

### YouTube

Deferred. The iframe cannot be treated as an accessible video texture. A later Quest spike may compare DOM overlay, a synchronized 2D fallback, or not supporting YouTube inside immersive mode.

### Screen sharing

Deferred as a separate WebRTC/live-stream source type with its own session authority, distribution, moderation, and cleanup.

## 8. Spatial UI Contract

### `OPEN_SYSTEM_MENU`

This is a local action, never a SpacetimeDB reducer.

Input mappings:

- downward hand swipe after hand tracking is enabled;
- controller button or controller gesture;
- desktop keyboard shortcut;
- visible desktop Enter/Open Menu control.

Initial menu content:

- current title and playback status;
- permission-aware play/pause and essential transport;
- queue preview and next item;
- participant list with host/control state;
- spatial settings;
- Leave Spatial Mode.

Not required initially:

- every account setting;
- complete uploaded catalogue management;
- every host permission editor;
- complex queue reordering in mid-air;
- full desktop navigation.

### Placement and recovery

1. Spawn relative to head and dominant hand.
2. Place at a validated comfortable reading distance.
3. Face the user without excessive animation.
4. Become world-anchored after appearing.
5. Prevent pointer-through to world objects while modal interaction is active.
6. Provide **Bring Menu Here**.
7. Keep **Reset View/Height** separate from menu placement.
8. Reject or repair placement inside geometry, behind the user, beyond reach, or outside configured bounds.
9. Relocate or clearly signal the menu after a major teleport.

### Failure and feedback states

- gesture recognized/opening;
- hand tracking unavailable/fallback offered;
- invalid placement automatically recovered;
- command pending;
- permission denied;
- client disconnected or stale;
- media authorization expired/retrying;
- scene or asset load failed;
- XR session failed or ended unexpectedly.

## 9. Visual and Accessibility Direction

Spatial UI extends `DESIGN.md`'s Obsidian Lounge system:

- deep charcoal base;
- Signal Blue for live/technical focus and interaction;
- Signal Gold for host/authority and premium accents;
- thin light borders and controlled translucency;
- media-first hierarchy;
- restrained state-explaining motion;
- Signal Aperture identity used sparingly.

Before implementation, `DESIGN.md` needs an approved spatial appendix defining:

- world-unit panel sizes;
- angular text and target-size rules;
- preferred panel distance and height;
- spatial border, translucency, and contrast rules;
- controller/hand focus states;
- motion, easing, and reduced-motion behavior;
- seated and standing reach envelopes;
- comfort behavior during teleport and snap turn.

The Kenney Sci-fi UI pack must not replace these rules.

Accessibility requirements include controller and desktop equivalents for hand gestures, readable text without leaning, non-color state labels, reduced motion, seated reachability, clear focus/hover feedback, and recoverable exits.

## 10. Avatar V1

```text
SpatialAvatarRoot
├── portrait/avatar badge
├── dark backing disc or simple head marker
├── display name
├── host crown when applicable
├── left hand/controller when tracked
└── right hand/controller when tracked
```

- Use current `avatarKey` and avatar catalogue first.
- Keep the portrait recognizable; do not wrap it around a sphere.
- Nameplate fades or simplifies at distance.
- Host status is not color-only; use the existing crown and label semantics.
- Freeze/fade stale remote pose rather than extrapolating indefinitely.

## 11. Orbital Cinema Asset Direction

### Verified local source

`E:\Game_Assets\Kenney Game Assets All-in-1 3.5.0`

### Initial exact candidates

These are candidates, not approved scene assets. Native bounds, origin, triangle/material cost, and proposed scale must be measured in the asset-audit task.

| Role               | Candidate                                       | Pack              | Initial direction                      |
| ------------------ | ----------------------------------------------- | ----------------- | -------------------------------------- |
| Shell study        | `Models/GLB format/room-large.glb`              | Modular Space Kit | Compare against custom assembly        |
| Wider shell study  | `Models/GLB format/room-wide.glb`               | Modular Space Kit | Alternative starting volume            |
| Modular floor      | `Models/GLB format/template-floor-big.glb`      | Modular Space Kit | Likely repeated/merged                 |
| Modular wall       | `Models/GLB format/template-wall.glb`           | Modular Space Kit | Material remap required                |
| Entrance           | `Models/GLB format/gate-door-window.glb`        | Modular Space Kit | Lobby/cinema threshold                 |
| Primary seat       | `Models/GLB format/chair-armrest-headrest.glb`  | Space Station Kit | First cinema-seat candidate            |
| Seat alternative   | `Models/GLB format/chair-cushion-headrest.glb`  | Space Station Kit | Compare comfort silhouette             |
| Raised floor       | `Models/GLB format/balcony-floor.glb`           | Space Station Kit | Tiered seating candidate               |
| Rail               | `Models/GLB format/balcony-rail.glb`            | Space Station Kit | Edge protection/visual boundary        |
| Stairs/ramp        | `Models/GLB format/stairs-ramp.glb`             | Space Station Kit | Prefer comfort-safe navigation         |
| Host display       | `Models/GLB format/display-wall-wide.glb`       | Space Station Kit | Decorative/control-frame candidate     |
| Host terminal      | `Models/GLB format/computer-wide.glb`           | Space Station Kit | Host station candidate                 |
| Screen frame       | `Models/GLB format/screen-flat.glb`             | Factory Kit       | Must not constrain actual video aspect |
| Side display       | `Models/GLB format/screen-panel-wide.glb`       | Factory Kit       | Decorative status panel                |
| Rear lounge        | `Models/GLTF format/loungeDesignSofa.glb`       | Furniture Kit     | Social seating                         |
| Lounge corner      | `Models/GLTF format/loungeDesignSofaCorner.glb` | Furniture Kit     | Modular lounge layout                  |
| Coffee table       | `Models/GLTF format/tableCoffee.glb`            | Furniture Kit     | Decorative/static                      |
| Exterior craft     | `Models/GLTF format/craft_speederA.glb`         | Space Kit         | Sparse exterior motionless silhouette  |
| Exterior meteor    | `Models/GLTF format/meteor_detailed.glb`        | Space Kit         | Sparse distant scenery                 |
| Exterior equipment | `Models/GLTF format/satelliteDish_detailed.glb` | Space Kit         | Observation-deck detail                |

The inspected Space Kit supports craft, meteors, rockets, corridors, and satellite equipment; it should not be assumed to contain a finished planet backdrop. Planets/stars may require a lightweight sky treatment or separately approved asset.

### Golden environment contract

```ts
interface CinemaEnvironmentDefinition {
  id: string;
  sceneAsset: string;
  spawnAnchor: string;
  screenAnchor: string;
  hostPanelAnchor: string;
  queuePanelAnchor: string;
  seatAnchors: string[];
  teleportAnchors: string[];
  collisionObjects: string[];
  lightingPreset: string;
  skyPreset: string;
  audioPreset?: string;
}
```

Illustrative only. Final contract follows the golden-room findings.

## 12. Starting Performance Hypotheses

These are measurement targets, not permanent acceptance truths.

| Area                             | Starting hypothesis                                                           |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Quest refresh target             | 72 Hz minimum for the first supported device                                  |
| Frame budget                     | 13.9 ms maximum per rendered frame at 72 Hz; preserve headroom where possible |
| Video textures                   | One active cinema video texture                                               |
| Dynamic shadow-casting lights    | Zero initially                                                                |
| Dynamic lights                   | Zero to one, with baked/unlit/emissive presentation preferred                 |
| Visible scene triangles          | Begin below approximately 250k; validate on hardware                          |
| Draw calls                       | Begin below approximately 100; measure actual stereo/WebXR reporting          |
| Scene materials                  | Minimize and merge; initial review threshold approximately 50                 |
| Initial compressed scene payload | Target below approximately 25 MB before media                                 |
| Remote avatars                   | Validate four first; design for eight                                         |
| Pose publication                 | 10-15 Hz per active spatial client                                            |
| Interpolation buffer             | Start around 100-150 ms and tune from measured jitter                         |
| Playback drift                   | Preserve current sync thresholds; no looser spatial-only authority            |

Instrumentation from the primitive prototype should record frame time, long frames, draw calls, triangles, texture/material count, scene load time, pose send/receive rate, interpolation delay, active avatars, video drift, and menu-opening spikes.

## 13. Proposed Module Shape

Exact names must follow the completed TASK-007 architecture.

```text
components/room/spatial/
├── spatial-room-presentation.tsx
├── scene/
├── avatars/
├── media/
├── interaction/
├── locomotion/
├── ui/
└── diagnostics/

lib/spatial/
├── contracts.ts
├── pose-interpolation.ts
├── local-preferences.ts
├── environment-definition.ts
└── performance-budget.ts

lib/spacetime/spatial/
├── types.ts
├── subscriptions.ts
└── commands.ts
```

Generated SpacetimeDB bindings remain generated and are not hand edited.

## 14. Edge Cases

- WebXR unsupported or permission denied.
- Headset removed or XR session ends unexpectedly.
- Hand tracking disappears during a swipe.
- Menu opens inside geometry or behind the user.
- Two users claim the same seat simultaneously.
- Spatial session becomes stale while Watch membership remains valid.
- Same account opens two spatial clients.
- Host changes playback while another client is loading the video texture.
- Playback permission is revoked while controls are open.
- Uploaded playback URL expires during viewing.
- CORS or codec prevents video texture playback.
- Autoplay requires a user gesture.
- Scene GLB partially fails or exceeds memory.
- Remote pose packets arrive late or out of order.
- User teleports while the menu is open.
- User exits Spatial Cinema during a reducer or media request.
