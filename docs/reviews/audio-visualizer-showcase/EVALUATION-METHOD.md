# Audio Visualizer Evaluation Method

Use this method when researching, adapting, or optimizing a Mistake Watch audio
visualizer. It preserves the distinction between attractive motion, meaningful
musical response, safe shared-room data, and measured rendering cost.

## Evidence Order

1. **Reference grammar:** identify the few visual rules that make the reference
   recognizable. Do not copy incidental prototype behavior such as microphone
   access, per-frame resizing, oversized glow, or unbounded animation loops.
2. **Signal truth:** list every input the renderer actually receives. Separate
   local analyser detail from BPM-only or shared-room reconstruction. Never
   describe synthesized frequency detail as measured audio.
3. **Perceptual roles:** assign visible regions to musical events. Movement must
   communicate beat, onset, bass, body, or transients rather than merely change
   continuously.
4. **Rendering inventory:** count canvases, paths, points, particles, shadows,
   blend layers, painted pixels, frame cadence, and per-frame allocations.
5. **Controlled experiments:** change one cost or mapping dimension at a time.
6. **Device evidence:** compare the candidate with Static Artwork, Off, and its
   previous implementation on the affected laptop.
7. **Product decision:** classify the renderer from measured evidence. Visual
   appeal does not erase a failed resource budget.

## Reactive Mapping Review

For every renderer, record:

| Question                              | Required evidence                                         |
| ------------------------------------- | --------------------------------------------------------- |
| What drives timing?                   | Beat phase, onset, analyser frames, or generated time     |
| What drives size?                     | Bass, mids, highs, energy, waveform, or a synthetic pulse |
| Which screen region owns each signal? | A small, explicit spatial map                             |
| Are attacks visible?                  | Fast-rise fixture or live transient evidence              |
| Do values settle?                     | Release behavior and silence fixture                      |
| Do different tracks look different?   | At least three contrasting tracks                         |
| Is shared behavior honest?            | Exact fields published to the room                        |

Prefer a small number of semantically distinct control points over many points
fed by nearly identical data. Use separate attack and release timing where
different musical roles need different behavior. Keep the primary shared shape
deterministic from the authoritative playback clock.

## Performance Review

Inventory and test these costs independently:

1. Geometry count and draw-call count.
2. Canvas CSS and backing dimensions, including effective DPR.
3. Full-surface clears, fills, and gradients.
4. Shadow blur, filters, additive blending, and transparent overdraw.
5. Per-frame arrays, gradients, paths, colors, and strings.
6. Active, decay, paused, hidden, reduced-motion, and unmounted cadence.
7. Main-thread scripting versus paint, raster, and compositor work.

Recommended experiment sequence:

```text
A. Existing production baseline
B. Reduced geometry with unchanged input
C. B without blur or additive compositing
D. C with corrected perceptual signal mapping
E. D with independent attack and release envelopes
F. E with bounded raster dimensions and DPR tiers
G. F with adaptive cadence
H. OffscreenCanvas only when traces still show main-thread scripting pressure
```

Do not combine the sequence before measuring. A worker can improve main-thread
responsiveness, but it does not remove GPU fill, blending, or oversized raster
work.

## Deterministic Fixture Matrix

Use synthetic inputs before subjective music review:

| Fixture          | Expected response                                         |
| ---------------- | --------------------------------------------------------- |
| Silence          | Stable resting frame and no continuous work while stopped |
| Beat only        | Repeatable phase-aligned primary motion                   |
| Bass only        | Center or documented low-frequency region dominates       |
| Mids only        | Body or shoulder region dominates                         |
| High transient   | Outer/detail region responds quickly and releases quickly |
| Broadband onset  | Immediate bounded accent without permanent inflation      |
| Sustained energy | Stable body without jitter                                |

Tests should assert signal selectivity, bounded geometry, deterministic output,
and lifecycle invariants. Visual review remains responsible for judging whether
the result feels musical and coherent.

## Measurement Protocol

- Use the same browser profile, room, source, viewport, playback state, and
  operating conditions.
- Run one renderer at a time.
- Record at least three active samples and use the median.
- Record paused and hidden controls separately.
- Prefer exact tab telemetry. Label aggregate browser telemetry accurately when
  exact attribution is unavailable.
- Record FPS delivery, long frames, memory trend, CPU, GPU, canvas pixel count,
  and console behavior when tooling permits.
- Do not cross a natural track transition during a sample where avoidable.

The current production-candidate target is at least a 40% median improvement
from its prior animated baseline, no more than 8% median and 12% peak aggregate
CPU under the established laptop method, at least 95% cadence delivery, fewer
than 1% long frames, and less than 10 MB ten-minute renderer-attributable memory
growth. Static Artwork remains the safe default until an animated mode passes.

## Review Record Template

```text
Reference grammar:
Available signal:
Unavailable signal:
Spatial mapping:
Attack/release behavior:
Canvas and geometry budget:
Paint/compositor risks:
Experiment results:
Visual verdict:
Performance verdict:
Shared-room truthfulness:
Deferred contract changes:
```

## Research Sources

- Siri-style five-lobe reference:
  https://codepen.io/fgnass/pen/LWeKNq
- Web Audio analyser smoothing:
  https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
- Canvas performance guidance:
  https://web.dev/articles/canvas-performance
- Animation paint-cost guidance:
  https://web.dev/articles/animations-guide
- OffscreenCanvas worker guidance:
  https://web.dev/articles/offscreen-canvas
- Chrome runtime performance tooling:
  https://developer.chrome.com/docs/devtools/performance
- Real-world perceptual spectrum practices:
  https://github.com/hvianna/audioMotion-analyzer
- Novelty and onset-function review:
  https://transactions.ismir.net/articles/10.5334/tismir.202
