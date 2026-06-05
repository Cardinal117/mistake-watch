# Design Spec: Playback Stability and Listen Performance

## Technical Approach

### Phase 1: Playback Transition Stability

Add a SpacetimeDB reducer such as `advance_queue_item_autoplay`.

The reducer should atomically:

1. validate the caller has playback authority;
2. confirm queue autoplay is enabled;
3. select the next playable queue item using the room queue mode;
4. mark the current playing item as `played`;
5. mark the next item as `playing`;
6. update `room_session` in the same reducer call:
   - `active_queue_item_id`;
   - `source_url`;
   - `source_title`;
   - `source_type`;
   - `source_duration_seconds`;
   - `position_seconds = 0`;
   - `playback_rate = 1`;
   - `status = "playing"`;
   - `server_updated_ms = nowMs()`;
7. normalize queued positions.

The frontend should replace the current autoplay path:

```txt
playQueueItem(nextItemId)
setPlaybackState(playing at 0)
```

with:

```txt
advanceQueueItemAutoplay()
```

Manual "play this queue item now" may continue to use an explicit play path, but should be reviewed for the same transient-state issue.

### YouTube Transition Guard

`YoutubeMediaPlayer` should track a transition token when the canonical source changes or an autoplay advance begins.

During transition:

- pause or suppress the old source locally before loading the new source;
- ignore old-source `PLAYING`, `PAUSED`, `BUFFERING`, and `ENDED` events;
- do not publish old-source playback state;
- clear the guard only after the new source is loaded or after a safe timeout.

### Non-Controller Sync Policy

The special unauthorized correction path should not be stricter than the normal listen-mode YouTube policy.

Preferred behavior:

- sub-second drift in listen mode is tolerated;
- no playback-rate correction for YouTube;
- no repeated pause/play forcing for normal mobile iframe state changes;
- hard correction only when drift becomes meaningful or when source identity changes.

### Phase 2: Listen Performance

Apply a visibility-first rendering model:

- closed queue drawer renders only the compact drawer handle/count;
- open queue drawer renders visible content only;
- collapsed right sidebar renders only the slim rail;
- heavy member controls mount only when expanded;
- mobile disables heavy waveform/background visuals by default;
- recommendation carousels and queue/history rows load metadata and thumbnails only when visible.

## UI / UX Approach

Playback stability should not add visible complexity except:

- a brief "Preparing next" / "Next ready" state remains acceptable;
- autoplay should feel continuous and intentional;
- non-controller guests should not be prompted for playback permission to get stable audio.

Performance changes should preserve the current visual direction:

- dark technical style;
- Signal Aperture blue/gold accents;
- compact, attached surfaces;
- no floating bubble controls;
- player remains the visual color source.

## Component / Module Structure

- `spacetime/src/index.ts`
  - Add atomic autoplay reducer.
  - Preserve existing reducer behavior for manual actions.

- `lib/spacetime/use-live-room.ts`
  - Add adapter method for atomic autoplay advance.
  - Update `advanceToNextQueueItem` to use the new reducer.

- `lib/spacetime/generated/*`
  - Regenerate after reducer changes.

- `components/room/youtube-media-player.tsx`
  - Add transition guard.
  - Relax non-controller correction.
  - Avoid old-source event publication.

- `lib/player/sync.ts`
  - Add or clarify listen-mode YouTube tolerances if needed.

- `components/room/listen-mode-layout.tsx`
  - Lazy-mount drawer details and collapsed sidebar content.
  - Disable or simplify heavy visuals on mobile/reduced motion.
  - Keep visible UI behavior unchanged.

- `components/room/queue-panel.tsx`
  - Apply same hidden-content strategy where watch mode still uses this panel.

- `lib/youtube/use-youtube-metadata.ts`
  - Review metadata cache sharing and visibility-triggered usage.

## Data / State Needs

- New SpacetimeDB reducer binding for atomic autoplay.
- Optional client-only transition state in `YoutubeMediaPlayer`.
- Optional viewport/reduced-motion signal for listen visuals.
- Optional virtualization state for queue/history row windowing.

## Accessibility Notes

- Lazy-mounted panels must remain keyboard reachable when opened.
- Drawer toggle state must expose `aria-expanded`.
- Collapsed sidebar rail must preserve accessible labels.
- Reduced-motion users should get static visuals.
- Virtualized queue rows must preserve meaningful labels and controls.

## Responsive Notes

- Mobile should prioritize current player, compact queue access, and essential room controls.
- Mobile should not render desktop-only waveforms or full sidebars.
- Drawer content should fit within viewport height and avoid nested scroll traps where possible.
- Large playlist imports should not make mobile unusable.

## Animation Notes

- Prefer CSS animations over React-driven timers.
- Pause animations when tab is hidden, component is offscreen, drawer is closed, sidebar is collapsed, or reduced-motion is active.
- Keep dynamic theme gradual and restrained.

## Edge Cases

- YouTube autoplay blocked on next item.
- YouTube video unavailable during autoplay.
- No next playable queue item.
- Queue mode `shuffle`, `smartShuffle`, `loop`, `normal`, and `autoplayRelated`.
- Host leaves during handoff.
- Guest loses permission during playback.
- Mobile browser reports iframe `PAUSED` while audio is still recovering.
- Long queue with duplicate, unavailable, played, pinned, and play-next items.
