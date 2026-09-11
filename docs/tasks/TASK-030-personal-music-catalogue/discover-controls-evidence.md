# TASK-030.8 Discover controls evidence

2026-09-11 — local implementation and fixture verification complete; this file
does not claim deployment or physical-device testing.

## Implementation

Owner-approved follow-up: feedback confirmation (including "Hidden from
suggestions for 7 days") must dismiss after a short Undo window rather than
persist indefinitely. Use 10 seconds of unpaused visibility; pause while hovered,
keyboard-focused or an Undo request is pending. Retain the actual seven-day
suppression and later restoration through Suggestion controls. Dismissal itself
must never send a neutral/Undo mutation. Provide explicit close without stealing
focus. Add replacement-notice/timer and suppression-preservation browser checks.

- Your regulars starts as artwork/title tiles with recorded-play counts still
  visible. Desktop tiles use the existing 112px mobile-card reference; narrow
  panels use 96px tiles so three fit at the tested 390px viewport.
- Click/tap opens the in-flow details card without issuing Play or a queue
  command. Separate Play, Like, Add to queue, Add next and More controls remain
  permission-aware. Recommended/Rediscover rows expose Add next beside Add.
- Outside pointer/focus dismisses; Escape restores focus to the compact trigger.
  Opening focuses the first available action. The existing portal menu remains
  usable without dismissing its parent card. Collapsed/closing details are inert.
- Reuses the existing mobile RecommendationCard's 180ms width/reveal/reverse
  dismissal. Reduced motion disables the transition and closes immediately.
  Song-derived accent, ambient gradient, counts, feedback and one vertical
  scroller remain unchanged.

## Verification

Test-first: three new browser tests failed against the prior implementation
because compact triggers/visible Add next did not exist. They passed after the
change. Added permission coverage and strengthened focus-away/actual
`isPlayNext: true` command assertions afterwards.

- `WATCH_DESIGN_QA=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5371 npx playwright test
  tests/e2e/personal-discover-controls.spec.ts tests/e2e/personal-discover.spec.ts
  --workers=1`: **22 passed** (59.9s).
- Final four-control-test rerun: **4 passed** (12.6s); checks explicit next semantics, pending duplicate
  prevention, permission changes, keyboard focus, outside dismissal and reduced
  motion.
- Existing regression covers no automatic provider searches on mount/song change,
  retained playback across tabs, pending queue confirmation, reversible feedback,
  mounted metadata expiry, empty/warming state and bottom-scroll visibility.
- Desktop1680/mobile390 screenshots were opened and visually inspected; landscape
  844 and tablet1024 overflow checks also passed. Generated local screenshots:
  `test-results/regular-controls-1680.png`, `regular-controls-390.png`, and the
  existing `personal-discover-*` screenshots. These are ignored QA artifacts.
- Scoped ESLint passed for PersonalTrackView, expansion hook and new tests.
  Repository-wide build/typecheck/release gates are coordinated by the root task.

Latest integrated verification after owner toast follow-up: **25 browser tests
passed** (1.1m), running `personal-discover.spec.ts`,
`personal-discover-controls.spec.ts` and `personal-feedback-notice.spec.ts`.
Two toast tests first failed on persistent notice/missing dismiss control, then
passed; a third proves a newer feedback action gets a fresh Undo window. Expiry
does not undo suppression; Suggestion controls can still restore the track.
Hover/focus pause and explicit dismissal are covered. Pending Undo and background
tab pause are implemented, including a feedback response arriving after the tab
became hidden; the initial-hidden case is source-reviewed rather than directly
simulated by the browser fixture. Toast buttons have 44px minimum targets.

The original fixture incorrectly returned null expiry for `not_now`; corrected
it to seven days to exercise the real suppression contract. Final Like integration
also received a failing-then-passing case: after a complete loaded account
snapshot, a missing preference must override a stale catalogue Like as neutral,
including the next toggle's target state. Scoped ESLint passed again after these
changes.

One broader run was interrupted after encountering another concurrent file
write's transient invalid-UTF8 dev compile error. The clean complete rerun above
is the acceptance result, not the interrupted run.

## Design review

Used DESIGN.md enforcement and Impeccable advisory audit. Retained existing
tokens, translucent surfaces, 44px expanded/mobile action targets and approved
artwork-derived palette. Corrected an initial off-ramp 10px action label to the
existing label-sm token. The advisory width-animation finding is intentional:
the owner explicitly requested the established mobile card expansion/reverse
pattern. It runs only on opening/closing one compact card with a reduced-motion
alternative; no detector suppression or design-system exception was added.

## Files

- `components/room/listen/discovery/personal-track.tsx`
- `components/room/listen/discovery/use-regular-expansion.ts`
- `components/room/listen/discovery/personal-discovery.css`
- `components/room/listen/discovery/personal-regular-controls.css`
- `components/room/listen/discovery/personal-discovery-panel.tsx`
- `tests/e2e/personal-discover-controls.spec.ts`
- `tests/e2e/personal-discover.spec.ts` (existing controls now expand first)
- `tests/e2e/personal-discover-live.spec.ts` (same interaction update; not run live)
- `components/room/listen/discovery/personal-feedback-notice.tsx`
- `components/room/listen/discovery/use-personal-discovery.ts` (local notice dismiss)
- `tests/e2e/personal-feedback-notice.spec.ts`
- `tests/fixtures/personal-discover-fixture.ts` (realistic seven-day expiry)

No production queue/playback/Like mutations, provider calls, Git publication or
intake edits were performed for this UI slice.
