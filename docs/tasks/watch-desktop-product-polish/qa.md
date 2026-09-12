# QA evidence

## Approach and review

- Test-first baseline: the original floating layout failed the structural
  non-overlap assertion (`.tmp/watch-polish-red`). The anchored implementation
  passed after the layout change.
- Added post-implementation coverage for catalogue actions, latest private
  admission ordering, queue filtering and final responsive details. Independent
  Sol/Terra reviews complemented these checks; do not infer test-first history
  for those additions.
- Review found and corrected duplicate Add blocking, stale private admission
  ordering, missing desktop Social navigation, search focus treatment and
  header overlap at 200% text size.
- Geometry checks caught retained floating coordinates on redock and a subpixel
  YouTube minimum-height shortfall. Redock restores structural placement;
  minimum stage height includes a small rounding allowance.
- Legacy assertions were updated only for approved navigation changes: explicit
  Float before drag/minimize, anchored queue link, Back to catalogue, visible
  catalogue heading and slider value. Mobile/keyboard/permission assertions kept.
- A transient missing import during parallel integration caused three legacy
  failures; it was removed immediately. A later complete run is required below.
- Screenshots use deterministic synthetic artwork/provider fixtures. They
  establish layout and lifecycle behavior, not real YouTube audio quality.

## Completed checkpoints

- 22 combined catalogue/action/product/fullscreen/drag checks passed before the
  final expanded mini-queue clarification (`.tmp/watch-polish-release`).
- Final expanded geometry, timeline/controls and adaptive Browse preview gap:
  7 passed (`.tmp/watch-polish-expanded-spacing`).
- Independent updated legacy run: 44/47 passed; the three failures were the
  transient compile error above (`.tmp/watch-legacy-final-rerun`).
- Queue unit suite: 78 passed. Typecheck, lint and local production build passed
  at the earlier integration checkpoint. Repeat affected final checks below.
- File length gate has no violations; existing advisory size warnings remain.
- Automated design hook's nine warnings are in unchanged `watch-room.css`
  (existing provider black backgrounds, small labels and legacy styles). The
  scoped new styles introduce no deterministic hook findings; visual review
  remains the evidence for appearance.

## Final release gate

Final combined browser run completed 58/59 passing. The sole failure was an
obsolete test attempting to click Catalogue after library access was denied;
the corrected fail-closed navigation assertion passed in its targeted rerun
(`.tmp/watch-final-denied-access`). All 59 cases therefore passed across these
runs. Shared queue regression: 13 passed. Queue units: 78 passed. Latest-play
and YouTube admission checks: 18 passed. Typecheck, full lint excluding local
exports, file-length gate and local production build passed.

After the final owner refinements, eight product/mini-queue checks passed,
followed by seven final spacing/navigation checks. These verify no duplicated
expanded Up next, 128px volume track/44px hit area with a real value change,
adjacent right-aligned back/dock buttons, four desktop sizes including 1024x600,
and preserved provider identity. Final typecheck and lint passed again.

Production clean-export build passed and deployment was promoted/live-verified.
See release.md.

## Scope isolation

Unrelated recording-review UI/routes/tests remain dirty locally and must be
excluded from staging and deployment. No hosted database or Spacetime publish.
Owner device/audio QA follows the clean production release.

## Bounded follow-up

The manual queue admission fence and catalogue coordinator were independently
reviewed. They reject stale choices within those paths and on lost permission.
A future shared arbitration layer should reserve intent before every asynchronous
admission across older independent surfaces (including legacy media-hub cards).
This release does not claim global serialization across all asynchronous controls.
