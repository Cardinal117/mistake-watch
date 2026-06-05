# Tasks: Playback Stability and Listen Performance

## Task 1: Atomic Autoplay Reducer

Suggested files:
- `spacetime/src/index.ts`
- `lib/spacetime/use-live-room.ts`
- `lib/spacetime/generated/*`
- `tests/queue/model.test.mjs`
- `tests/spacetime/*.test.mjs`

Work:
- Add a SpacetimeDB reducer for atomic autoplay advancement.
- Preserve queue-mode selection semantics.
- Skip unavailable items.
- Set the next item and session playback state to playing at position 0 in one reducer call.
- Regenerate TypeScript bindings.
- Update the frontend live-room adapter to use the atomic reducer for autoplay.

Review checkpoint:
- Confirm no intermediate `paused` session state is emitted during autoplay.
- Confirm current, played, and queued item statuses stay correct.

Safe commit point:
- After local SpacetimeDB publish, generated bindings, reducer tests, typecheck, and lint pass.

## Task 2: YouTube Transition Guard

Suggested files:
- `components/room/youtube-media-player.tsx`
- `lib/player/youtube-autoplay-continuity.ts`
- `tests/player/youtube-autoplay-continuity.test.mjs`

Work:
- Add a source-transition guard around autoplay and manual source changes.
- Suppress old-source player events during handoff.
- Pause or neutralize the old source before applying the new canonical source.
- Keep "Resume playback" behavior for real autoplay blocks.

Review checkpoint:
- Confirm the next song starts without a split-second old-song spike.
- Confirm YouTube errors still advance or surface correctly according to existing rules.

Safe commit point:
- After player tests and manual browser QA against a small queue pass.

## Task 3: Non-Controller Listen Sync Policy

Suggested files:
- `components/room/youtube-media-player.tsx`
- `lib/player/sync.ts`
- `tests/player/sync.test.mjs`

Work:
- Remove or relax the unauthorized YouTube micro-correction branch.
- Use listen-mode YouTube tolerance for non-controller guests.
- Avoid repeated sub-second seek/play corrections.
- Keep source-change and meaningful-drift correction intact.

Review checkpoint:
- Confirm a mobile member without playback permission can listen smoothly.
- Confirm a non-permissioned user who manually seeks is still corrected back after meaningful drift.

Safe commit point:
- After sync tests and at least one two-device manual listen-room test.

## Task 4: Queue Drawer Lazy Render and Virtualization

Suggested files:
- `components/room/listen-mode-layout.tsx`
- `components/room/queue-panel.tsx`
- optional queue virtualization helper under `lib/` or `components/`

Work:
- Closed drawer renders only compact bar/count/handle.
- Open drawer mounts details.
- Render only visible rows for long queue/history lists, or apply a clear row cap with progressive rendering if virtualization is too risky.
- Do not fetch metadata for hidden rows.

Review checkpoint:
- Confirm opening a 30-plus item queue is responsive.
- Confirm queue/history filters, play buttons, pinning, remove, reorder, and search still work.

Safe commit point:
- After queue tests, browser QA, and profiler evidence or timing notes.

## Task 5: Sidebar and Panel Visibility Budget

Suggested files:
- `components/room/listen-mode-layout.tsx`
- `components/room/members-panel.tsx`
- related sidebar rail components

Work:
- Collapsed right sidebar renders only the rail avatars/initials/count.
- Full member controls mount only when expanded.
- Keep active/idle ordering and host/member display intact.
- Avoid duplicate hidden member lists.

Review checkpoint:
- Confirm collapsed sidebar no longer carries full member-card render cost.
- Confirm permission controls and kick/remove still work when expanded.

Safe commit point:
- After member interaction browser QA passes.

## Task 6: Mobile and Reduced-Motion Visual Budget

Suggested files:
- `components/room/listen-mode-layout.tsx`
- `app/globals.css`
- visual helper components used by listen mode

Work:
- Disable heavy waveform/background animations on mobile.
- Respect `prefers-reduced-motion`.
- Pause offscreen animations where practical.
- Keep current player artwork and essential dynamic theme visible.

Review checkpoint:
- Confirm mobile keeps the intended listen design without expensive background visuals.
- Confirm desktop still has the premium dynamic visual feel.

Safe commit point:
- After mobile browser QA and visual inspection.

## Task 7: Metadata and Thumbnail Work Reduction

Suggested files:
- `lib/youtube/use-youtube-metadata.ts`
- `lib/youtube/metadata-client.ts`
- `components/room/listen-mode-layout.tsx`
- `components/room/queue-panel.tsx`

Work:
- Ensure metadata requests are shared by video ID.
- Defer metadata for hidden/offscreen rows.
- Eager-load only current, next, and visible recommendation thumbnails.
- Lazy-load history and hidden drawer thumbnails.

Review checkpoint:
- Confirm visible metadata still resolves.
- Confirm hidden queue/history content does not trigger unnecessary metadata bursts.

Safe commit point:
- After metadata tests and browser network inspection.

## Final Task: QA, Publish, and Deployment Gate

Work:
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run relevant tests:
  - `npm run test:sync`
  - `npm run test:queue`
  - `npm run test:youtube`
  - `npm run test:spacetime` when reducer changes are included.
- Run SpacetimeDB build/generate/local publish.
- Run production SpacetimeDB publish only after local verification.
- Run `npm run build`.
- Perform browser QA:
  - desktop host plus mobile guest without playback permission;
  - queue autoplay through at least three YouTube items;
  - closed/open drawer performance with a large playlist;
  - collapsed/expanded members rail;
  - mobile listen mode.
- Update `implementation-report.html`.
- Use `qa-release-gate` before commit prep.
- Use `git-commit-assistant` only after QA passes and the user asks.

Review checkpoint:
- Confirm acceptance criteria are met or blockers are documented.
- Confirm production deploy is separate approval unless the user explicitly requests it.
