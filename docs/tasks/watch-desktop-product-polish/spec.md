# Approved Watch desktop contract

Use the approved Browse and Watch reference images with the final owner
clarifications below. Reuse the current artwork-driven ambient theme, typography,
Listen mode-tab component, original transport icons and 8/12px shapes. Desktop
breakpoint: 1024px. Mockup artwork and metadata are illustrative, not product data.

## Browse

Place bounded collections first, Ready to watch second, then compact recent
history, beside an anchored player. Keep search/source selection in the top
shared toolbar. Below the player show only the first three upcoming items, with
an adaptive 16-28px gap after controls. Its heading and rows open the full queue;
Play next is a separate action. No preview search, Social tab or footer button.

## Expanded Watch / Cinema

Promote the same mounted player to the left. Attach a full-height, searchable
mini queue to the right with flat Listen-style rows, ordinary reorder/next/row
actions, bounded virtualization and access to the full queue. Do not cap this
queue to three or put another card box inside the column. Do not repeat Up next below the main player. Use the freed space for adaptive
transport spacing and a 128px volume slider with a 44px interaction height. Social remains accessible through the desktop header.

Back to catalogue (back-arrow icon) sits directly beside Dock player at the
right of the desktop toolbar.

## Preservation

Keep the original catalogue permissions, details/management/history, source
admission, queue order, Like, settings, fullscreen and explicit Float player.
Empty media reserves no rail. Paused/buffering media retains its provider.
Keep exactly one player across Browse/Cinema/floating/mobile/resize; active
YouTube remains visible at >=200x200. Small viewports and large text use contained
scrolling where required. Preserve mobile/tablet gestures and existing defaults.
No database, sync algorithm, new dependency or provider lookup changes.

## Action correctness

Ready cards expose real Play now, Add to queue and Play next through the same
permission/private-session handling as details. A browser-scoped latest-request
generation prevents older private admissions from replacing newer Play choices.
Start only after canonical source acknowledgment. Repeated Add remains enabled
with allowDuplicate true. Recheck current permissions/connection before admission;
unmount invalidates pending requests/start. Preserve existing queue feedback,
optimistic reorder recovery and canonical index mapping when searching.

## Acceptance

Verify desktop 1920/1440, short 1024, mobile/tablet and 200% text size; original
provider identity, reachable controls, adaptive preview spacing, >3 items in the
expanded queue, bounded 500-item rendering, filtered reorder, permissions,
private-session races, repeated additions and fullscreen return. No unrelated
recording-review changes may enter the clean release export.

The same latest-intent fence also protects asynchronous uploaded queue playback
on the client. This is request admission/cancellation safety only: no server
reducer, room sync mathematics, schema or permission model is changed. An
explicit Play remains valid while the user browses; closing a card/details alone
does not cancel it. A newer Play/source choice, room unmount or loss of current
playback permission prevents stale admission.
