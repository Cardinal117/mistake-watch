# TASK-018 Phase 3C Opera GX Gate

Date: 2026-08-21
Status: **Revise repaired locally; awaiting `0.5.1` laptop rerun**
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
  production build, file-length policy, changed-file formatting, `git diff
--check`, and the browser-real Lab startup test pass.
- Version: private extension patch version `0.5.1`.

## Rerun Order

First prove capture reaches `PCM` and opens exactly one Lab. Only after that
capture-only gate passes should the compact Mirror Spectrum, Signal Bloom,
paused-idle, narrow Constellation, cleanup, and privacy checks continue.

This gate still excludes website integration, SpacetimeDB publication, public
extension distribution, and production deployment.
