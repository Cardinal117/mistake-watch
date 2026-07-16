# Brain Dump: Spatial Cinema Foundations

## Task Name

TASK-008 Spatial Cinema Foundations

## Status

Opening direction packet. This records the intended product and architecture before implementation. No implementation slice is approved by the existence of this packet.

## Grand Idea

Mistake Watch should regain the spatial cinema idea that preceded the current application, but as a clean rewrite inside the mature Watch platform.

The historical prototype proved that browser-based users could join and leave a shared 3D room, move with keyboard and mouse, see synchronized player presence, and gather around a large cinema screen using SpacetimeDB. It also experimented with YouTube playback, screen sharing, and a shared browser. The experiment was abandoned because presence, 3D rendering, provider restrictions, playback synchronization, and live streaming were being solved simultaneously without the room authority and media architecture Mistake Watch now has.

The new direction is not to salvage the old implementation. The old repository is historical evidence and inspiration only:

- GitHub: `Cardinal117/spacetime-viewing`
- Local reference: `C:\Users\Admin\Documents\WebProjects\spacetime-viewing`

The current product supplies the missing foundation:

- authoritative playback and queue state;
- host and member permissions;
- durable room and account data;
- guest-first identity;
- uploaded-media authorization;
- Watch, Listen, and listen-TV presentations;
- tested synchronization rules;
- a disciplined spec-first workflow.

The intended product equation is:

```text
Historical 3D multiplayer idea
        +
Current Mistake Watch authority and media systems
        =
Spatial Cinema
```

## Product Model

Spatial Cinema is a presentation available from an existing Mistake Watch room. It is not a second room system, a separate account system, an iframe application, or a replacement for Watch Mode.

```text
One authoritative Mistake Watch room
├── Standard Watch presentation
├── Listen presentation
│   └── TV presentation
├── Desktop 3D presentation
└── Quest/WebXR presentation
```

Each participant chooses their own presentation. A Quest user, a desktop 3D user, and a standard Watch user must be able to remain in the same room, consume the same queue, and obey the same host authority.

Entering or leaving Spatial Cinema must not rejoin, reset, or leave the Watch room.

## Non-Negotiable Spatial Interaction

The signature interaction is a downward hand swipe that summons the main spatial interface, inspired by the immediacy of Sword Art Online's system-menu gesture.

The product contract is:

> A downward swipe always provides access to the main spatial interface.

The gesture maps to a local abstract action:

```text
Downward hand gesture ─┐
Controller fallback ───┼── OPEN_SYSTEM_MENU
Keyboard shortcut ─────┤
Desktop button ────────┘
```

The gesture is guaranteed. Hand tracking is not the only access method. Controller, keyboard, and desktop controls are mandatory fallbacks.

The summoned menu should provide the complete spatial control home over time. The first proof only needs playback controls, queue preview, participants, spatial settings, and Leave Spatial Mode. It must support Close, Bring Menu Here, and Reset View/Height. A wrist queue drawer remains a desirable quick-action surface later, but it must not replace the summoned system menu.

## Avatar Direction

The first spatial avatars should be deliberately simple:

- a floating circular portrait or current Mistake Watch avatar badge;
- display name above or near the portrait;
- existing host crown overlay for the host;
- optional controller/hand representations when tracking is available;
- no full body in the first vertical slice.

The portrait should remain readable rather than being stretched around a sphere. The current live-room contract broadcasts `avatarKey`, not arbitrary account avatar URLs, so the safest first implementation is based on the existing hardware-avatar catalogue. Profile-photo synchronization is a later decision unless a privacy-safe live participant contract is added deliberately.

## Technology Direction

Proposed spatial client stack, subject to a version-compatibility spike before dependency approval:

- existing Next.js, React, and TypeScript application;
- Three.js;
- `@react-three/fiber`;
- `@react-three/drei`;
- `@react-three/xr`;
- WebXR for Quest Browser;
- existing SpacetimeDB room connection and authority;
- existing Supabase durable identity and preferences;
- GLB/glTF environment assets.

React Three Fiber is preferred because Spatial Cinema remains a presentation in the existing React application. Meta's Immersive Web SDK may be researched for useful patterns but should not become the default foundation without a focused comparison. A-Frame and a separate game-engine application are not the default direction.

## Data Ownership Intent

### Existing shared authority, reused unchanged

- playback state and synchronization;
- active media source;
- queue and queue mutations;
- room membership and participant permissions;
- chat;
- room errors and connection state;
- uploaded-media session authorization.

### New shared transient spatial state in SpacetimeDB

- active spatial sessions;
- head pose;
- optional hand/controller poses;
- atomic seat claims;
- temporary shared reactions;
- last activity and cleanup information.

