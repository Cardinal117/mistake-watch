---
id: TASK-015B
status: laptop-qa-pending
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

Obsidian Grid and Constellation remain research-only until the initial shortlist
meets the resource budget.

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
5. **Decision checkpoint:** promote only passing candidates into a separately
   approved production-integration slice; leave GetSongBPM blocked until a
   compatible renderer passes.

Current checkpoint: inventory, harness, and prototype work are complete. The
affected-laptop comparison and owner decision remain pending. The default run
includes Static Artwork, Off, Signal Bloom, Mirror Spectrum, Siri Ribbon, and
Dot Waves; known performance holds require `--include-holds=1`.

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
