# TASK-018 Phase 3A Opera GX Gate

Date: 2026-08-20
Verdict: **Revise Phase 3A**
Branch: `task/task-018-phase3-renderers`
Exact tested head: `35454a35e7072d35ae9c5dc6ffc56a0e3f67d735`
Extension: tested `0.3.0`; cleanup revision `0.3.1`

## Decision

The renderer bridge is functionally sound and inexpensive at 24 FPS. Mirror
Spectrum is the safer default and Siri Ribbon remains an accepted optional
experimental mode at 24 FPS. Phase 3A is not complete because repeated capture
cleanup produced a reproducible service-worker warning:

> Mistake Watch capture cleanup failed: Error: Could not establish connection.
> Receiving end does not exist.

The warning did not break capture, audio, playback, queue state, or cleanup. It
still fails the explicit clean-console gate and must be corrected with a
test-first idempotent-teardown change before promotion.

## Three-Run Median Evidence

CPU and GPU values are aggregate Opera-process telemetry rather than exact tab
measurements. Each cell is median / mean / p95 / peak.

| State                  | Duration |                     CPU % |                     GPU % |
| ---------------------- | -------: | ------------------------: | ------------------------: |
| Playback baseline      |  120s x3 | 0.82 / 1.11 / 2.42 / 3.64 | 5.31 / 5.36 / 5.72 / 6.38 |
| Detector only          |  120s x3 | 1.00 / 1.11 / 2.04 / 3.22 | 5.11 / 5.18 / 5.56 / 6.13 |
| Mirror fixture, 24 FPS |  120s x3 | 0.99 / 0.98 / 2.17 / 2.85 | 1.07 / 1.07 / 1.19 / 1.42 |
| Mirror live, 24 FPS    |  120s x3 | 0.81 / 0.94 / 1.84 / 3.07 | 1.10 / 1.09 / 1.24 / 1.31 |
| Siri fixture, 24 FPS   |  120s x3 | 0.81 / 0.92 / 2.04 / 2.98 | 1.08 / 1.14 / 1.24 / 4.45 |
| Siri live, 24 FPS      |  120s x3 | 1.00 / 1.04 / 2.04 / 3.27 | 1.09 / 1.09 / 1.22 / 1.37 |
| Paused combined        |   60s x3 | 0.00 / 0.18 / 0.60 / 1.18 | 0.00 / 0.01 / 0.00 / 0.23 |

- Detector CPU delta versus playback baseline: `+0.18` percentage points.
- Mirror and Siri live cost at 24 FPS is effectively equivalent.
- Siri's reproducible 30 FPS GPU median was approximately `5.3%`, compared with
  Mirror's `2.05%`; keep both at 24 FPS and retain Mirror as the default.
- Direct renderer-versus-baseline GPU subtraction is invalid because the room
  video and extension Lab had different visibility during those samples.

## Functional, Audio, And Privacy Results

- Focused extension tests: 27/27 passed.
- Live rhythm lock: 120 BPM at 100% confidence; fixture: 120 BPM at 92%.
- Low-confidence input remained in the analysing state.
- Mode and FPS switching did not restart capture.
- Pause, hidden state, navigation, tab closure, extension reload, and three
  start/stop cycles cleaned up without duplicate Lab tabs or loops.
- Audio remained audible with no detected echo, clipping, distortion, or
  steady-state level issue. Objective RMS/LUFS parity remains unavailable.
- Queue, playback, and authority behavior showed no regression.
- Extension network and storage remained empty; CSP retained
  `connect-src 'none'`; only bounded `RhythmFrameV1` scalar values crossed
  extension contexts.

## Required Revision

1. Add a failing regression test for the race where the offscreen document
   disappears between the existence check and `getStatus()` during cleanup.
2. Make the missing teardown receiver an idempotent terminal condition while
   continuing to report unexpected cleanup errors.
3. Rerun focused extension tests and the full local release gate.
4. Repeat three start/stop cycles in Opera GX and require a clean service-worker
   console before promoting Phase 3A.

## Revision Implementation Evidence

The local revision was implemented test-first on 2026-08-20. Phase 3A remains
in **Revise** until the Opera GX manual gate passes.

- **Baseline:** The production worker still logged the known missing-receiver
  warning; no cleanup fix was present.
- **Red:** `node --test tests/extensions/service-worker-lifecycle.test.mjs`
  exited `1` because the warning array contained `Mistake Watch capture cleanup
failed: Error: Could not establish connection. Receiving end does not exist.`
- **Implementation:** The service worker now recognizes only that exact missing-
  receiver terminal condition, closes any remaining offscreen context, and
  resets the badge to idle. Unexpected cleanup errors retain the warning path.
- **Green:** The same focused test passed 1/1.
- **Affected suite:** All extension tests passed 28/28.
- **Regression:** `npm test` passed 406/406; typecheck, ESLint, changed-file
  Prettier, file-length policy, production build, and `git diff --check` passed.
- **Build environment:** The first Turbopack attempt rejected the worktree's
  external `node_modules` junction. A worktree-local `npm ci` installation was
  used and the unchanged production build command then passed.
- **Dependency note:** `npm ci` continues to report six high-severity advisories.
  No unrelated automatic audit fix was applied.
- **Manual gate:** Pull the exact revision commit, reload extension version
  `0.3.1`, run three capture start/stop
  cycles, and confirm the service-worker console stays clean with capture, audio,
  badge, Lab, playback, and queue cleanup intact.
