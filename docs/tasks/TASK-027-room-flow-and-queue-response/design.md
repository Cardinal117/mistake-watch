# Design and interaction contracts

Status: approved target, not current implementation. Updated: 2026-09-07.
Use root DESIGN.md tokens, ListenTheme/ambient surfaces, established icons and
controls. Preserve the shared provider and room-authoritative architecture.

## Watch states

| Context | Default content | Player presentation |
| --- | --- | --- |
| Enter room, catalogue allowed | Catalogue discovery | None until a source exists |
| Enter room, catalogue denied | YouTube & links | Existing room media remains playable if room playback allows it |
| Access unresolved | Stable loading surface | Do not flash protected catalogue content |
| Catalogue empty | Useful empty state and links entry | No empty player rail |
| Catalogue error | Retry/error in the catalogue surface | Do not mislabel it as denial or interrupt playback |
| Browsing with a loaded source | Current browse/queue/add/social/more panel | Compact movable Watch player; paused source stays visible |
| Cinema selected | Media-emphasized local presentation | Same source/player with full transport |
| Actual fullscreen | Media with accessible overlay controls | Same player; Escape/back exit restores prior view |

Watch starts with browsing on fresh entry on desktop/mobile, including when a
room already has media: expose that media through its dock/Cinema action without
forcing a new playback command. Internal navigation preserves browse position,
filters and selection where practical. Home's Watch/Cinema and Browse choices
remain explicit. An empty state has no black reserved rail or phantom dock
padding. Loading, buffering and paused are not empty states. Reconnect preserves
the current source rather than briefly destroying the player.

Desktop browsing uses the available width instead of retaining a permanent left
player column. Reuse four-corner docking, resize/expand and keyboard movement
from accepted mobile; desktop dimensions may differ. Clamp after resize, zoom,
orientation and keyboard changes. Keep controls clear of headers, navigation and
safe areas. All meaningful desktop controls remain reachable without hover.

## Listen mobile states and swipe-up expansion

Home foregrounds current track/artwork, play/pause, previous/next, seek, local
audio controls and Up Next. Preserve existing Discover/Visualizer access and
static-artwork preference. Other destinations are Queue, Add, Social and More,
matching the shared room navigation vocabulary.

While browsing, a compact bar sits immediately above the bottom navigation:
small artwork/title, play/pause, next where space permits, and an obvious expand
affordance. Seek/volume and secondary actions are available in expanded Listen.
No source means no bar; a paused or buffering source retains the bar and an
accurate state. Do not use a large floating Watch video card for this flow.

- Drag upward from the bar/handle to expand into the main Listen artwork/embed
  and transport surface. The same artwork and surface should appear to grow
  from the bar, with controls revealed as room becomes available.
- Animate based on local drag progress; settle to compact or expanded on release.
  Short/cancelled drags return to their starting state. Establish usable distance
  and velocity thresholds in the prototype and record final values in evidence.
- Downward drag from the expanded handle collapses to the previous browsing
  destination, retaining its scroll position. Inner list scrolling must not
  accidentally collapse the view. Tap Expand/Collapse and keyboard activation
  provide equivalent actions; Escape collapses only after any child dialog closes.
- Seek dragging and pressing transport buttons do not trigger expansion. Scope
  touch-action to the handle/gesture area; preserve page/list vertical scrolling.
- Reduced motion uses an immediate state transition or restrained crossfade.
  Focus moves intentionally to expanded controls and returns to the bar on close.
- Portrait, short landscape, safe areas, browser bars and virtual keyboards must
  leave usable transport and an escape route. Expanded Listen is a local view;
  it is not a new session or a room-mode reducer action.
- Keep the provider in one stable mounted ownership tree throughout bar,
  expanded, navigation and rotation states. Do not replace video with a second
  audio player, reload a source, reset volume, restart analysis or seek solely
  because presentation changed.

Provider feasibility is a pre-implementation check: inspect current supported
embed options and visible-size requirements. A YouTube Music-style bar is a UX
reference, not evidence that a third-party video embed supports hidden/audio-only
playback. Validate a supported presentation before integrating the compact state;
record any unresolved incompatibility and do not mark this requirement complete.

## Shared header and identity

On mobile Home, place a visible Watch/Listen segmented control below the room
identity, sticky within the Home shell. Do not stack duplicate mode controls.
Retain existing authorization: changing mode affects the room, requires room
authority and connection, and denied users see the current mode with an
understandable disabled state. Cinema/Listen expansion stay local.

