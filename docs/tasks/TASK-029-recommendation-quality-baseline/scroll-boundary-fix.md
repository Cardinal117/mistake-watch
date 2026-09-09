# TASK-029 empty-player Discover scroll correction

Owner reported the bottom recommendation row clipped at maximum desktop scroll
on 2026-09-09. Scope: preserve the accepted layout and gradient while fitting the
stage into the space remaining below the empty-player message. No ranking,
provider, playback, queue or data-model changes.

Baseline: `feef817`. The new browser regression reproduced a scroller bottom at
857px beyond its clipping parent at 816px. Existing loaded-player/responsive tests
had missed the additional empty-state message. Red run: `WATCH_DESIGN_QA=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5387 npx playwright test
tests/e2e/personal-discover.spec.ts --grep Empty-player --workers=1`, exit 1.

Plan: make the desktop discovery wrapper a flex column and let the stage consume
the remaining height; retain the existing inner scroller. Verify bottom-row/menu
reachability plus existing desktop/mobile/landscape/tablet tests.

Implemented: desktop wrapper uses a flex column; stage uses remaining height.
The exact regression and all nine existing Personal Discover browser checks pass
(10 total), including desktop controls, gradient continuity, mobile portrait,
landscape and tablet. The bottom-state screenshot was visually inspected: final
row and menu target are fully above the queue with bottom padding intact.
Typecheck and production build pass. Full lint has no errors; its 16 warnings
come from generated code inside the ignored prior release archive. Source lint
with `.tmp/**` excluded is the relevant code check.

Design hook review: the flagged translucent white border and black shadow already
exist in the baseline and match the accepted translucent room treatment. They are
unchanged by this sizing fix, so these are contextual false positives for this
diff. No palette changes or suppressions were introduced.
