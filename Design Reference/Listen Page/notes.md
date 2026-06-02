# Notes: Listen Page

## Role In Product
This reference should guide the dedicated music/listening mode inside a room. It establishes a warmer amber mood while preserving the same room shell, queue sidebar, and host-led control model.

## What Works
- The album-art-centered composition makes music mode feel distinct from video without becoming a separate product.
- Amber accents clearly differentiate listen mode from cyan watch mode.
- The visualizer adds energy and reinforces the synced listening experience.
- The right queue panel is concise and useful.
- The bottom transport bar mirrors watch mode, which should make mode switching easier to understand.
- The live sync and room code HUD is compact and effective.

## Required Adjustments
- Integrate the final shared navbar pattern from the strongest navigation reference.
- Add queue-add controls for guests and management controls for the host.
- Add a host-only permissions surface for per-user queue and playback privileges.
- Plan a later suggested-next voting surface that appears around 75% progress.
- Include empty queue, invalid source, autoplay blocked, and reconnecting states.
- Ensure the visualizer does not become distracting or expensive to render.

## Implementation Insights
- Use this as the music mode stage inside the same room route rather than a separate app area.
- Keep the sidebar tabs focused on Queue, People, and Permissions for MVP; Chat can follow if needed.
- The amber mode should be a tokenized accent variant, not a separate one-off color system.
- The now-playing area needs space for title, artist/source, duration, sync state, and host controls.
- Suggested-next voting can appear as a temporary queue panel module or bottom-sheet on smaller screens.

## Risks To Watch
- The layout is desktop-first and needs a mobile state for album art, queue, and controls.
- The visualizer and glow effects should respect reduced-motion preferences.
- Music mode should not imply Spotify/provider integration until the source strategy is real.
- Amber accents are strong; keep destructive actions and errors visually distinct from the music accent.
