# TASK-005 Mobile PWA Playback Design

## Technical Approach

Use progressive enhancement:

1. Keep the existing web app as the source of truth.
2. Improve the manifest, icons, theme color, and standalone viewport behavior.
3. Add a conservative service worker only for static shell assets, not dynamic room/auth/API responses.
4. Add Media Session API integration in the player layer.
5. Add mobile visibility/resync handling so returning from background lands cleanly on canonical room state.

## PWA Shell

- Confirm `public/site.webmanifest` includes correct name, short name, start URL, display mode, theme/background colors, and production icon assets.
- Add installability checks for production.
- Avoid aggressive offline behavior for room pages until room-state caching is explicitly designed.
- Ensure standalone mode respects safe-area insets.

## Media Session Integration

Media Session metadata should include:

- title
- artist/channel/source label
- artwork when available
- source type

Supported actions should be permission-aware:

- play/pause: local follow first; room mutation only if the member can control playback.
- previous/next: only active when the member can control playback or when local-only behavior is clearly allowed.
- seek: direct/R2 media only if safe; YouTube iframe support may be limited.

## Background Behavior

Expected behavior by source:

- Direct/R2 audio/video: best candidate for lock-screen and background audio support.
- HLS: likely support depends on browser/device.
- YouTube iframe: do not promise background playback.

When returning from background:

- resubscribe/reconnect if needed.
- reapply canonical source.
- seek to expected canonical time.
- avoid duplicate autoplay/replay loops.

## Mobile UI Approach

- Keep the media stage dominant.
- Bottom controls should be thumb-friendly, compact, and stable.
- Queue should remain a sheet pattern.
- Audience/chat should remain readable without covering critical controls.
- Account access should remain available from the top-level chrome and room HUD.

## Security And Permissions

- PWA controls must respect the same permission model as in-room controls.
- Guests can locally resume playback when required by browser policy.
- Guests without playback permission must not publish room playback state.

## Edge Cases

- Installed app launched from cold start.
- App resumes after phone lock.
- Network switches from Wi-Fi to mobile data.
- Room closed while app is backgrounded.
- Member kicked while app is backgrounded.
- YouTube autoplay/background restriction.

