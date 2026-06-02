# Notes: Cinematic Room Page

## Role In Product
This is the strongest reference for the core watch-room experience. It should guide the main room layout once playback sync, queue, participants, and host controls are implemented.

## What Works
- The media stage is clearly the hero and feels appropriately cinematic.
- The right sidebar gives queue, people, and chat a clear home without competing with the video.
- The bottom transport bar feels purpose-built for synchronized viewing and leaves the media stage mostly unobstructed.
- The bottom transport bar feels grounded and integrated; this should be the standard control pattern when session controls are needed.
- The top status HUD communicates live state, current title, and room identity in a compact way.
- The technical metadata treatment, such as latency and resolution, fits the precision-focused product direction.
- The restrained dark surfaces and cyan highlights feel premium and close to the desired product mood.

## Required Adjustments
- Integrate the final shared navbar pattern so Watch, Listen, and Browse feel consistent across all modes.
- Add an explicit source/input area or modal for direct URL and HLS loading.
- Add host permission controls for guests, either as a sidebar tab or a host-only panel.
- Add clear guest-first states: join prompt, display name, invite link, and host/guest labels.
- Replace placeholder media imagery with actual player surfaces during implementation.
- Ensure the sidebar can collapse or become tabs/drawers on tablet and mobile.
- Keep browser mode visually present in navigation but clearly phase-two/beta until implemented.

## Implementation Insights
- Use this layout as the default room shell for watch mode.
- Keep the bottom transport bar stable in height so play/pause, sync state, captions, volume, and fullscreen do not shift the layout.
- Prefer this grounded bottom bar over floating bubble-style docks across the product.
- The right sidebar width should stay around 360-380px on desktop.
- Queue, People, Chat, and Permissions should probably share the same sidebar tab system.
- The live HUD should be reusable across watch and listen modes with different accent colors.
- Avoid overusing large monospace text for normal content; reserve it for metadata, queue timing, room codes, and status readouts.

## Risks To Watch
- The current page depends heavily on desktop width and needs a mobile plan before implementation.
- The media stage may become cramped if source input, queue management, and participant controls are all visible at once.
- The design uses high contrast cyan accents; keep secondary actions quieter so the interface does not become visually noisy.
