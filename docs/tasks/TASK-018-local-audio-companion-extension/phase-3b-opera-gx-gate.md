# TASK-018 Phase 3B Opera GX Gate

Date prepared: 2026-08-20
Date updated: 2026-08-21
Status: **Revise confirmed; corrective scope included in pending `0.5.0` gate**
Branch: `task/task-018-phase3-renderers`
Extension: `0.4.1`

## Initial Local Evidence

- Test-first baseline: 16 focused renderer tests ran with eight intentional
  failures before implementation. The failures covered unsupported modes,
  missing centered Dot Waves output, and missing renderer lifecycle switching.
- Focused renderer suite: 16/16 passed after implementation.
- Complete extension suite: 38/38 passed.
- Complete repository suite: 416/416 passed.
- TypeScript, ESLint, file-length policy, production build, Prettier, and
  `git diff --check`: passed.
- Desktop and 390-pixel deterministic fixture checks: all three modes rendered
  visible nonblank output with correct labels, no overflow, and no console
  warning or error.

These checks establish local implementation readiness only. The controlled
Opera GX resource, audio, and lifecycle evidence below remains required before
Phase 3B promotion.

## Initial Laptop Verdict

The owner-priority Opera GX laptop returned **Revise Phase 3B** for exact commit
`af9fb33a291aa19ba3c1842c79b0ec09685384c9`. Extension `0.4.0` reached `PCM`,
but Rhythm Lab crashed during construction with:

```text
TypeError: this.renderer.init is not a function
```

The real engine unconditionally used the renderer lifecycle contract, while the
legacy Mirror Spectrum and Siri Ribbon factories returned only `id` and
`render`. The injected lifecycle test double masked that mismatch, and the
per-renderer tests used optional lifecycle calls. No renderer performance data
from this failed run is valid.

## `0.4.1` Repair Evidence

- A real-default startup regression was written first and failed with the same
  `renderer.init` exception before production code changed.
- Mirror Spectrum and Siri Ribbon now use the common renderer factory and
  receive no-op `init`, `resize`, and `dispose` methods.
- The real engine starts on Mirror Spectrum, switches through all five modes,
  returns to Mirror Spectrum, and destroys cleanly.
- Focused renderer suite: 17/17 passed.
- Complete extension suite: 39/39 passed.
- Complete repository suite: 417/417 passed.
- TypeScript, ESLint, file-length policy, production build, Prettier, and
  `git diff --check`: passed.
- Browser-real local startup loaded Dot Waves at 24 FPS on the deterministic
  fixture with a visible 1280 x 720 canvas. Switching through every mode and
  back to Mirror Spectrum produced no console warning or error.
- A dedicated Playwright startup regression serves the real extension entrypoint,
  constructs the Lab through its default Mirror renderer, switches through all
  five modes, and fails on page or console errors. It passes 1/1.

## `0.4.1` Laptop Rerun

The startup repair passed on the Opera GX laptop at exact commit
`9647c5b634f50ccb280eb50d390b030f97ccf1cd`. Badge activation, one-Lab startup,
all five renderer switches, three capture cycles, hidden-tab behavior, and
navigation cleanup worked without the former lifecycle exception.

The rerun still returned **Revise Phase 3B** because capture remaining active
also kept the canvas animation loop active while playback was paused. Aggregate
Opera GPU stayed at 4.41% for Dot Waves, 6.40% for Signal Bloom, and 43.27% for
Constellation during the paused samples. Constellation also clipped its
energized field at the narrow viewport boundary.

Computer control stopped after the captured-tab closure action, so tab-close
read-back, extension-reload cleanup, final diagnostics, and exact room-state
restoration were not completed. No repository write occurred on the laptop.

The pending `0.5.0` correction was written test-first. It freezes the renderer
after 700 ms of sustained silent analyser frames without stopping capture or
the detector, resumes on the next audible frame, and constrains Constellation
circles to an inset viewport. The focused regression changed from two intended
failures to 20/20 passing tests. These local results require one compact laptop
rerun before promotion.

## Scope

Validate Dot Waves, Signal Bloom, and Constellation inside the private extension
Rhythm Lab. This gate does not authorize website integration, SpacetimeDB
publication, a production deployment, or public extension distribution.

## Required Evidence

For each mode at 24 FPS, collect three controlled runs using the same song and
Opera GX environment:

1. Renderer-only with the deterministic 120 BPM fixture.
2. Combined tab capture, first-party detector, and live renderer.
3. Paused or inactive return-to-idle behavior.

Report aggregate Opera CPU, GPU, and memory with the same counter method used in
Phase 3A. Treat values as comparative process telemetry rather than exact tab
attribution.

## Functional Gate

- Dot Waves visibly concentrates its strongest response around the center.
- Signal Bloom and Constellation remain nonblank at desktop and narrow sizes.
- Mode changes do not restart capture or create a duplicate Lab or frame loop.
- Paused, hidden, reduced-motion, stale-input, navigation, tab-close, and stop
  states stop animation and cleanup correctly.
- Audio remains audible without echo, doubling, distortion, or sustained level
  change.
- Playback, queue, and authority state remain unchanged.
- Extension console, Network, and storage surfaces remain clean.
- No PCM, FFT arrays, media URLs, account data, or room secrets leave the local
  analyser path.

## Classification Gate

- Dot Waves remains **beta / very high power**.
- Signal Bloom remains **experimental / high power**.
- Constellation remains **experimental / extreme power**.
- Static Artwork remains the production-safe default.

Phase 3B may be promoted when functional and privacy checks pass and each mode's
resource evidence is recorded honestly. The experimental classifications allow
owner-approved use; they do not convert a failed performance budget into a pass.