### Local ephemeral state

- menu visibility and placement;
- wrist-panel visibility;
- hovered targets and pointer rays;
- gesture-recognition state;
- locomotion state;
- snap turning;
- interpolation buffers;
- personal volume;
- graphics quality;
- recenter state.

### Local persistence with optional signed-in profile synchronization later

- dominant menu hand;
- gesture sensitivity;
- snap-turn angle;
- comfort settings;
- reduced-motion preference;
- graphics preference;
- spatial accessibility settings.

Guest users must not require Supabase profile persistence to retain usable local settings.

For the first vertical slice, Orbital Cinema is fixed. Environment selection is not shared state yet.

## Media Direction

The spatial screen consumes the existing authoritative media state.

Direct, HLS, and authorized R2/uploaded media are the first-class initial sources because an HTML media element can supply a Three.js video texture while the existing playback synchronization contract remains authoritative.

Private uploaded media must continue through the existing room-media session and short-lived playback URL path. Spatial Cinema must never place permanent private R2 URLs into live state.

YouTube is explicitly deferred. The YouTube iframe API does not expose the underlying media element for use as a WebGL texture. DOM overlay or a Quest-browser fallback requires a separate hardware spike and must not be represented as guaranteed projection support.

Screen sharing is explicitly deferred. It is a live WebRTC distribution problem, not synchronized file playback, and must become a separate media source/transport subsystem later.

## Environment Direction

The first environment is **Orbital Cinema**.

Development order:

1. Code-generated primitive blockout for scale, locomotion, interaction, media, pose, and Quest performance.
2. One manually authored golden Orbital Cinema assembled from Kenney GLBs.
3. Named anchors, simplified colliders, material remapping, mesh merging/instancing, and texture optimization.
4. Only after the golden room is validated, extract a repeatable Blender/build pipeline and environment manifest.

Local asset source:

`E:\Game_Assets\Kenney Game Assets All-in-1 3.5.0`

Verified relevant packs include Space Station Kit, Modular Space Kit, Factory Kit, Furniture Kit, Space Kit, Nature Kit, Fantasy Town Kit, Modular Dungeon Kit, Retro Fantasy Kit, Retro Urban Kit, City kits, Mini Arcade, Pirate Kit, and Graveyard Kit.

Theme roadmap:

1. Orbital Cinema;
2. Midnight Forest Theatre;
3. Arcane Grand Hall;
4. Industrial Screening Bay;
5. Neon Rooftop;
6. seasonal or later Pirate Cove and Haunted Theatre.

The Kenney Sci-fi UI pack is reference material, not the spatial product skin. Spatial panels must extend the existing Obsidian Lounge design language.

## First Vertical Slice

> Two people enter the same existing Mistake Watch room through desktop 3D and/or Quest WebXR, see smoothly interpolated avatar heads, claim seats, watch one authorized R2/direct source on the cinema screen, and summon a compact spatial system menu through the guaranteed downward-swipe contract and its fallbacks.

The slice deliberately excludes YouTube projection, screen sharing, voice chat, full bodies, physics, public worlds, character customization, complex locomotion, and multiple finished environments.

## Input Sources Preserved

- `C:\Users\Admin\.codex\attachments\d3a15b10-bdf4-44cf-bdcd-0b11775eb171\pasted-text.txt`
- `C:\Users\Admin\.codex\attachments\bbd0100e-f054-4e72-854f-1e142964d8d9\pasted-text.txt`
- `C:\Users\Admin\.codex\attachments\ed79a38a-b96d-478f-9e73-5fa20559151e\pasted-text.txt`
- `C:\Users\Admin\.codex\attachments\88b39aa1-8ad1-4bec-abec-d9c448c1ddf4\pasted-text.txt`
- `C:\Users\Admin\.codex\attachments\a95a999f-119c-41a0-9c9b-d9ff3d0fc3a2\pasted-text.txt`

## Unknowns To Resolve Before Implementation Approval

- Minimum supported Quest model and Quest Browser version.
- Final package versions compatible with the post-refactor React/Next.js application.
- Exact entry point and route transition for entering Spatial Cinema.
- Whether desktop 3D initially uses seat selection only or also limited WASD movement.
- Exact hand-swipe recognition thresholds and dominant-hand behavior.
- Initial participant test ceiling: four is recommended for the first proof; eight should be an architectural target.
- Final panel distance, angular size, target dimensions, and spatial typography rules.
- Exact measured GLB bounds, material counts, triangle counts, and shortlist approval.
- Whether signed-in account avatar URLs should ever be propagated into live spatial presence.
