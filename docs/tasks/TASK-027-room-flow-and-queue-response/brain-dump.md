# TASK-027: Owner intent and reference inventory

Captured: 2026-09-07. Source: the owner's room-flow discussion and explicit
approval in this task. This is a faithful requirement capture, not a claim
that the requested changes are already implemented.

## Approval and latest refinement

The owner approved the discussed direction and instructed: make the required
notes, tasks and documentation first, leave nothing out, then proceed. Medium
reasoning is their selected effort. No additional approval is needed to begin
the scoped local implementation after this documentation checkpoint.

Exact new interaction request:

> I agree with your listen mode on mobile compact bar while browsing like seen in yt music(also when you then drag this compact bar up also like yt music it will then animate into the main artwork/embed or listen view that allows you to see it on a much larger scale like the cinima room/place in the watch on mobile.

The reference describes interaction and hierarchy; it does not request a copy
of YouTube Music branding or authorize unsupported provider behavior.

## Complete discussion capture

1. Watch and Listen must have distinct purposes on mobile while retaining the
   accepted style, navigation quality, touch controls and dynamic artwork theme.
2. Keep Watch/Listen easy to see at the top of mobile Home, stable while Home
   content scrolls. Preserve the existing shared-room mode/permission contract.
3. Desktop Watch should open into catalogue browsing, rather than dedicating a
   large left panel to a player before a user has chosen anything. Mobile's
   accepted browsing approach is the starting point. Avoid unrelated desktop
   Listen redesign.
4. If catalogue access is denied, default to YouTube & links. Do not confuse
   denial with an empty library, an unresolved permission check or a network error.
5. Show no empty player/dock on either device size. Retain a loaded player when
   paused so its resume control remains reachable.
6. While Watch media is loaded, provide a movable, compact mini-player on desktop
   as well as mobile, with an obvious Cinema action. Desktop may be larger;
   preserve four-corner movement, expansion and the same provider instance.
7. Listen Home emphasizes current track/artwork, music transport and Up Next.
   Discover/Visualizer remain recognizable. Browsing uses the compact bar;
   upward dragging expands into the main Listen experience with a continuous
   animation. Expanded Listen is analogous to Watch Cinema, not another room.
8. Future YouTube recommendation shelves should fit this discovery surface,
   eventually informed by listening history and appropriately authorized
   account/playlist signals when API access permits. Do not build the engine or
   account imports in this task; preserve existing working recommendations.
9. Dragged queue rows visually settle about 400–600 ms after drop, especially
   on mobile. Measure actual latency; make the local order respond immediately
   and reconcile with the authoritative server rather than making the user wait.
10. Explicitly handle two/four authorized users moving the same song, different
    songs, stale positions, failed moves and permission changes. Explain which
    server action wins; avoid corrupt or permanently divergent queues.
11. Add elegant, efficient holding/insertion/settling motion that makes the held
    row and destination obvious, following the current dynamic accent.
12. Watch queue should receive the bounded rendering/virtualization already used
    in Listen, on desktop and mobile, including functional long-distance dragging.
13. Keep compact rows, broad play target, Play next, pin, top/bottom actions,
    drag edge-scroll, swipe-left reveal, second-swipe/tap-trash removal and
    keyboard alternatives. Do not bring back the duplicate Add Media queue bar.
14. Fix playlist review: artwork/title overlap, clipped bottom actions and
    inconsistent checkbox styling. Preserve selection, duplicate handling,
    filtering/sorting, selected/all/shuffle import and unavailable-media feedback.
15. Use the Google account photo for the account/settings entry point when it
    is available; fall back to the chosen avatar. Room participant identity and
    host-role decoration remain distinct from account identity.
16. Move participants/permissions beside the account/settings button on the
    right with coherent spacing and separate accessible targets.
17. Preserve accepted leave confirmation, save star, live rename, members and
    inactive/previous members, sync, transport, fullscreen, mobile landscape,
    safe areas and scroll containment. Playback must not remount on navigation.

## Screenshot evidence

- [Playlist review defect](references/playlist-review.png): supplied as
  `codex-clipboard-b829a43d-e6f8-40b9-a7d9-298989546ede.png`. Shows thumbnail/text
  overlap, native checkbox appearance and bottom actions cut by the viewport.
- [Header placement](references/watch-header.png): supplied as
  `codex-clipboard-d44131b1-669f-40a5-a785-d26c3b2715ba.png`. Shows participants
  preceding the mode switch and a room avatar in the far-right account control.
- Earlier accepted Watch/Huawei evidence remains in TASK-026. Those acceptance
  results establish the regression baseline; they do not accept TASK-027 changes.

## Boundaries carried forward

Original checkout has unrelated dirty Listen/transport/Media Session work and
owner inbox notes. TASK-025 is an untracked draft there. Inspect these read-only
for overlap; do not copy, reset, stage or silently complete them. Existing
provider/performance/account bug reports stay open unless their actual criteria
are independently proven. TASK-026's release approval is historical, not blanket
authorization to replace production for this new task.
