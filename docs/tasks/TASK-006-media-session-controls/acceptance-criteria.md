# Acceptance Criteria: Media Session Controls

## Functional Requirements

- Supported browsers receive Media Session metadata for the active room item.
- Metadata includes title, artist/source fallback, album/room fallback, playback state, and artwork when safe.
- Position state is provided when duration and position are known and the browser supports it.
- Play and pause media-key actions route through existing room playback state updates.
- Seek actions route through existing room playback state updates.
- Next and previous actions route through existing queue item playback actions when those items exist.
- Unsupported browsers or unsupported actions do not throw visible runtime errors.

## Visual Requirements

- No visible app UI change is required.
- Existing room transport controls remain visually unchanged.
- Browser/OS media UI should show recognizable Mistake Watch media metadata where supported.

## Responsive Requirements

- No viewport layout changes are introduced.
- The enhancement works from desktop room layouts and sidebar-sized Opera GX usage where browser support allows.

## Accessibility Requirements

- Media-key actions honor the same playback permissions as visible transport controls.
- Unauthorized participants cannot mutate canonical live room playback through browser media controls.
- Browser action handlers are removed or disabled when the user loses playback control.

## Performance Requirements

- Metadata updates are scoped to meaningful playback/session changes.
- Position state updates are throttled or tied to the existing transport clock so they do not create avoidable render or browser API churn.
- No new network requests are required only to populate Media Session metadata.

## Error State Requirements

- Missing Media Session support is a no-op.
- Missing artwork falls back to a safe app icon or empty artwork.
- Missing duration skips position state rather than sending invalid values.
- YouTube iframe metadata conflicts are documented instead of treated as implementation failure.

## Security Requirements

- Media Session metadata must not include signed R2 playback URLs.
- Media Session metadata must not include permanent uploaded media playback URLs.
- Media Session metadata must not include R2 object keys, source object keys, or private storage identifiers.
- Uploaded private media uses safe fallback artwork unless safe poster delivery is already proven.

## Must Not Break

- YouTube playback.
- Direct media playback.
- HLS playback.
- Uploaded room-session playback.
- Queue play next/previous behavior.
- SpacetimeDB room-authoritative playback state.
- TASK-002.8J uploaded-media security boundaries.
