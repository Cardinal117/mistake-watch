# Design: Watch Media Hub Performance

## Progressive Rendering

Use a pure helper to derive the initial/batch size and visible slice. Grid mode
uses 24 items; list mode uses 12. An IntersectionObserver sentinel rooted to the
Media Hub scroll container reveals one additional batch near the viewport.

Reset the window when view mode, folder, search query, sort result identity, or
result count changes. Preserve stable `item.id` keys and canonical item order.

## Poster Delivery

Poster URLs remain application-owned `/api/media/assets/{id}/poster` routes.
Cards do not resolve or store signed R2 destinations. A reusable lazy-poster
component observes its fixed-aspect container against the Media Hub scroll root.
The first visible row loads immediately; later cards assign `src` only near the
viewport and use asynchronous decoding and low fetch priority.

## Scroll Root

The existing Media Hub view remains the scroll owner. Pass its element through
a ref context/prop to uploaded catalogue rendering and poster observers. No new
global scroll listeners or dependencies are introduced.

## Accessibility and UI

Keep existing cards and controls unchanged. Add a compact result statement that
reports rendered versus total matching results. The sentinel is not an
interactive control and is hidden from assistive technology. Fixed poster aspect
ratios prevent layout shift.

## Failure Behavior

- Without IntersectionObserver, reveal all results and load posters normally.
- Disconnect observers on unmount and when result identity changes.
- Missing/failed posters retain the current fallback artwork.
- Filtering to zero items preserves the existing empty state.
