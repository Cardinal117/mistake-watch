---
id: TASK-015B
status: completed
type: compact-subtask
related: [TASK-015, MW-BUG-009, MW-QOL-007]
created: 2026-08-19
updated: 2026-08-19
---

# Isolated Visualizer Renderer Benchmark

## Objective

Find one or more attractive Listen visualizers that materially improve on the
failed animated renderers without weakening the safe Static Artwork default or
coupling visual research to playback, room authority, or a BPM provider.

The owner showcase at `docs/reviews/audio-visualizer-showcase/` is the isolated
visual research and benchmark surface. It is not production code.

Reference concepts:

- [Siri-style audio visualizer](https://codepen.io/fgnass/pen/LWeKNq)
- [Dot Waves canvas visualizer](https://codepen.io/iondrimba/pen/KXypwx)

## Scope

- Inventory and compare the owner showcase modes before selecting production
  candidates.
- Prototype bounded Canvas adaptations of:
  - the Siri-style curve concept as the intended Signal Ribbon replacement;
  - the Dot Waves concept as a fixed-density field rather than a
    viewport-width loop;
  - owner showcase candidates including Signal Bloom, Silk Nebula, and Mirror
    Spectrum.
- Feed deterministic tempo fixtures of 60, 90, 120, and 160 BPM into compatible
  prototypes so tempo-aware motion can be evaluated without an external API.
- Measure active, paused, hidden, reduced-motion, desktop, and mobile behavior.
- Preserve artwork-derived `ListenTheme` colors and the established
  Personalization preview contract.

## Exclusions

- No production component, visualization menu, or default-mode change.
- No GetSongBPM account, API key, provider request, cache, or schema work.
- No microphone permission, YouTube stream capture, audio download, Librosa,
  Aubio, Essentia, or unsupported iframe audio analysis.
- No queue, playback authority, SpacetimeDB, Supabase, recommendation, upload,
  or CloudConvert change.
- No commitment of review audio until its redistribution rights are confirmed;
  use generated or explicitly licensed fixtures for repository evidence.

## Decisions And Approach

- Static Artwork remains the safe default and `Off` remains genuinely off.
- Keep two separate input contracts:
  - `tempo`: metadata-derived BPM and playback state, suitable for YouTube;
  - `spectrum`: analyser bins, only for direct media where browser access and
    CORS permit Web Audio analysis.
- A renderer may support one or both contracts but must not imply that YouTube
  audio is being sampled when only tempo is available.
- Treat the referenced CodePens as visual inspiration. Do not carry over their
  unbounded loops, per-frame canvas resizing, microphone flow, large glow, or
  unknown licensing without separate verification.
- Use one Canvas surface per prototype, a device-pixel-ratio cap of `1.25`, a
  24 or 30 FPS scheduler, stable dimensions between resize events, bounded
  geometry, and no per-element DOM animation.
- Pause the render loop when playback pauses, the document is hidden, reduced
  motion is requested, or the preview timeout expires.
- Renderers that fail the strict safe-default budget may remain review-only.
  Production opt-in limits require explicit owner approval rather than a
  silent relaxation of TASK-015.
- Owner direction: visually successful modes that miss the safe-default budget
  may later be offered as clearly labeled Experimental opt-ins. They must show
  a fair power/performance warning, remain disabled by default, retain the
  reduced-motion and pause lifecycle, and never replace Static Artwork as the
  recommended mode. A renderer with playback, synchronization, stability, or
  runaway-resource failures remains ineligible even as an experiment.

## Candidate Notes

| Candidate        | Intended role         | Required adaptation                                                                       |
| ---------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Siri-style curve | Replace Signal Ribbon | Remove per-frame resize and glow-heavy compositing; use bounded curves and tempo fallback |
| Dot Waves        | Optional field mode   | Fixed dot budget, sampled bins, capped frame rate, and deterministic tempo fallback       |
| Signal Bloom     | Showcase candidate    | Measure focal canvas cost and mobile crop                                                 |
| Silk Nebula      | Showcase candidate    | Bound particles, alpha layers, and overdraw                                               |
| Mirror Spectrum  | Showcase candidate    | Cap frequency buckets and mirrored draw calls                                             |

Silk Nebula and Obsidian Grid remain research-only holds. Constellation failed
the resource budget by a wide margin but is retained as an owner-approved
extreme-power experiment rather than a production recommendation.

## Implementation Order

1. **Inventory checkpoint:** review the owner showcase, document renderer
   techniques, external assets, licenses, and expected input contracts without
   changing production code.
2. **Harness checkpoint:** add isolated instrumentation for frame cadence,
   long frames, canvas dimensions, active loops, memory trend, and deterministic
   tempo fixtures.
3. **Prototype checkpoint:** adapt the shortlisted candidates one at a time;
   never mount several active renderers during a measurement.
4. **Laptop checkpoint:** run repeatable active and paused comparisons on the
   affected i3-1115G4/20 GB/integrated-GPU Opera GX laptop.
5. **Decision checkpoint:** preserve Static Artwork and Off as the only
   production-suitable choices. Record selected animated modes as explicit
   owner-approved experiments without relabeling their failed measurements.

Final checkpoint: inventory, harness, prototype work, three-run affected-laptop
comparison, 24 FPS diagnostics, ten-minute soak, and owner decision are
complete. No animated mode passed the production budget. Static Artwork and Off
remain the production choices; selected animated modes continue only under the
experimental policy below.

## Measurement Protocol

- Use the same room, active media, browser profile, viewport, and operating
  conditions for each candidate.
- Record at least three runs per candidate; use the median result and retain
  low, mean, p95, and peak values.
- Sample active playback for 120 seconds and paused playback for 60 seconds
  without crossing a natural track transition where possible.
- Record renderer FPS, frames above the configured long-frame threshold (55 ms
  at 24 FPS or 50 ms at 30 FPS), tab CPU when available, aggregate browser CPU
  when it is the only consistent measure, memory start/end, and any playback
  or synchronization effect.
- Compare every result with Static Artwork, Off, and the 17% animated baseline.

## Final Laptop Evidence

The affected i3-1115G4, 20 GB, integrated-GPU Opera GX laptop completed three
30 FPS runs per mode. CPU and memory are aggregate Opera process telemetry, not
exact tab attribution. Stable early and late Off controls make relative medians
useful, while unrelated Opera work can distort peaks and working-set totals.

Each run value is median/peak aggregate Opera CPU:

| Mode            |         Run 1 |         Run 2 |         Run 3 | Three-run median | Median p95 | Paused median |
| --------------- | ------------: | ------------: | ------------: | ---------------: | ---------: | ------------: |
| Off             |   4.62/20.02% |   4.61/76.87% |   4.64/21.50% |        **4.62%** |     16.75% |         1.56% |
| Static Artwork  |   4.61/60.01% |   4.62/27.85% |  6.17/253.69% |        **4.62%** |     18.43% |         1.56% |
| Signal Bloom    | 44.48/307.13% |  53.92/70.64% |  43.21/59.75% |       **44.48%** |     58.45% |         1.54% |
| Mirror Spectrum |  26.19/49.40% |  27.69/46.25% |  25.71/44.71% |       **26.19%** |     36.98% |         1.54% |
| Siri Ribbon     |  29.47/59.17% |  30.77/61.74% |  29.18/52.20% |       **29.47%** |     40.85% |         3.02% |
| Dot Waves       |  24.66/40.32% |  26.14/44.65% |  26.22/52.17% |       **26.14%** |     36.83% |         1.56% |
| Silk Nebula     | 89.39/142.80% | 77.17/124.89% | 78.19/133.99% |       **78.19%** |    110.19% |         3.02% |
| Obsidian Grid   |  49.20/69.21% |  46.12/64.06% |  50.77/69.09% |       **49.20%** |     59.42% |         2.93% |
| Constellation   | 84.48/113.82% | 83.09/114.17% | 81.17/116.46% |       **83.09%** |    103.16% |         3.07% |

The exact Static Artwork peak gate cannot be certified from aggregate Opera
peaks. Its median matched Off, and neither control runs a continuous renderer.

The diagnostic 24 FPS cap improved every animated mode but produced no budget
pass:

| Mode            | 30 FPS median | 24 FPS median | Improvement |
| --------------- | ------------: | ------------: | ----------: |
| Signal Bloom    |        44.48% |        41.51% |        6.7% |
| Mirror Spectrum |        26.19% |        24.54% |        6.3% |
| Siri Ribbon     |        29.47% |        26.14% |       11.3% |
| Dot Waves       |        26.14% |        19.99% |       23.5% |
| Silk Nebula     |        78.19% |        64.44% |       17.6% |
| Obsidian Grid   |        49.20% |        41.64% |       15.4% |
| Constellation   |        83.09% |        64.50% |       22.4% |

Dot Waves completed a ten-minute soak at 26.14% median, 27.65% mean, and
38.41% p95 aggregate CPU. Aggregate memory decreased from 1357.4 MB to
1223.0 MB, all 120 responsiveness checks completed, and no lifecycle or console
failure appeared. The short local track required three recorded replays, so the
soak does not prove uninterrupted audio across the full ten minutes.

Unavailable evidence remains explicit: exact tab CPU and memory, GPU
attribution, observed FPS, frame intervals, long-frame percentage, failed-
request inspection, and the absent deployed benchmark snapshot API.

## Owner Classification

- **Recommended default:** Static Artwork.
- **Maximum efficiency:** Off.
- **Beta, very high power:** Mirror Spectrum and Dot Waves.
- **Experimental, high power:** Siri Ribbon and Signal Bloom.
- **Experimental, extreme power:** Constellation.
- **Hold:** Silk Nebula and Obsidian Grid.

The owner accepts the selected experimental modes for enjoyment despite their
measured cost. They must remain disabled by default, display a clear power
warning, stop on pause/hidden/reduced-motion/unmount, and retain an immediate
Static Artwork fallback. Dot Waves should receive a later visual adjustment
that concentrates its reactive field toward the center.

Mirror Spectrum and Siri Ribbon are the first rhythm-contract candidates for
TASK-018. Dot Waves, Signal Bloom, and Constellation follow. This owner decision
does not turn any animated result into a production performance pass.

## Risks

- **False equivalence:** aggregate browser CPU is useful for controlled A/B
  comparison but is not exact tab telemetry; label it accurately.
- **Canvas overdraw:** fewer DOM nodes can still be expensive when the surface,
  alpha blending, or glow area is large.
- **Audio-source mismatch:** a direct-media analyser can look better than the
  YouTube tempo fallback; both paths need representative review.
- **Research leakage:** experimental audio, copied Pen code, or showcase assets
  must not enter the application bundle accidentally.
- **Preference bloat:** passing the benchmark does not automatically justify
  adding every candidate to the production menu.

## Acceptance Criteria

- Each candidate runs on one bounded Canvas with no per-frame resize, animated
  CSS filter, large shadow surface, or per-element DOM animation.
- Active loops stop while paused, hidden, reduced-motion, and unmounted.
- Static Artwork remains at no more than 5% median and 10% peak under the
  established affected-laptop method.
- A production candidate reduces median CPU by at least 40% from the 17%
  animated baseline and targets no more than 8% median and 12% peak; exceeding
  the stricter 5%/10% default budget keeps it opt-in even after owner approval.
- At the configured 24 or 30 FPS cap, steady rendering sustains at least 95% of
  the selected cadence, with fewer than 1% of frames above 55 ms at 24 FPS or
  50 ms at 30 FPS, and less than 10 MB memory growth over ten minutes.
- Tempo fixtures visibly change compatible motion cadence without network
  access or claiming real audio analysis.
- Desktop and 390-pixel mobile layouts retain readable controls, stable canvas
  bounds, and no horizontal overflow.
- Playback, queue order, room synchronization, permissions, and artwork
  extraction remain unchanged throughout the isolated comparison.
- Candidate source and audio licenses are recorded before any code or asset is
  proposed for production.

## Evidence To Record

- Showcase inventory and shortlist decision.
- Per-candidate renderer budget and input-contract table.
- Three-run affected-laptop measurement table.
- Desktop/mobile screenshots and reduced-motion/hidden-state checks.
- License and attribution decision for every promoted source or asset.
- Explicit owner decision on production candidates and any opt-in budget.

## Acceptance Outcome

- **Passed:** isolated scope, bounded renderer ownership, pause and stop
  lifecycle, mode switching, duplicate-loop prevention, responsive controls,
  clean console, stable soak memory, deterministic tempo support, and safe
  Static Artwork/Off controls.
- **Failed:** every animated renderer exceeded the 8% median production target
  at both 30 FPS and 24 FPS.
- **Not certifiable with available tooling:** exact tab peak, GPU attribution,
  observed cadence, long-frame percentage, and strict per-tab memory growth.
- **Decision:** benchmark complete. Preserve the failed measurements, retain the
  five selected modes only as explicit experiments, and continue optimization
  as future work rather than blocking the private TASK-018 capture prototype.
