# 027.3 owner QA refinements

Status: implemented locally; automated/browser QA passed (2026-09-07). Owner and real-room acceptance remain separate.

## Final approved scope

- Cinema uses the available height; title, seek, playback and volume controls
  stay in one transport area instead of a narrow video strip and detached volume.
- Dock toolbar contains drag, paused minimize and Home/Cinema. Remove the
  two-way reposition control, redundant enlargement button and extra Cinema
  footer. Fullscreen remains in transport, including the mobile dock.
- Manual paused minimization shows a thumbnail/title bar. Clicking restores it;
  playing state restores provider presentation. Preserve the exact mounted
  media/iframe; minimization itself issues no playback or queue command.
- The paused container has no scrollbars or scrollable empty area. Hidden media
  retains valid dimensions without contributing a scroll region.
- Queue artwork remains the explicit play target. Mouse users drag the row
  text/background; touch users hold 280ms to lift. Quick vertical touch scrolls;
  horizontal swipes retain reveal-then-remove. Play, Next and menu controls never
  initiate a reorder; keyboard grip/menu and permission cancellation remain.
- Desktop/mobile Watch mode controls use the existing Video/Headphones icons,
  visible labels, compact outlined pills and artwork-derived selected accent.
- Remove the redundant Watch / Browse media navigation strip on both desktop
  and mobile. Mobile mode bar sits directly below identity with no separate
  panel background. Remove the outer content border/background for a continuous
  room surface; preserve the shared media-driven ambient gradient and accents.
- Keep Cinema's clear return action. Reach browsing through Add media / Catalogue
  and Cinema through the persistent player's Home button. Paused bar restores
  first, then exposes Home/Cinema. No second playback authority or provider.

These are refinements to 027.3, not implementation of 027.4. No Git or production
changes are authorized in this local round. Preserve earlier dirty slices.

## Verification chronology

Initial Cinema height, paused restore and body-drag assertions failed against the
old behavior (3 expected failures), then passed after implementation. Subsequent
owner scrollbar, mode-pill and navigation refinements have post-change browser
coverage plus visual inspection; no fabricated pre-change test evidence.

Regression QA found and corrected hidden landscape minimization controls,
second-swipe targeting over shifted action controls, and an old Cinema stage
flex shrink constraint. Test corrections follow the approved removed controls
and measured header boundary instead of the old fixed breadcrumb height.

Final commands/results and remaining integration acceptance follow below.

## Local QA results

- 608 Node tests passed (`node --experimental-strip-types --test`).
- TypeScript passed (`tsc --noEmit`). Production webpack build passed with
  `CIRCLE_NODE_TOTAL=3`; no deployment was performed.
- Source ESLint passed with one existing room-experience navigation warning.
  Command: `eslint . --ignore-pattern '.tmp/**'`. Unfiltered lint also inspects
  the earlier generated `.tmp/qa-0273/cache-before-clean-build` backup and fails
  on compiled chunks; the source check excludes that generated output explicitly.
- File-length policy: 0 violations, 18 warnings. `git diff --check` passed.
- 62 distinct browser scenarios passed across Watch browse-first, refinement,
  flow, fullscreen, owner-refinement, queue-gesture, touch and YouTube lifecycle
  suites, including corrective reruns. The earlier queue-response suite also
  passed its 12 local optimistic/virtualization/permission scenarios.
- Browser chronology is retained in ignored `.watch-refinements-*.log` files:
  initial 30-scenario run had one stale removed-header-height assertion; the
  43-scenario follow-up had a test helper wrongly assuming denied users have a
  Catalogue button and a real short-landscape grid placement issue. Corrected
  assertions/helper and layout were rerun successfully. Additional landscape
  visual review found hidden secondary controls and corrected their placement;
  volume/fullscreen now fit above navigation. This is not a first-run-pass claim.
- Visually inspected desktop Cinema/browsing in Chrome and screenshots at 390px
  portrait and 844x390 landscape. Checked paused overflow at 1440, 390 and 844px,
  responsive flows from 320px to 1920px, touch hold/scroll/play separation,
  two-swipe removal, keyboard/permission cancellation and same-node continuity.
- YouTube coverage uses a provider lifecycle fixture; it proves iframe retention
  and presentation behavior, not current live YouTube playback.

## Changed surfaces and handoff

WatchModeLayout and watch-browse-layout.css own the Cinema, dock, paused-bar and
continuous-navigation surface changes. CompactQueueRow, useQueueGestures and
compact-queue.css own body dragging while retaining explicit actions. Existing
ModeSwitcher icons/authority are reused. Browser regressions now follow the
visible Add / Catalogue and player Home paths, including denied access.

Task notes, DESIGN.md, README and HANDOFF link this follow-up. No commit, push,
production credential copy, backend publish or deployment occurred. Earlier
027.1/027.2 changes remain uncommitted in this isolated worktree.

Review: http://127.0.0.1:5383/dev/watch-design . Real authenticated permissions,
two-participant playback, real R2/YouTube and physical-phone gesture acceptance
remain integration gates. The next product slice is 027.4 only after owner review.

## Final owner detail/menu follow-up (approved 2026-09-07)

Do not add another Cinema navbar button. Queue ellipsis menus close on outside
pointer interaction, focus leaving the menu, or selecting an action; preserve
Escape/focus return and do not swallow the destination click. Attach dismissal
listeners only while a menu is open, including virtualized queue rows.

Media details become a centered, bounded focal surface. Replace the unused
Discover/Library/History bar with Back to results and hide Catalogue/YouTube
source selection only while details are actually visible. Restore source/tabs,
search, collection, scroll and trigger focus on return; keep the same player.
Use a restrained downward entrance on detail content and returning navigation,
with reduced-motion disabling motion. Local-only implementation/QA continues;
owner acceptance is conditional on these final fixes. No Cinema-button addition.

Final detail/menu verification: 3 initial assertions failed against the previous
behavior; implementation made outside dismissal and both detail layouts pass.
One follow-up menu assertion initially targeted a control physically covered by
the open popup; corrected it to an unobscured earlier row and verified that the
first menu closes while the second opens. All 7 focused browser checks passed:
menu pointer/focus dismissal, desktop/mobile centering and navigation, reduced
motion, source restoration, detail permissions/actions, and virtual Listen menu
reachability. Search and trigger focus return without replacing the media node.
Desktop 1440px and mobile 390px screenshots were inspected after entrance motion.

Changed-file lint and TypeScript passed, 190 queue/player tests passed, production
webpack build passed, and diff/file-length checks passed (0 violations, 18
existing warnings). The local preview was restarted on 5383. This updates actual
shared queue and Watch product components; fixtures only provide local QA data.
No Git publication or deployment. Owner's final visual acceptance remains theirs.


## Mobile catalogue mode control follow-up

Owner request: hide the mobile Watch/Listen switch in catalogue browsing and
media details. Keep it on the main Home player view; desktop remains unchanged.
This is a local presentation change with no playback or permission changes.

Verification: all 3 focused mobile browser checks pass (catalogue hiding, Home restoration, shared mode request and permission/disconnection guards). Updated the older test to return through Add/Catalogue, since the dock-only cinema button is absent on Home. Changed-file lint passed; inspected the 390px catalogue screenshot. Local only.
