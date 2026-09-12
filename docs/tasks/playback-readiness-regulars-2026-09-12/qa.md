# Local verification — 12 September 2026

## Post-release width correction (deployed)

Owner reported wasted wide-screen space and requested dynamic screen sizing.
Removed the fixed eight-card page cap; the existing ResizeObserver now computes
capacity solely from the available rail width and existing card/gap dimensions.
Only the current page mounts. The 1920px regression failed with eight cards before
the change and passes with eleven afterward. Resizing to 390px renders three;
resizing back restores eleven. Mobile paging/drag and reduced-motion checks pass,
as do scoped ESLint and typecheck. Wide screenshot visually reviewed at
`.tmp/regulars-ui-qa/regulars-wide-fill.png`. No playback code changed.
Source commit `8fa6c42` is pushed to main. Clean production deployment
`dpl_9JR2e4cbJPt9KxjJ1HEDHaFZU7U1` is live on watch.mistakestudios.com;
Vercel build/typecheck, domain inspection, health200/readiness200 and excluded
recording-review404 checks passed. Unrelated local work remains excluded.

## Result

Implementation and independent review pass locally. Subsequent commit, server
publish and clean frontend candidate verification are recorded in [release.md](release.md).
Live-domain frontend promotion subsequently received explicit approval and passed
live inspection and health/readiness/protected-route checks.

## Playback changes

- Manual YouTube queue selection and paused resume use readiness before the
  room timeline starts, including when automatic queue advance is disabled.
- Readiness keeps source/queue/occurrence/raw-revision and authority checks.
  Timeout and permission loss cancel intent. A late acknowledgment from the
  previous start no longer cancels a newer manual Next selection.
- Clock-only changes cannot bypass YouTube correction settling. Immediate
  status/visibility resync paths now share the periodic correction policy.
- Joining clock estimation matches the device's own admission request for a
  midpoint estimate where available. Subsequent arrivals use bounded low-delay
  samples with expiring buckets and gradual convergence.
- Native Watch/Listen use up to 2% pitch-preserving rate correction for modest
  drift, restore canonical rate when settled, and guard delayed seeks against
  repeated 750ms reissuance. Existing terminal/replay behavior remains covered.

## UI changes

Regulars now expose all available items through responsive pages (up to eight
mounted cards, three at the tested 390px viewport), arrows and drag/swipe.
The redundant subtitle/count block is replaced by a dismissible info control.
Discover scrollbars, sort/minimum-play/liked filters use existing room accents.
Loading skeletons remain available. Card-specific artwork accents and actions
are preserved. Reduced-motion, pointer cancellation, accidental-click prevention,
mobile popover bounds and 44px mobile arrows were checked.

## Evidence

- `node --test tests/player/*.test.mjs tests/youtube/*.test.mjs tests/spacetime/*.test.mjs`:
  **283 passed**. Red-before-green regressions cover clock gate bypass, delayed
  native seek repetition, gentle native drift/rate restoration, manual readiness,
  rapid Next acknowledgment ordering and clock-minimum expiry. Additional
  post-implementation checks cover actual hook resume wiring and timeout behavior.
- Three controlled YouTube browser checks pass: delayed three-second start,
  immediate seek and 1600ms seek with unrelated room updates.
- Reviewer UI run: 35/36 initially; native browser image dragging caused the
  remaining drag test failure. Native drag was disabled for the rail, the focused
  test passed, then the entire affected `personal-browse` suite passed **9/9**.
  Unaffected suites were not needlessly repeated.
- Frontend typecheck, scoped/full ESLint (excluding temporary `.tmp` artifacts),
  production frontend build and file-length policy pass. Existing size warnings
  remain; no ceiling violations.
- SpacetimeDB module build passes. Its CLI warned that it did not find a module
  local TypeScript compiler; explicit `npx tsc --noEmit -p spacetime/tsconfig.json`
  also passed, so compilation was not the sole typecheck evidence.
- One GPT-5.6-sol medium assistant implemented the UI and independently reviewed
  playback. Root reviewed the UI diff and desktop/mobile screenshots. No further
  blocking findings after the rapid-Next fix and clock expiry hardening.
- Local screenshots: `.tmp/regulars-ui-qa/regulars-desktop.png` and
  `.tmp/regulars-ui-qa/regulars-mobile-info.png`.

## Limits and next verification

These are controlled code/browser checks, not real multi-device audible proof.
YouTube retains a two-second routine drift deadband to avoid frequent audible
seeks; arbitrary subtle YouTube rate correction is not supported. Path asymmetry,
provider buffering and autoplay restrictions remain real constraints.

The initiating YouTube player gates startup. Slower followers still catch up;
this is not an all-participant readiness barrier. Native startup still uses the
existing room timeline: the native fix here addresses correction repetition and
gentle catch-up, not a new native readiness protocol. Test these separately if
native slow-load opening loss is observed.

Next: release the reviewed frontend and prepared-start server change together,
then compare host/guest and same-account devices under normal and delayed loading.
Measure actual drift and correction frequency before deciding on continuous RTT
probes or a bounded follower-readiness protocol. The original minutes-off refresh
intake remains open until that real affected case is verified.

Preserve/exclude the pre-existing manual recording-review UI/API work when
preparing the release; the successful local build includes those worktree files
and is not itself a clean deploy artifact.
