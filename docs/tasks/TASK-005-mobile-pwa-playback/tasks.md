# TASK-005 Mobile PWA Playback Tasks

## 1. Installability Audit

- Review `public/site.webmanifest`, icons, `app/layout.tsx`, and metadata.
- Validate production installability on Chrome Android and desktop Chrome.
- Confirm standalone start URL returns the dashboard without auth or redirect loops.

## 2. Safe PWA Shell

- Add or refine service worker behavior for static assets only.
- Exclude room state, auth callback, Supabase/API, SpacetimeDB, and media upload endpoints from caching.
- Add a clear update strategy so stale app shells do not trap users.

## 3. Media Session API

- Add a player-level helper for `navigator.mediaSession`.
- Populate title, artist, source, and artwork from active media.
- Wire play/pause/seek/next/previous handlers with permission checks.
- Ensure passive viewers can resume local playback without publishing room state.

## 4. Mobile Room Ergonomics

- Review watch/listen room mobile layouts in standalone mode.
- Tighten safe-area spacing for top HUD and bottom transport.
- Confirm queue and audience sheets do not block essential controls.
- Ensure account/settings access is reachable but not duplicated.

## 5. Background And Resume QA

- Test direct/R2 media on Android and iOS.
- Test YouTube iframe behavior and document limitations.
- Test screen lock, app switch, network switch, and return-to-room resync.
- Confirm kicked/removed members return to a clean dashboard state.

## 6. Documentation And Release Notes

- Document supported behavior by browser/source.
- Add user-facing fallback copy for unsupported background playback.
- Update task review notes with tested devices and known limits.

