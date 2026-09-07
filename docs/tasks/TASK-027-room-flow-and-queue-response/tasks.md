# Implementation sequence and review gates

Status: Local 027.1/027.2 and 027.3 candidates implemented; see [queue/playlist QA](local-qa.md) and [Watch QA](watch-local-qa.md). Owner passed local Watch QA; 027.4 is now a locally verified candidate; owner and integrated acceptance remain pending.
Owner approved this scope and local implementation on 2026-09-07.
Full [acceptance matrix](acceptance-criteria.md) remains the completion contract.

## 027.0: Document and protect the baseline

- [x] Read the released TASK-026 packet, current code, DESIGN.md, intake and
  adjacent untracked TASK-025 draft; resolve focused project memory read-only.
- [x] Refresh origin/main and create isolated `codex/task-027-room-flow` worktree
  at `c0b8247c33949f64ed07b0d8219dada90659592d`.
- [x] Capture all discussion requirements, screenshots, latest swipe-up request,
  exclusions, conflicts, test-first gates and regression requirements.
- [x] Add approved-target design/product direction and link the packet from
  README, handoff, roadmap and recovery task index. Keep live-state claims distinct.
- [x] Link existing queue/provider intake items without closing unresolved reports
  or touching the owner's dirty Quick Capture in the original checkout.
- [x] Record documentation validation results in review-notes.md.

## 027.1: Queue correctness, responsiveness and bounded rendering

Likely surfaces: `components/room/queue/`, Listen `queue/queue-drawer.tsx`,
`lib/queue/virtualization.ts`, Spacetime live-room action/adapter code, generated
bindings and `spacetime/src/index.ts`. Inspect file-level instructions first.

- [x] Establish passing characterization of numeric moves, priorities, Play next,
  permissions, active/history rows and the existing Listen virtual window.
- [ ] Complete full before/after distributions for drop-to-visual and dispatch-to-confirmation paths separately
  at 50/250/1000 rows; capture desktop and mobile/throttled baselines.
- [x] Test-first: browser drop with delayed confirmation must immediately show
  the new order. Observe the intended failure before application edits.
- [x] Regression tests: pending projection handles same-item/different-item remote
  moves, stale outcomes, removal, auto-advance, denial, disconnect and timeout.
- [x] Lock priority-versus-drag behaviour and additive relative-placement/outcome
  contract with actual reducer tests, including two/four authorized actors,
  legacy numeric clients and missing anchors. No schema changes by assumption.
- [x] Implement bounded optimistic local order and server reconciliation. Keep
  playback/auto-advance on canonical data. Do not send on every pointer movement.
- [x] Implement relative-placement action if the characterized current API cannot
  preserve intended placement. Keep legacy reducer compatibility and regenerate
  bindings. Exercise the actual module on local Spacetime before claiming proof.
- [x] Test-first: Watch mounts a bounded queue window with 1000 items; long-range
  pointer/touch/keyboard moves remain correct across unmounted rows.
- [x] Integrate Watch virtualization and Listen compact gesture parity; reuse the
  existing utility, retain focus and avoid scroll jumps on recycling/reconcile.
- [x] Add held-row accent/lift, insertion gap, neighbour movement and settling;
  retain reduced motion, compact rows, Play next/pin and swipe/tap-trash actions.
- [x] Run queue/reducer/browser regressions and repeated performance comparison.
  Record evidence and limitations before advancing to layout work.

Local evidence/limits: see [local-qa.md](local-qa.md). One early convergence timeout remains a tracked diagnostic; physical-device acceptance and complete baseline distributions remain open.

Review point: local movement is immediate, repeated clients converge, denial is safe,
large queues stay bounded, and no playback timing contract has changed.

## 027.2: Playlist review repair

Likely surfaces: shared `add-media/preview-cards.tsx`, associated Watch styles,
Listen `add-media/playlist-review-overlay.tsx` and existing shared selection tests.

- [x] Reproduce screenshot defects in the actual Watch Add path using a large
  playlist fixture with duplicates, long titles and unavailable entries.
- [x] Test-first: footer actions reachable/clickable in short landscape; row
  artwork/title bounds do not overlap; keyboard selection/import remains usable.
- [x] Correct row columns, scoped styling, themed semantic checkbox and scrolling
  containment. Preserve selection across filter/sort and every import strategy.
- [x] Verify desktop/portrait/landscape/keyboard heights, empty/filter-empty/error
  states and both shared Watch and separate Listen review paths.

Review point: visual cleanup is verified without changing playlist/import logic.
This batch may be developed independently of server queue work after its own gate.

## 027.3: Watch browse-first shell and shared header

Status: implemented locally; see [Watch QA](watch-local-qa.md). Real-room/device acceptance remains separate. No release or later Listen implementation in this slice.

Likely surfaces: `components/room/watch/`, existing ModeSwitcher, shared account
identity resolver and participant controls. Preserve desktop Listen geometry.

- [x] Test-first: fresh entry shows catalogue for allowed users and links for
  denied users; unresolved/error access is not treated as denial.
- [x] Test-first: no source produces no player or reserved rail; paused/buffering
  source keeps transport; permitted room playback survives catalogue denial.
- [x] Change desktop Watch browsing to use available width and a movable loaded
  player with an obvious Cinema action; retain mobile accepted docking behaviour.
