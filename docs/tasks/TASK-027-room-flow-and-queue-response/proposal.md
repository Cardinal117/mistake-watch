# TASK-027: Room flow and responsive queue

Status: Local implementations cover 027.1/027.2 and 027.3; integrated acceptance and 027.4 remain pending.
Updated: 2026-09-07. Level: full packet (responsive redesign, shared playback and
queue concurrency). Predecessor: [TASK-026](../TASK-026-watch-room-redesign/release.md).

## Outcome

Give Watch a browsing-to-Cinema flow and Listen a music-focused Home with a
compact, expandable mobile now-playing bar. Share identity, navigation,
artwork styling and reliable queue gestures without duplicating the playback
or room authority systems. Remove the demonstrated playlist clipping and queue
drop feedback defects before broadening the layout.

## Packet map

- [Owner intent and screenshots](brain-dump.md)
- [Interaction and architecture contracts](design.md)
- [Ordered implementation and test-first gates](tasks.md)
- [Requirement-by-requirement acceptance matrix](acceptance-criteria.md)
- [Evidence, overlap and unresolved engineering questions](review-notes.md)
- [Queue/playlist implementation, QA links and limitations](local-qa.md)
- [Watch browse-first implementation and local QA](watch-local-qa.md)

## Scope

1. Measure queue drop feedback and command confirmation independently; implement
   optimistic local ordering, safe reconciliation and useful drag motion.
2. Bound Watch queue rendering and extend compact touch ordering to Listen while
   preserving its existing virtualization. Treat drag and virtualization as one
   interaction contract, not independent cosmetic changes.
3. Correct shared playlist-review layout and accessible themed selection.
4. Default Watch to permission-aware discovery, remove empty player chrome,
   introduce a desktop browse mini-player and preserve Cinema/fullscreen.
5. Improve mobile mode visibility and account/member header placement.
6. Adapt mobile Listen to Home/Queue/Add/Social/More, with track-led Home,
   compact browsing transport and drag-up expansion to the full Listen surface.
7. Verify provider continuity, two/four-member concurrency, permissions,
   responsive behaviour, performance and the accepted Watch regression suite.

## Exclusions

No new recommendation algorithm, YouTube OAuth scopes, playlist harvesting,
API quota expansion, new music provider, background-playback promise, AI DJ,
remote browser, visualizer engine, R2 gateway change, Supabase schema/auth
redesign or unrelated desktop Listen overhaul. Existing recommendation shelves
remain functional; later signals have a documented destination, not fake data.
No new dependency without demonstrated need. No automatic commit, push, merge,
production credential copy or deployment under this documentation approval.

## Existing work and ownership

- TASK-026 remains completed and accepted; this packet contains its follow-up.
- MW-QOL-002 remains in progress and is the existing queue-parity intake item.
- MW-QOL-001 is related to provider chrome, but its independent copy-link
  requirement is not silently added or declared resolved by this task.
- TASK-025's local draft contains broader startup, snapshot, clock, metadata and
  visualizer performance proposals. These stay separate. This owner's latest
  compact Listen bar replaces that draft's earlier floating Listen dock proposal
  for the mobile presentation being delivered here. Do not edit the draft in the
  other checkout; reconcile implementation overlaps before starting Listen.
- MW-BUG-003/006/009/014 and account/Media Session reports retain their existing
  status. Better queue rendering is not proof of fixing provider throttling or
  all playback/resource complaints.

## Risks and decision gates

Optimistic queue state must never become playback authority. Relative placement
must coexist safely with legacy clients, pin/Play next rules and auto-advance.
Virtualization must preserve accessible movement and drag targets beyond mounted
rows. Compact Listen geometry must be validated against actual provider support;
never shrink, hide or replace a live YouTube iframe merely to imitate another
product. If provider constraints prevent the exact compact layout, record the
specific constraint and a concrete, working alternative before calling it done.

## Delivery order

Documentation -> queue/concurrency/virtualization and playlist fixes -> Watch
browsing/header -> mobile Listen bar/expanded surface -> integrated QA and local
review -> separately approved release. Existing approval covers local scoped
implementation after the documentation checkpoint; no repeat approval is needed
for routine implementation choices within these contracts.
