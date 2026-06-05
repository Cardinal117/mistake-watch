# Acceptance Criteria: Playback Stability and Listen Performance

## Functional Requirements
- Autoplay queue advancement uses a single SpacetimeDB reducer transition for selecting and playing the next item.
- Queue mode semantics remain intact for normal, loop, shuffle, smart shuffle, pinned/play-next, and unavailable items.
- Non-controller guests without playback permission can listen without repeated pause/play stutter during normal sub-second drift.
- Non-controller guests are still corrected when they meaningfully drift or manually seek away from the room state.
- YouTube old-source events are ignored during source handoff.
- Manual queue play behavior remains permission-aware.
- YouTube autoplay blocks still show a compact resume state instead of silently failing.

## Visual Requirements
- Existing listen room layout direction remains intact.
- Player remains the strongest visual color source.
- "Preparing next" or "Next ready" state remains clear but not noisy.
- Closed drawer and collapsed sidebar stay attached, compact, and consistent with the current design.
- No new floating bubble controls.

## Responsive Requirements
- Mobile does not render heavy waveform/background animations by default.
- Mobile can still access queue and member controls.
- Queue drawer fits small screens without making the page unusable.
- Large playlists do not cause visible layout stalls on mobile.

## Accessibility Requirements
- Drawer and sidebar toggles expose state with accessible labels.
- Lazy-mounted controls are keyboard reachable once visible.
- Virtualized or capped rows preserve readable labels and button names.
- Reduced-motion users receive static or simplified visual states.

## Performance Requirements
- Closed queue drawer does not mount full queue/history details.
- Collapsed right sidebar does not mount full member management UI.
- Hidden/offscreen rows do not trigger thumbnail and metadata work.
- Long queue rendering is virtualized or otherwise bounded.
- Heavy animations pause or disable on mobile, hidden tab, offscreen state, or reduced motion.
- Browser QA or profiling notes must compare before/after behavior for a large playlist.

## Error State Requirements
- Unavailable YouTube videos are skipped or surfaced according to current availability rules.
- If no next playable item exists, autoplay stops without looping a broken transition.
- If SpacetimeDB publish/generate fails, implementation stops and documents the blocker.
- If YouTube iframe autoplay fails, the user sees a resume state.

## Must Not Break
- Host-authoritative playback.
- Guest queue-add permission.
- Host queue reorder/remove/clear.
- Member permission controls.
- Room mode switching.
- Queue drawer controls.
- YouTube metadata display.
- Direct/HLS playback sync.
- Vercel production deployment flow.
- SpacetimeDB CLI recovery commands in `AGENTS.md`.
