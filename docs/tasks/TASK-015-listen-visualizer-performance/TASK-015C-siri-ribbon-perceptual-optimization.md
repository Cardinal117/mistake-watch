---
id: TASK-015C
status: in-progress
type: compact-subtask
related: [TASK-015, TASK-015B, TASK-019, MW-BUG-009]
created: 2026-08-25
updated: 2026-08-25
---

# Siri Ribbon Perceptual And Rendering Optimization

## Objective

Make Siri Ribbon communicate musical timing through a coherent five-lobe
shape while materially reducing its rendering cost. Preserve Static Artwork as
the safe default and preserve the current shared-room rhythm contract.

The reusable investigation method is
[[../../reviews/audio-visualizer-showcase/EVALUATION-METHOD|Audio Visualizer Evaluation Method]].

## Findings And Direction

The production renderer diverged from the reference's perceptual grammar:

- It draws three continuously travelling 44-64 point lines rather than five
  explicit lobes.
- All three lines consume nearly identical input.
- It samples only the first 42% of an already compressed spectrum.
- Its center weighting has no explicit musical role.
- It does not meaningfully separate beat, onset, bass, body, and transient
  behavior.
- It repaints a full-canvas gradient and uses additive blending plus blur every
  frame.

The shared participant input is intentionally BPM and phase derived. It does
not contain measured bass, mids, highs, onset, waveform, or spectrum. Siri must
remain honestly tempo-synchronized in this subtask rather than implying richer
shared analysis.

## Scope

- Replace travelling sine lines with five cached, mirrored Bezier lobes.
- Use the complete normalized spectrum and explicit bass, mids, highs, energy,
  onset, and phase roles available in the renderer input.
- Use a balanced positional envelope of approximately
  `0.55, 0.80, 1.00, 0.80, 0.55`.
- Add independent fast attack and role-appropriate release envelopes.
- Draw no more than two restrained ribbon layers using normal compositing.
- Remove per-frame radial wash generation and shadow blur from Siri Ribbon.
- Bound Siri's canvas vertically while preserving its current center position.
- Cache geometry and reuse dynamic buffers between frames.
- Preserve 24 FPS, pause, hidden, reduced-motion, resize, and disposal behavior.
- Record test chronology and local visual evidence.

## Exclusions

- No SpacetimeDB schema, reducer, room-authority, or publication change.
- No shared onset or band-envelope contract.
- No extension analyser, detector, capture, or bridge change.
- No mode label, default, preference, artwork, queue, playback, or room-layout
  change.
- No optimization of Mirror Spectrum, Dot Waves, Signal Bloom, or
  Constellation in this subtask.
- No dependency, Supabase, R2, CloudConvert, or deployment change.

## Test-First Contract

Testing classification: **test-first**, because the renderer behavior and
performance invariants are changing.

Before production edits, focused tests must fail because the current renderer:

1. does not expose five role-selective lobe targets;
2. does not apply faster attack than release;
3. does not use Bezier lobe geometry;
4. uses three stroked layers, additive compositing, and shadow blur;
5. is not mounted in a vertically bounded raster surface.

Tests should inspect observable mapping and Canvas operations rather than source
text or private call order.

### Red Evidence - 2026-08-25

- Baseline: `c787eeb`; production Siri implementation unchanged.
- Command: `node --test tests/player/listen-room-renderers.test.mjs`
- Result: exit 1, 9 passed and 2 failed.
- Intended failures:
  - the five-role dynamics contract was absent;
  - the renderer produced zero Bezier operations instead of bounded lobe
    geometry.
- Existing capability, input, engine, lifecycle, deterministic shared render,
  and Constellation checks remained green.

## Implementation Order

1. Add deterministic silence, beat, bass, mids, highs, and onset fixtures.
2. Record red evidence against the existing renderer.
3. Add a small reusable Siri dynamics module with fixed buffers.
4. Replace the renderer geometry and remove high-cost paint behavior.
5. Bound only Siri Ribbon's canvas surface.
6. Run focused tests, the affected player suite, typecheck, lint, file-length,
   formatting, and production build.
7. Run local desktop and narrow visual checks.
8. Defer laptop CPU/GPU comparison to the release gate.

## Implemented Result - 2026-08-25

- Added a dedicated fixed-buffer Siri dynamics module with five documented
  musical roles, full-spectrum sample positions, and independent attack and
  release timing.
- Replaced the three travelling sampled lines with two restrained, closed
  five-lobe Bezier ribbons. The renderer now performs 40 bounded Bezier
  operations, two fills, and one stroke per frame.
- Removed Siri Ribbon's shadow blur, additive compositing, per-frame radial
  wash, travelling carrier, and per-frame geometry allocation.
- Preserved the center-weighted `0.55, 0.80, 1.00, 0.80, 0.55` spatial grammar
  while permuting the secondary ribbon's non-center roles.
- Bounded only Siri Ribbon to the centered 56% vertical canvas region. Other
  visualization layouts are unchanged.
- Kept shared playback honest: the current public room contract remains
  tempo-and-phase based. Rich band and onset events remain a separate future
  contract decision.

### Green Evidence

- Focused renderer and UI suite: 16 of 16 passed.
- Full repository suite: 476 of 476 passed.
- TypeScript: passed.
- ESLint: passed.
- File-length policy: zero violations; 15 pre-existing warnings.
- Changed-file Prettier: passed.
- Production build: passed.
- `git diff --check`: passed.
- Desktop browser: the preview mounted one canvas, displayed five distinct
  lobes, remained centered, and closed without trapping the panel.
- Narrow browser at 390 by 844: the preview mounted at 284 by 62 CSS pixels,
  produced zero horizontal overflow, and retained accessible controls.
- Local console: only expected React development, HMR, and Speed Insights
  development messages; no renderer or panel error.

This is local implementation readiness, not affected-laptop performance
approval. Static Artwork remains the default and Siri Ribbon remains labeled
experimental until the release evidence below passes.

## Acceptance Criteria

- Bass-focused input makes the center lobe the dominant response.
- Mid-focused input makes the inner shoulders dominant over the outer lobes.
- High/transient input makes the outer lobes respond without dominating the
  center during bass-focused input.
- Attack rises faster than the matching release falls.
- Silence and low energy settle to a restrained nonzero resting shape.
- The shape uses five mirrored Bezier lobes and no travelling sine carrier.
- Siri draws no more than two filled/stroked layers, uses normal compositing,
  and sets no shadow blur.
- The renderer samples the full normalized spectrum through documented role
  positions.
- Geometry and dynamics buffers are reused between frames.
- The canvas remains centered but occupies no more than 56% of its parent
  height.
- Existing shared deterministic rendering, lifecycle, fallback, preview,
  desktop, and narrow-layout behavior remain intact.
- Local tests, typecheck, ESLint, file-length, formatting, and build pass.
- Static Artwork remains the default and Siri retains its experimental power
  warning until affected-laptop evidence passes the existing budget.

## Release Evidence Still Required

- Three-run current-versus-v2 affected-laptop comparison.
- At least three contrasting tracks producing recognizably different motion
  when truthful local detail becomes available.
- Host and extension-free participant timing comparison.
- Paint, GPU, and exact-tab evidence where browser tooling permits it.
- A separate approved task before any richer shared accent contract.