- [x] Preserve browse state and the exact media/iframe instance between Home,
  Queue/Add/Social/More, docking, Cinema, fullscreen and orientation changes.
- [x] Add stable mobile Home Watch/Listen toggle with shared-room authority rules.
- [x] Group participants/count beside account/settings; resolve Google photo with
  chosen-avatar fallback; preserve save/name/member controls and spacing.
- [x] Verify all relevant Watch regression tests, long names/counts, tiny phones,
  landscape, text zoom, keyboard focus, dialogs and bottom reachability.

Review point: clear browse-to-Cinema flow, no empty rail and unchanged authority.

Owner QA follow-up: [Cinema, paused dock and row drag refinements](watch-refinements.md)
are implemented and locally verified; owner review remains before 027.4.

## 027.4: Mobile Listen compact-to-expanded flow

Status: owner local QA accepted on 2026-09-07; [Listen evidence](listen-local-qa.md). Release candidate checks are in progress. Live two-participant/provider/device acceptance remains pending before merge.

Owner-confirmed carry-forward requirements (2026-09-07):
- Reuse the shared compact virtualized queue, whole-row drag excluding controls,
  immediate optimistic reorder, Play next/pin, swipe reveal/second-swipe removal,
  trash alternative, and outside-click/focus/Escape menu dismissal.
- Reuse minimize/restore semantics: keep paused media available as a compact bar;
  remove the bar and reserved space only when there is no source. Tap or swipe up
  expands; minimize or handle swipe down returns to the prior browse destination.
- Keep a single provider instance through navigation and expansion; preserve
  volume, seek, room permissions and canonical playback. No duplicated iframe.
- Use Listen's artwork-focused expanded view and dynamic accents, not Watch's
  floating video geometry. Verify reduced motion, portrait/landscape, safe areas,
  no clipping/empty scrolling and touch/keyboard alternatives locally.


Likely surfaces: Listen layout/header/transport/discovery and responsive styles;
reuse the accepted shared room services. Recheck TASK-025/Media Session overlaps
immediately before edits, not only during this planning pass.

- [x] Complete a provider-feasibility check for compact browsing and stable
  expanded presentation; record supported geometry and any exact conflict.
- [x] Test-first: navigation retains source/iframe identity and playback; paused
  source retains bar; no-source state removes bar and its reserved space.
- [x] Implement shared mobile destinations with track/artwork/transport/Up Next
  Home and existing Discover/Visualizer access. Preserve desktop Listen.
- [x] Implement compact browse bar above navigation with readable title/artwork,
  primary transport and explicit expansion affordance.
- [x] Post-hoc regression coverage: drag up expands, cancelled drag settles back, handle drag down
  restores previous browse destination/scroll, tap/keyboard alternatives work.
- [x] Animate continuous compact-to-expanded presentation using efficient local
  progress; preserve the provider, source, local volume and room connection.
- [x] Resolve nested scrolling/seek gestures, focus restoration, Escape ordering,
  reduced motion, keyboard/safe-area and portrait/landscape geometry.
- [ ] Complete integrated Listen queue parity, permissions, previous/next, likes, TV/Media
  Session regressions and recommendations without expanding their scope.

Review point: Listen is clearly music-focused; compact bar does not obstruct
browsing, and expansion is usable without touch or animation.

## 027.5: Integrated QA, documentation and handoff

- [ ] Run all affected tests and required typecheck/lint/build/file policy gates;
  inspect exact routes at desktop/tablet/phone/landscape and reduced motion.
- [ ] Run local two/four-participant queue/permission/reconnect scenarios against
  the actual reducer module. Keep mock/browser evidence distinguished.
- [ ] Verify real direct/R2/YouTube source continuity and auto-advance when the
  approved QA environment is available; no new production mutation by default.
- [x] Provide an actual running local QA link and exact start command; reserve
  port 5383 if free (5381 was TASK-026). Never advertise an unstarted server.
- [ ] Request physical Huawei phone regression evidence once a concrete local or
  separately approved shareable build is ready. Prior release acceptance is not
  acceptance of this task; emulation does not prove physical fullscreen/rotation.
- [ ] Reconcile every acceptance row, unresolved intake item and TASK-025 overlap;
  update docs with measured results, not only test counts.
- [ ] Use qa-release-gate for final review; prepare atomic commit groups only on
  explicit Git approval. Recheck main before integration; release separately.

Suggested later atomic groups: queue protocol/projection; virtualized gestures;
playlist layout; Watch browse/header; mobile Listen expansion; final evidence.
Do not stage or commit this checklist as completed work until evidence supports it.

027.4 local follow-ups now include category-based shared settings, Watch toolbar
parity (no swipes), Social invite bar/member parity and Listen chat spacing. See
listen-local-qa.md for scoped evidence and remaining owner/device acceptance.


### Post-live-QA fine tuning

Owner reported successful three-device live playback/queue/mode QA and requested that this working production remain live. The remaining fullscreen, volume, display timing, Listen video, metadata-reconnect and one-off token findings are tracked with local evidence and unresolved boundaries in [live-qa-fine-tuning.md](live-qa-fine-tuning.md). These follow-up changes are not deployed or merged and require the targeted next acceptance round.
