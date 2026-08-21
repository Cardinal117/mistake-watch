# TASK-018 Phase 3B Opera GX Gate

Date prepared: 2026-08-20
Status: **Awaiting laptop QA**
Branch: `task/task-018-phase3-renderers`
Extension: `0.4.0`

## Local Implementation Evidence

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
