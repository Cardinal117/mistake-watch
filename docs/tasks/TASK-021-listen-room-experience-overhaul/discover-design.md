---
id: TASK-021-DISCOVER-DESIGN
status: accepted
related: [TASK-021, TASK-011, MW-FEAT-009]
updated: 2026-08-27
---

# Listen Discover Surface Design

## Purpose

Turn Discover from one recommendation rail with filter tabs into a compact,
multi-shelf browsing surface. This pass changes presentation and navigation,
not recommendation ranking, provider permissions, queue authority, or account
data access.

## Reference Diagnosis

The approved reference improves the current surface by:

- showing several recommendation contexts at once instead of hiding three
  behind tabs;
- using compact landscape cards that keep artwork, metadata, duration, and
  commands visible without tall portrait-card waste;
- separating recommendation reasons into titled shelves;
- using one major translucent Discover surface rather than a card around every
  section;
- keeping the dynamic room background visible through deliberate gutters;
- reserving accent color for selected, focused, and actionable state;
- using a lighter playlist-card variant when full media controls are not
  needed.

## Information Architecture

The initial Discover view uses these shelves in this order:

| Shelf                             | Existing source                                  | Display rule                                           |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| `Room picks`                      | Current `for-you` composition                    | Always first; queue/history-aware, playable items only |
| `Because you listened to {title}` | Current contextual/provider `recommended` result | Show when a playable seed and related results exist    |
| `Recently played in {room}`       | Deduplicated played room history                 | Hide when no played history exists                     |
| `From playlists in this room`     | Current room playlist/history matches            | Never imply Google or YouTube account playlist access  |

`Most listened in {room}` remains part of Discover. It may appear as a fifth
shelf when useful or in the expanded Browse All view, but TASK-021 must not
delete the existing `top-listened` behavior.

When a shelf lacks useful data, the layout should normally omit it rather than
render four large empty panels. If every shelf is empty, show one compact
Discover empty state with the existing Add Media path.

## Data Honesty

- `From your playlists` is not an approved label for the current product. The
  app has no Google/YouTube account playlist scope under TASK-011.
- `Because you listened to...` should name the seed item when space permits and
  expose the complete reason to assistive technology.
- Recommendation provenance remains deterministic and explainable. Do not
  claim personal account inference when the source is room queue/history.
- This redesign introduces no OAuth scope, provider endpoint, recommendation
  algorithm, analytics event, or public API contract.

## Media Shelf Card

Use one compact, stable landscape card for the media shelves:

- use an approximately `232x116px` desktop track so five comfortable cards fit
  at the reference width without compressing artwork or the action rail;
- artwork at the leading edge with a fixed aspect ratio;
- one-line title and artist with safe truncation and full accessible names;
- visible duration;
- stable bottom action rail for Play Now, Add to Queue or Play Next, and Like;
- at least `36px` of centered action-rail height so icons and focus targets are
  not clipped by the card boundary;
- existing command permission and availability states;
- existing source identity and stable playable-source key;
- no hidden hover-only essential action.

The selected/current item uses a restrained accent edge or state label. Cards
must not all receive bright themed borders. Like state remains connected to the
same account preference controller used by the player and visualizer.

## Playlist Card

Playlist matches use a quieter compact card with artwork, playlist name, and
track count when known. Opening a playlist must use the existing review/import
flow. It must not immediately enqueue a complete playlist or imply account
ownership.

If current data cannot produce a real playlist entity, render matching media
cards under `From playlists in this room` instead of manufacturing playlist
summary cards.

## Shelf Navigation

- Each shelf is horizontally scrollable with trackpad, touch, and keyboard.
- Hide the physical scrollbar to reclaim vertical space. The shelf must retain
  edge buttons, mouse-wheel translation, touch panning, and keyboard movement;
  hiding the scrollbar must not make overflow unreachable.
- Edge controls advance by a bounded group without moving focus unexpectedly.
- The trailing shelf action opens a Browse All view for that recommendation
  reason; it is not a decorative chevron.
- Browse All remains inside Discover and provides a clear Back action with
  focus restoration to the originating shelf action.
- The floating workspace switch makes only its visible pill interactive; its
  full-width alignment wrapper must not intercept Browse All controls beneath
  it.
- Search remains the room search command and does not silently become a local
  shelf filter in this batch.

## Deduplication And Order

- Deduplicate within every shelf by stable playable source.
- Preserve the ranking order returned by the existing source.
- Prefer suppressing an item already shown in an earlier shelf when enough
  alternatives remain.
- Allow cross-shelf repetition when removing it would make a shelf misleading
  or empty; the shelf reason then explains why the item appears again.
- Never connect a command to an item by rendered index. Use stable source and
  queue identities.
- Recommendation queue commands explicitly allow the selected source to be
  queued again. Play Next carries the same duplicate intent plus its priority
  flag so an existing room copy cannot turn the action into a no-op.

## States

- Each shelf owns its loading, ready, empty, and recoverable-error state so one
  failed source does not blank the whole Discover surface.
- Keep skeleton dimensions equal to final card dimensions.
- A provider recommendation failure falls back to current room-related results
  with honest copy.
- Disabled actions explain permission or availability through existing
  tooltips/status text and never rely on color alone.

## Responsive Behavior

- **Wide desktop:** approximately five `232x116px` cards remain visible per
  shelf, with a partial next-card hint where space permits.
- **Tablet/portrait:** preserve horizontal shelves with two to three visible
  cards rather than compressing them into a dense grid.
- **Compact mobile:** show one full card plus a deliberate hint of the next;
  controls remain touch sized and no horizontal page overflow occurs.
- Shelf headings, counts, actions, and cards use fixed tracks or bounded
  dimensions so loading and long metadata do not shift the room shell.

## Performance Boundaries

- Derive all shelves from one bounded input snapshot rather than duplicating
  recommendation requests per shelf.
- Keep the initial number of rendered cards and poster requests bounded.
- Lazy-load artwork outside the near viewport and preserve fixed placeholders.
- Do not add a carousel, animation, state-management, or recommendation
  dependency.
- Shelf scrolling may use native overflow; do not introduce continuous motion.
- The redesign must not regress room startup, queue rendering, playback, or the
  TASK-010 private-poster security contract.

## Accessibility

- Each shelf has a real heading and a labelled region.
- Cards expose media title, creator, duration, source, and command names.
- Arrow-only shelf and card controls have tooltips and accessible labels.
- Keyboard order follows shelf order and does not traverse offscreen cards
  indefinitely.
- Browse All and any menu restore focus to their trigger when closed.

## Explicit Non-Direction

- No account playlist or subscription import.
- No AI DJ, autonomous queue mutation, or new recommendation model.
- No infinite feed, autoplaying card preview, decorative carousel animation,
  or nested section cards.
- No removal of Most listened, existing provider fallback, Like, Play Now,
  queue, or Play Next behavior.
