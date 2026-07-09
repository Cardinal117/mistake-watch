# Brain Dump: Media Session Controls

## Task Name

Media Session Controls for Opera GX sidebar and browser media UI.

## Goal

Add a small quality-of-life layer so Mistake Watch can publish current playback metadata and respond to supported browser or OS media controls through the Media Session API.

## Why It Matters

The user added Mistake Watch to the Opera GX sidebar and wants it to feel closer to YouTube Music by updating browser-level media surfaces with the active title, artwork, playback state, and media-key controls where the browser supports it.

## User Flow

- User opens a room in Opera GX, Chrome, or another Chromium browser.
- User starts a YouTube, direct, HLS, or uploaded room item.
- Browser or OS media controls show a useful Mistake Watch title and artwork instead of generic page information.
- Play, pause, seek, next, and previous controls work when the current room participant has playback authority.
- Unsupported browsers or unsupported actions fail silently without breaking playback.

## Requirements

- Use the browser Media Session API as a progressive enhancement.
- Start with listen/watch transport state rather than a random UI component.
- Publish metadata without leaking uploaded media playback URLs.
- Bind action handlers only when room permissions allow the participant to control playback.
- Keep YouTube iframe limitations explicit because the iframe may compete with or override parent-page media session metadata.

## Existing Files / Components

- `components/room/transport-controls.tsx`
- `components/room/direct-media-player.tsx`
- `components/room/youtube-media-player.tsx`
- `components/room/listen-mode-layout.tsx`
- `components/room/watch-mode-layout.tsx`
- `lib/player/source.ts`
- `lib/spacetime/use-live-room.ts`
- `lib/media/uploaded-playback-reference.ts`

## Constraints

- Do not add database tables, Supabase migrations, or auth changes.
- Do not claim first-class Opera GX Music Player service integration.
- Do not persist private uploaded playback URLs or signed R2 URLs in metadata.
- Do not allow media keys to bypass host/member playback permissions.
- Do not break existing YouTube/direct/HLS/uploaded playback sync.

## Acceptance Ideas

- Chrome/Opera media overlay shows current title and artwork where supported.
- Keyboard media keys can play/pause and move next/previous only for authorized controllers.
- Guests without playback control do not mutate live room state through media keys.
- Uploaded-media metadata uses safe artwork only and never includes a private playback URL.
- Existing tests and build remain green.

## Unknowns

- How consistently Opera GX exposes Media Session metadata for custom sidebar sites.
- Whether YouTube iframe metadata wins over parent-page metadata in Opera GX sidebar mode.
- Whether uploaded poster URLs are safe enough for artwork before thumbnail delivery is separately hardened.
