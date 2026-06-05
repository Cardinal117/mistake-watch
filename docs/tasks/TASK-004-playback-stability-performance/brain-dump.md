# Brain Dump: Playback Stability and Listen Performance

## Task Name
Playback Stability and Listen Performance

## Goal
Fix two audio-experience problems and define a performance pass that keeps Mistake Watch responsive as listen rooms grow:

- non-controller mobile listeners can stutter when they do not have playback permission;
- autoplay transitions can briefly emit the old YouTube song before the next queue item starts;
- listen mode is becoming heavy because hidden drawers, sidebars, waveforms, metadata hooks, thumbnails, and long queue lists can still render or animate.

## Why It Matters
Mistake Watch is a synced media product. Audio instability is a core-product failure, not a minor UI issue. Performance also matters because the app is now handling provider metadata, real-time room state, queue drawers, waveform visuals, recommendation cards, members, permissions, and mobile layouts at the same time.

The user explicitly approved:

- a clean atomic SpacetimeDB autoplay reducer approach;
- a project-wide performance pass based on game-design logic: what is not visible should not be rendered;
- turning off heavy visuals on mobile where they will not be seen;
- lazy-rendering drawer/sidebar content only when needed;
- splitting this into two tasks: playback transition stability first, then listen-mode performance.

## User Observations
- Phone joined a PC-hosted room as a member.
- Audio sync was good overall.
- When the phone member did not have playback permission, mobile audio appeared to keep pausing and playing.
- Granting that member playback permission made the audio stable.
- When a next queue song starts, the app can play a split second of the just-finished song, causing an audio spike.

## Current Diagnosis
- `components/room/youtube-media-player.tsx` has an extra non-controller correction path. It uses stricter thresholds than the shared listen-mode sync policy and can overcorrect YouTube iframe drift on mobile.
- `lib/spacetime/use-live-room.ts` currently advances autoplay with two reducer calls: `playQueueItem` then `setPlaybackState`.
- `spacetime/src/index.ts` `play_queue_item` sets the selected item as the source but leaves session status as `paused`; the second frontend call flips status to `playing`.
- That two-step state transition creates an intermediate state that can briefly let clients handle old-source and new-source events in the same handoff window.

## Performance Requirements From User
- Hidden UI should not render simply because it exists in the layout.
- Mobile should not render waveforms that are not meaningfully visible.
- Queue drawers should render only the on-screen images/content needed; hidden details should not mount until visible.
- Sidebars and drawers should lazy-render heavy panels.
- Performance improvements must not reduce room functionality.

## Existing Files / Components
- `components/room/youtube-media-player.tsx`
- `components/room/direct-media-player.tsx`
- `components/room/listen-mode-layout.tsx`
- `components/room/queue-panel.tsx`
- `components/room/members-panel.tsx`
- `lib/player/sync.ts`
- `lib/player/youtube-autoplay-continuity.ts`
- `lib/spacetime/use-live-room.ts`
- `lib/queue/model.ts`
- `spacetime/src/index.ts`
- `tests/player/sync.test.mjs`
- `tests/player/youtube-autoplay-continuity.test.mjs`
- `tests/queue/model.test.mjs`
- `tests/spacetime/*.test.mjs`

## Constraints
- Do not make playback permission a workaround for follower stability.
- Do not weaken host authority.
- Do not create hidden YouTube iframes or attempt to preload full YouTube videos.
- Do not remove queue drawer, members, recommendations, invite controls, or listen mode visuals.
- Do not implement accounts, friends, R2 upload, browser control, or voting here.
- Preserve SpacetimeDB as the live room authority.
- Keep YouTube compliance: the player remains visible where required.

## Acceptance Ideas
- Non-controller mobile listeners do not pause/play stutter during normal sub-second drift.
- Autoplay advances the next queue item through one coherent room-state transition.
- Old YouTube source events are ignored during next-item handoff.
- Long playlists do not cause drawer-open or mobile layout sluggishness.
- Mobile listen mode avoids heavy waveform/background render cost.
- Hidden right sidebar content and closed drawer details are not mounted.
- QA includes desktop and mobile browser checks plus SpacetimeDB publish verification.

## Unknowns
- Exact mobile browser behavior may vary between iOS Safari, Android Chrome, and in-app webviews.
- Queue virtualization library choice is not settled. Prefer a minimal existing dependency only if it reduces risk.
- Current render hotspots need measurement with React Profiler/browser performance trace during implementation.
