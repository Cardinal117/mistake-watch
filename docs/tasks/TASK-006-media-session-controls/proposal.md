# Proposal: Media Session Controls

## Problem

Mistake Watch currently behaves like a normal browser tab from the perspective of browser/OS media controls. When the app is pinned into Opera GX's sidebar, it does not publish a polished "now playing" identity or expose room-aware media-key actions like YouTube Music does.

Opera's built-in music player integrations are not the same as a standard website, so this task should not try to become a first-class Opera music service. The correct small web-standard improvement is Media Session API support.

## Goal

Add progressive Media Session API support for active room playback metadata and safe media-control handlers while preserving Mistake Watch's room-authoritative playback model.

## User Value

- Sidebar and browser media surfaces feel more app-like.
- Current song/video title and artwork are easier to identify outside the page.
- Media keys can control room playback where the participant already has permission.
- Uploaded/direct/HLS media gain a stronger "real media app" feel.

## Scope

- Add a client-only Media Session helper/hook.
- Publish title, artist/source, album/room name, artwork, playback state, and position state where supported.
- Bind supported action handlers for play, pause, seek, seek backward, seek forward, next track, and previous track.
- Respect `liveRoom.canControlPlayback` before mutating room state.
- Use safe artwork fallbacks for uploaded/private media.
- Add focused tests for helper behavior and static wiring.
- Document browser/provider limitations in review notes.

## Non-Goals

- Native Opera GX Music Player service integration.
- Native desktop/mobile application integration.
- Background playback guarantees.
- YouTube background playback bypasses.
- DRM or restricted provider playback changes.
- Any Supabase, SpacetimeDB schema, R2, or upload pipeline changes.
- Any visual redesign of the room UI.

## Risks

- Media Session API support is browser-dependent and should be treated as progressive enhancement.
- YouTube iframe behavior may conflict with parent-page metadata.
- Position state updates can be noisy if updated too frequently.
- Media-key handlers can become a security/control issue if they ignore room permissions.
- Uploaded media artwork can accidentally expose private media URLs if implemented carelessly.

## Success Criteria

- Supported browsers receive useful Mistake Watch media metadata for the active room item.
- Unsupported browsers continue normal playback with no user-visible error.
- Media key actions are permission-aware and route through existing room playback controls.
- Uploaded media metadata does not include signed playback URLs, permanent R2 URLs, or private object keys.
- Existing YouTube, direct, HLS, uploaded playback, queue, and room sync behavior remain intact.
