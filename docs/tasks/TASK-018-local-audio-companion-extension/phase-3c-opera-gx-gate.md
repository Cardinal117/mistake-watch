# TASK-018 Phase 3C Opera GX Gate

Date: 2026-08-21
Status: **Promoted**
Branch: `task/task-018-phase3-renderers`
Extension: `0.5.1`

## `0.5.0` Laptop Verdict

The exact checkpoint `ba3f9f36b6c13934b83da4a7c22c763786f7ea37`
passed 32/32 extension tests on the Opera GX laptop, but capture failed before
reaching `PCM` or opening Rhythm Lab:

```text
Mistake Watch audio capture failed: Error: Illegal invocation
at assertSuccessfulResponse (service-worker.mjs:247:11)
at toggleCapture (service-worker.mjs:100:5)
```

Renderer fidelity, paused idle, resource measurements, narrow Constellation,
and runtime privacy checks were correctly treated as blocked. The room,
playback, queue, authority, and repository state remained intact.

## Root Cause And Repair

Phase 3C copied the browser's native `setInterval` and `clearInterval`
functions into the capture dependency object. Calling those native functions
as dependency-object methods supplied the wrong receiver, which Chromium
rejected as an illegal invocation. Injected Node test timers did not enforce
the browser receiver contract.

Testing mode: **test-first confirmed bug fix**.

- Baseline: clean `ba3f9f3`; the browser-timer wrappers were absent.
- Red: `node --test tests/extensions/watch-audio-companion.test.mjs` exited 1.
  The new default-browser-timer regression failed in `startVisualSampler` with
  the same `TypeError: Illegal invocation`.
- Green: browser timer defaults now call through `globalThis`, preserving their
  required receiver. The focused extension file passes 13/13.
- Regression: the complete repository suite passes 423/423. TypeScript, ESLint,
  production build, file-length policy, changed-file formatting, diff checks,
  and the browser-real Lab startup test pass.
- Version: private extension patch version `0.5.1`.

## `0.5.1` Rerun Order

The successful rerun first proved capture reached `PCM` and opened exactly one
Lab. It then continued with the compact Mirror Spectrum, Signal Bloom,
paused-idle, narrow Constellation, cleanup, and privacy checks.

This gate still excludes website integration, SpacetimeDB publication, public
extension distribution, and production deployment.

## `0.5.1` Promotion Verdict

Owner laptop QA promoted Phase 3C at exact commit
`b60bc69cfc2140a83a499a812b4fede7b517bb91`. The repository was clean at the
required detached commit and the focused extension suite passed 33/33.

| Renderer        | State       | CPU median | CPU peak | GPU median | GPU peak |
| --------------- | ----------- | ---------: | -------: | ---------: | -------: |
| Mirror Spectrum | Active, 60s |     11.90% |   14.90% |      7.03% |    8.24% |
| Mirror Spectrum | Paused, 30s |      1.56% |    3.12% |      0.00% |    0.23% |
| Signal Bloom    | Active, 60s |     27.44% |   41.80% |     15.50% |   16.71% |
| Signal Bloom    | Paused, 30s |     24.80% |   37.70% |      0.28% |    1.77% |

Both paused snapshots reported `running: false`, both resumed without refresh,
and paused GPU returned near idle. Signal Bloom's paused aggregate CPU remained
high, but the measurement included unrelated Opera processes, DevTools, and
automation; exact per-tab attribution remains a future performance check.

Capture reached `PCM` without the former timer error. One Lab was reused across
stop and restart, navigation cleaned up capture, Constellation stayed bounded
at 320px, consoles and extension Network panels were clean, audio remained
normal, and room playback, volume 72, queue `1 / 251`, and authority state were
preserved. The final state was capture stopped, badge clear, Lab inactive, and
repository clean.