Desktop right-hand grouping: room actions, Invite, participants/count, then
account/settings. Keep participants and account as distinct labelled controls.
Mobile retains room identity/save, participants and account within its width.
Use the available Google account photo for account access, falling back to the
chosen room avatar on absent/failed image and guest state. Participant avatars
continue to represent room identities. A crown indicates host role only; account
photo is not evidence of authority. Reuse Listen's account identity resolution
rather than requesting extra profile data. Long names, counts and image errors
must not push controls offscreen.

## Queue ordering and authority

Current baseline: move_queue_item accepts item ID and numeric position, reads
the current server queue, repositions that queued item and rewrites positions.
There is no expected-revision guard. The drag hook clears its local translation
after dispatch; Watch waits for the new snapshot. Listen virtualizes its queue;
Watch QueueContent renders every upcoming row.

Target: keep the canonical snapshot separate from a local pending-move
projection. On drop, update the visible projection immediately, dispatch once,
and reconcile after a confirmed outcome. The projection never feeds playback,
auto-advance, permissions or durable queue storage. Other clients receive only
canonical server updates, not speculative drag positions.

Prefer a backward-compatible additive move operation expressing item identity
and placement relative to another queued item, with start/end destinations.
Resolve that intent against the server's current queued list atomically; preserve
the existing numeric reducer for old clients. Use action identity for outcome
correlation; merely issuing a command is not confirmation. Do not infer success
from an unrelated snapshot update or replay old commands on reconnect.

Conflict rules to lock with reducer/client tests before integration:

- Same item: later accepted valid server move applies; server order, not client
  wall-clock/finger-release order, decides. No drag lock or client clock winner.
- Different items: each command resolves its relative destination against the
  updated server list. All clients converge; a full stale client array never
  overwrites the server queue.
- Removed/now-playing source or removed/nonqueued anchor: reject/no-op with a
  recognizable outcome, reconcile locally and explain briefly. Never resurrect
  a removed song or move the current track into the upcoming queue.
- Missing permission, disconnect, room change, rejection or bounded confirmation
  timeout: discard/reconcile speculative order, retain authoritative data and
  avoid automatic retry. Timeout duration is a measured implementation choice.
- Multiple pending gestures: correlate outcomes so an older response cannot
  undo a newer local move; choose a bounded intent queue/rebase strategy, with
  tests. Do not lock unrelated transport or browsing while confirmation waits.
- Preserve pin, Play next, history and automatic queue-mode semantics. Characterize
  existing priority ordering first. If a pin/priority overrides the displayed
  destination, expose that rule; do not silently clear flags during drag or leave
  a speculative order that the server will never use. An unresolved semantic
  conflict is a design gate, not a reason to fake success.

Measure input-to-visual placement separately from dispatch-to-confirmation.
Profile reducer row rewrites and subscription/render processing before optimizing
them; no broad sync-engine rewrite or unsupported claim of lower network RTT.

## Virtualization, gestures and motion

Reuse the existing queue virtualization utility where suitable; mount the visible
window plus overscan, not all upcoming/history rows. Keep one scroll owner,
stable item IDs, predictable compact row heights and correct full-list indices.
The current item is not reorderable. A dragged row must survive window recycling
through a stable drag layer or retained row; calculate targets using full-list
geometry and scroll offset, not just mounted DOM centres. Test top-to-bottom,
edge scrolling, filtered/history views, keyboard focus and remote changes mid-drag.

On lift use subtle scale/elevation and an artwork-accent outline. An insertion
gap identifies the destination; neighbours shift smoothly. Drop settles directly
into the optimistic position with roughly 150–220 ms motion and no server wait.
Use transforms/opacity and frame-batched pointer work. Avoid per-move whole-queue
React updates, repeated layout reads, spring bounce, animated blur or continuous
glow. Preserve reduced motion, swipe reveal/removal and non-drag alternatives.

## Playlist review

Repair the actual shared PlaylistPreviewCard path used by Watch, then verify the
separate Listen review overlay as a regression surface. Explicit row columns:
selection, fixed artwork, minmax(0,1fr) text, optional status/duration. Keep text
out of artwork bounds; truncate/clamp with accessible full labels. Use the
established theme on semantic checkbox checked/mixed/disabled/focus states.

Constrain the panel to available viewport space. Header/tools and action footer
remain reachable; the list body owns scrolling with min-height:0. At short
heights prefer a usable single scroll fallback over a zero-height list. Wrap
actions on narrow screens, keep keyboard focus visible and do not cover the last
row with a sticky footer. Preserve duplicate identity, selected counts, filter
selection semantics, unavailable items and import permissions. No automatic
playlist import or new recommendation network work during rendering.

## Future discovery

Keep room history, current-media context, library collections and existing
recommendation contracts intact. Later YouTube recommendations/account playlists
belong in discovery/YouTube surfaces, with actual authorization and API capability.
No fabricated shelves, new OAuth scopes or background harvesting in TASK-027.
