# Benchmark Preparation Implementation Report

## Scope

Prepared the isolated audio visualizer showcase for dedicated laptop
benchmarking and later React integration. No production application, task,
package, database, room, queue, authentication, or deployment files are in
scope.

## Preserved behavior

- Nine visual directions: two controls, four laptop candidates, and three
  performance holds.
- Browser-local audio selection and native playback without uploads or
  persistence; owner-supplied review files remain ignored local assets.
- Theme switching and the production `ListenTheme` shape.
- Per-mode brightness, bloom, reactivity, and smoothing settings.
- Space/arrow keyboard controls.
- Desktop and mobile review layouts.

## Architecture

- Semantic HTML shell and three focused local stylesheets.
- Controller-owned DOM, storage, input, lifecycle, and benchmark behavior.
- One framework-neutral module per renderer.
- Stable `init/resize/render/dispose` renderer interface.
- Normalized live-analyser and deterministic-tempo inputs.
- One bounded Canvas renderer with DPR and FPS caps.
- Stable `window.visualizerShowcase.benchmark` instrumentation API.
- Playwright JSON benchmark and validation runner.
- Reused live and tempo signal buffers to keep per-frame allocation outside the
  renderer comparison.

## Benchmark status

Target-laptop Opera GX measurement is complete. Static Artwork and Off are the
only production-suitable modes. No animated renderer met the 8% median CPU
target at 30 FPS or 24 FPS. Selected animated modes remain owner-approved
experiments rather than performance passes.

## Verification

- Local HTTP response: 200.
- JavaScript syntax: all 19 modules passed.
- Desktop/mobile Playwright smoke: every visible mode matched its expected
  output, including an intentionally blank Off control.
- Full 24 FPS and 30 FPS matrices: all four animated candidates sustained the
  configured cadence on desktop and 390-pixel mobile. The 30 FPS matrix had no
  long frames. The 24 FPS matrix had one 66.6 ms desktop Siri Ribbon transient,
  or 0.51% across that mode's four tempo samples, below the 1% harness limit.
- Paused/reduced-motion and duplicate-loop checks: passed for every mode.
- Horizontal overflow and runtime console errors: none found.
- Space-key playback passed. Arrow-key seek is not assertable through Python's
  non-range local server and is reported as unsupported rather than passed.
- Local audio selection uses a temporary object URL, switches the harness to
  live analyser input, and revokes the URL on replacement or teardown.
- Scoped Prettier, renderer-global scan, and 500-line source limit: passed.
- In-page performance telemetry is evidence only; target-laptop process
  measurements remain outstanding.
- Chromium hidden-page automation was unavailable in this environment. The
  visibility lifecycle is implemented, but that automated assertion remains
  deferred to a browser that exposes a hidden-page state.

## Initial performance signal

The local matrices are not production CPU or GPU benchmarks. They did confirm
that Signal Bloom, Mirror Spectrum, Siri Ribbon, and Dot Waves held both the 24
FPS and 30 FPS caps on desktop and mobile in this environment. Static Artwork
and Off correctly kept their animation loops stopped. Silk Nebula, desktop
Obsidian Grid, and Constellation remain on hold based on the earlier showcase
signal and are excluded from the default matrix. No resource-budget pass is
claimed until the target laptop collects longer browser-process and in-page
samples.

## Target-laptop result

Three 30 FPS runs per mode used the same aggregate Opera process-counter method
as the earlier MW-BUG-009 comparison. Stable Off controls measured 4.61-4.64%
median. Static Artwork's three-run median was 4.62%. Animated three-run medians
ranged from 26.14% for Dot Waves to 83.09% for Constellation.

At 24 FPS, Dot Waves improved most but still measured 19.99% median. Mirror
Spectrum measured 24.54%, Siri Ribbon 26.14%, Signal Bloom 41.51%, Obsidian
Grid 41.64%, Silk Nebula 64.44%, and Constellation 64.50%.

All modes stopped their renderer loops when paused, mode switches preserved the
local audio element, repeated start/stop cycles created no duplicate loop, and
the console remained clean. A ten-minute Dot Waves soak showed no repeatable
memory growth or responsiveness failure. Exact tab CPU, GPU attribution,
observed frame cadence, long-frame percentage, and failed-request inspection
were unavailable, so those claims remain intentionally unmade.

Owner classification:

- Static Artwork: recommended default.
- Off: maximum efficiency.
- Mirror Spectrum and Dot Waves: beta, very high power.
- Siri Ribbon and Signal Bloom: experimental, high power.
- Constellation: experimental, extreme power.
- Silk Nebula and Obsidian Grid: hold.

## Remaining blockers

- Exact external concept license verification.
- Replacement of restricted owner-supplied audio with synthetic or explicitly
  licensed automated fixtures.
- Production React integration remains a separate approved task. GetSongBPM is
  no longer planned; TASK-018 owns the private first-party local rhythm proof.
