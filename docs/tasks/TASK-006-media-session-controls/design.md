# Design Spec: Media Session Controls

## Technical Approach

Implement Media Session API support as a small client-only layer that reads the existing live room snapshot and transport state. The hook should not own playback logic. It should translate existing room state into browser media metadata and delegate media-key actions back to existing `liveRoom` methods.

Recommended module:

- `lib/player/media-session.ts`
  - feature detection helpers;
  - metadata normalization;
  - safe action binding with `try/catch`;
  - cleanup helpers for action handlers;
  - position-state throttling helpers if needed.

Recommended hook:

- `components/room/use-room-media-session.ts`
  - receives room, live room state, current position, current queue item, next/previous queue item, and duration;
  - publishes `navigator.mediaSession.metadata`;
  - updates `navigator.mediaSession.playbackState`;
  - calls `navigator.mediaSession.setPositionState(...)` when supported;
  - binds actions only when `liveRoom.canControlPlayback` is true.

Primary integration point:

- `components/room/transport-controls.tsx`
  - already derives current title, current position, duration, next/previous queue items, and can-control state;
  - already has play/pause/seek/next/previous handlers that route through live room state.

## UI / UX Approach

No visible UI change is required for the first version. This task improves browser/OS media surfaces and keyboard media keys.

Expected external UI where supported:

- title: current room item title;
- artist: queue item artist, YouTube channel, source label, or `Mistake Watch`;
- album: room name or `Mistake Watch`;
- artwork: provider thumbnail, safe uploaded poster, or app icon;
- playback state: playing, paused, or none;
- position state: duration and current position where known.

## Component / Module Structure

- `lib/player/media-session.ts`
  - Pure-ish helper utilities around browser Media Session API calls.
  - Should guard all browser globals and unsupported actions.
- `components/room/use-room-media-session.ts`
  - React hook that maps Mistake Watch room state into helper calls.
  - Cleans up action handlers on unmount.
- `components/room/transport-controls.tsx`
  - Calls the hook after deriving transport state.
- `tests/player/media-session.test.mjs`
  - Verifies metadata normalization, uploaded URL redaction rules, unsupported browser behavior, and static wiring.

## Data / State Needs

No new persisted data is required.

Inputs should come from existing state:

- room name and mode;
- live room session source title, source type, source URL, status, duration, and active queue item id;
- current queue item metadata;
- current position computed by existing transport sync math;
- next and previous queue items;
- `liveRoom.canControlPlayback`.

## Accessibility Notes

Media keys and OS controls are accessibility-relevant controls. They must follow the same authorization model as the visible transport controls.

- Authorized controllers may publish room playback changes.
- Unauthorized participants must not be able to mutate canonical playback through media keys.
- Unsupported actions must be unset or ignored rather than throwing runtime errors.

## Responsive Notes

No layout changes are expected. Browser/OS media surfaces are outside the app viewport and vary by platform.

## SEO / GEO Notes

No SEO changes. The metadata is runtime browser media metadata, not page metadata.

## Animation Notes

No animation changes.

## Edge Cases

- `navigator.mediaSession` is missing.
- `MediaMetadata` constructor is missing.
- Browser supports metadata but rejects a specific action handler.
- Current item has no duration.
- Current item has no thumbnail.
- YouTube iframe metadata competes with parent page metadata.
- Uploaded media has private or signed URLs that must not appear in artwork or metadata.
- Participant has no playback control permission.
- Queue is empty, so next/previous handlers should be unset.
