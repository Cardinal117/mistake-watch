# 027.3: Watch browse-first local candidate

Updated: 2026-09-07. Scope: the approved Watch shell and header slice only.
Changes are in real Watch product components in the isolated
`codex/task-027-room-flow` worktree. The development route supplies fixture data;
it is not a separate implementation of the room UI.

## Local review

- [Loaded room / catalogue](http://127.0.0.1:5383/dev/watch-design)
- [Empty room](http://127.0.0.1:5383/dev/watch-design?empty=1)
- [Catalogue denied / links](http://127.0.0.1:5383/dev/watch-design?access=denied)
- [Catalogue failure / retry](http://127.0.0.1:5383/dev/watch-design?access=error)

Use the existing local server command in [local-qa.md](local-qa.md). These fixture
options never grant access to private media and are unavailable in production.

## Implemented behavior

- Fresh entry browses the catalogue when allowed. Only a resolved access denial
  selects YouTube & links. Loading and errors retain the catalogue status/retry
  surface; denied users have no dead catalogue-return button.
- An empty source removes the player and reserved rail on both screen sizes.
  Paused or buffering sources retain the existing provider and transport. Room
  playback permission remains independent of catalogue access.
- Desktop browsing uses the full width. The loaded player moves to four corners
  by pointer or keyboard; paused minimization and Cinema keep
  the same media node. Redundant dock buttons have been removed. Bounds follow measured header/navigation sizes, including
  text zoom and resize. Hidden desktop navigation no longer supplies a false
  zero-height lower drag boundary.
- Mobile Home retains a visible shared Watch/Listen mode switch outside the
  scroll area. It calls the existing shared-room action with authority/connection
  gating; expanding or docking does not change room mode.
- Participants/count and account controls are adjacent. The account control
  uses the available Google photo, falling back to the chosen room avatar when
  absent or broken. Participant identities, save star, live rename, host crown,
  invite and audience behavior are preserved.
- Existing short-landscape player geometry is retained with a compact inline
  mode row. Desktop header wraps when text enlargement needs another row.
- No Listen layout or provider/backend logic was changed in this slice. Earlier
  queue/playlist work remains present; 027.4 remains pending.

## Verification chronology

Before application edits, four new browser assertions failed for the intended
reasons: initial `watch` instead of `browse`, visible empty player, catalogue
remaining selected after explicit denial, and the absent mobile mode toggle.
All four passed after implementation. Additional coverage was added after the
implementation for status/retry, photo fallback, docking/resize, mode dispatch,
Cinema continuity and enlarged text.

Visual review caught landscape control clipping and 200% text overlap that simple
viewport-bound assertions did not detect. Both were corrected and the text test
now checks identity/mode non-overlap. Desktop, phone and landscape screenshots
were inspected; a 390px local Opera surface was also inspected through browser
control. Emulation is not physical-device acceptance.

Older tests now explicitly enter Home before testing mobile fullscreen, expect
links after access denial, and allow the approved compact 180px desktop direct
video viewport. YouTube retains its 200px minimum. The existing lazy-loading
source guard follows the resolved workspace name; no lazy-loading gate was removed.

## Initial 027.3 verification results (before owner refinements)

- `node --experimental-strip-types --test`: **608 passed**. The initial run had
  one obsolete source-string guard (`screen` versus resolved `workspace`); the
  guard was updated without removing its lazy-loading assertion and rerun green.
- `tsc --noEmit`: passed. Clean production build also completed TypeScript.
- Whole-project ESLint: **0 errors**, one existing warning in
  `room-experience.tsx:208`. Changed Watch files were linted again after the
  Escape adjustment with no findings.
- File-length policy: **0 violations**, 18 existing warnings. `git diff --check`
  passed and 23 relative packet links resolved.
- `CIRCLE_NODE_TOTAL=3 next build --webpack`: **passed** on a clean generated
  cache, compiling and prerendering all 29 static routes. The first attempt
  failed in Webpack `WasmHash._updateWithBuffer`; no application/dependency
  workaround was introduced. The old generated cache was moved into ignored
  `.tmp/qa-0273/cache-before-clean-build` for diagnosis.
- Browser coverage spans **75 Watch scenarios** (including 12 new 027.3 cases)
  and **18 queue/playlist regressions**. The broad runs were not clean passes:
  the final Watch sweep had 71 passes/4 failures and queue/playlist had 16/2.
  Audience startup, page-loading, Listen fixture navigation and delayed-seek
  failures were rechecked on the restarted server. Do not present these as
  93 uninterrupted passes or as real-provider acceptance.
- The repeated fast Cinema/Escape case exposed a commit-to-effect listener
  timing gap. Installing the existing Escape handler in a layout effect keeps
  it current before the next keyboard event. The unchanged regression then
  passed **3/3 repeats**. The audience case passed **2/2 repeats**.
- Final serial recheck: **24/24 passed**, covering every new 027.3 case,
  fullscreen, each remaining failed scenario, queue timeout/Listen filtering,
  owner management, collection/Cinema focus restoration and delayed YouTube
  seek. All 93 distinct covered scenarios have passing evidence across these
  runs; loading failures and the original hash error remain disclosed above.

Commands used (from the isolated worktree):

```powershell
$env:WATCH_DESIGN_QA='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5383'
node node_modules/@playwright/test/cli.js test tests/e2e/watch --workers=1
node node_modules/@playwright/test/cli.js test tests/e2e/playlist-layout.spec.ts tests/e2e/queue-response.spec.ts --workers=1
node node_modules/@playwright/test/cli.js test tests/e2e/watch-redesign-flow.spec.ts --grep 'Collections filter' --repeat-each=3 --workers=1
node node_modules/@playwright/test/cli.js test tests/e2e/watch-browse-first.spec.ts tests/e2e/watch-fullscreen.spec.ts tests/e2e/watch-redesign-flow.spec.ts tests/e2e/watch-youtube-sync-cadence.spec.ts tests/e2e/queue-response.spec.ts --grep 'fresh Watch|empty source|explicit catalogue|mobile Home|pending and failed|Google photo|desktop docking|responsive Home|mobile Cinema|mode request|desktop held|text zoom|Fullscreen|fullscreen|Collections filter|Responsive navigation 390|Owner management|1600ms|reconciles timeout|Listen filtering' --workers=1
```

Transient traces are kept in ignored `.tmp/qa-0273/`; the local server was
restarted and is serving port 5383. The final recheck exercised that restarted
server. Screenshots were reviewed at desktop, tablet, 320/390px portrait,
844px landscape and 200% desktop text size.

## Files in this slice

- `watch-mode-layout.tsx`, `watch-browse-layout.css`: default access surface,
  empty-source geometry, shared mobile mode control, Cinema and desktop docking.
- `watch-room-header.tsx`: adjacent member/account controls and Google fallback.
- `use-watch-dock.ts`, `use-watch-dock-bounds.ts`: measured drag/resize bounds.
- `watch-workspaces.tsx`: no dead catalogue return after explicit denial.
- Watch fixture, `watch-browse-first.spec.ts`, existing fullscreen/navigation
  tests and the lazy-loading source guard: behavior and regression evidence.
- TASK-027 packet, README, handoff and roadmap: local state and review routes.

Suggested future atomic commit subject: `feat(watch): browse first with a persistent desktop dock`.
This is only a suggested group, not staging or commit approval.

## Remaining acceptance

This is a local review candidate, not a release or production verification.
Real authenticated allowed/denied accounts, two-participant mode switching,
real R2/YouTube playback and physical-phone acceptance remain integrated QA gates.
No production secrets were copied, no service was published, and no Git commit,
push or deployment was performed. Keep the earlier 027.1 timing/convergence
limitations in [local-qa.md](local-qa.md) open. Do not close intake reports from
fixture evidence. The next implementation slice is 027.4, after owner review.

## Owner refinement checkpoint

[Final approved refinements and follow-up QA](watch-refinements.md) cover Cinema
sizing, paused scroll-free bars, body dragging, shared icon pills and removal of
the redundant desktop/mobile navigation strip and outer content panel. Dynamic
artwork backgrounds remain. Review that checkpoint for the latest evidence;
the initial results above are retained as history, not rerun claims.
