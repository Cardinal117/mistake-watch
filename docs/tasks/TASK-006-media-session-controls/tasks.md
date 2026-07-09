# Tasks: Media Session Controls

## Task 1: Media Session Helper

Suggested files:

- `lib/player/media-session.ts`
- `tests/player/media-session.test.mjs`

Work:

- Add browser-safe feature detection for `navigator.mediaSession` and `MediaMetadata`.
- Add metadata normalization for title, artist, album, artwork, playback state, duration, and position.
- Add safe action binding helpers for supported Media Session actions.
- Add cleanup helpers that unset action handlers on unmount or permission changes.
- Add tests for unsupported browsers, unsupported actions, and metadata normalization.

Review checkpoint:

- Helper code does not import React and does not depend on live room internals.
- Unsupported browser behavior is a no-op.

Safe commit point:

- Helper and tests compile and pass without changing room behavior.

## Task 2: Room Hook And Transport Wiring

Suggested files:

- `components/room/use-room-media-session.ts`
- `components/room/transport-controls.tsx`
- `tests/player/media-session.test.mjs`

Work:

- Add a hook that maps existing transport state into Media Session metadata.
- Call the hook from `TransportControls`.
- Wire play, pause, seek, seekbackward, seekforward, nexttrack, and previoustrack through the same live-room actions used by visible controls.
- Bind mutating action handlers only when `liveRoom.canControlPlayback` is true.
- Keep non-controller metadata display allowed, but do not let media keys publish canonical room state for unauthorized users.

Review checkpoint:

- Media-key handlers cannot bypass room permissions.
- The hook does not create a second playback state authority.

Safe commit point:

- Browser metadata updates and media keys work in supported desktop Chromium with existing room behavior intact.

## Task 3: Artwork And Uploaded-Media Safety

Suggested files:

- `components/room/use-room-media-session.ts`
- `lib/player/media-session.ts`
- `lib/media/uploaded-playback-reference.ts`
- `tests/player/media-session.test.mjs`

Work:

- Prefer provider thumbnails for public YouTube metadata.
- Use known-safe uploaded poster/artwork only if it does not expose signed playback URLs, permanent R2 media URLs, or object keys.
- Use app icon fallback artwork for private uploaded media when safe artwork cannot be proven.
- Add static tests that uploaded playback references and signed URLs are not used as artwork URLs.

Review checkpoint:

- Private uploaded media does not leak through browser media metadata.

Safe commit point:

- Uploaded/direct/HLS metadata is useful without weakening TASK-002.8J security boundaries.

## Task 4: QA, Documentation, And Commit Prep

Suggested files:

- `docs/tasks/TASK-006-media-session-controls/review-notes.md`
- `docs/tasks/TASK-006-media-session-controls/implementation-report.html`

Work:

- Run `node --test tests\player\*.test.mjs` or the relevant focused test command.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Manually QA in a Chromium browser with media controls.
- Manually QA in Opera GX sidebar if available.
- Test YouTube, direct/HLS, and uploaded room media paths.
- Verify a guest or non-controller cannot mutate room playback through media keys.
- Use `qa-release-gate` before commit prep.
- Use `git-commit-assistant` after QA passes.

Review checkpoint:

- Browser/provider limitations are documented.
- QA evidence separates verified behavior from best-effort browser behavior.

Safe commit point:

- Commit after QA passes and the commit report is approved.
