# Audio Visualizer Shortlist

Interactive review artifact for choosing future Mistake Watch Listen-mode
visualizations from the
[Awesome Audio Visualization](https://github.com/willianjusten/awesome-audio-visualization)
collection.

## Visual shortlist for laptop benchmarking

1. **Signal Bloom** - advance as the strongest Signal Aperture brand fit and
   cinematic focal candidate.
2. **Mirror Spectrum** - advance as the clearest and comparatively least
   expensive spectrum candidate.
3. **Siri Ribbon** - advance as the bounded, tempo-compatible Signal Ribbon
   replacement candidate.
4. **Dot Waves** - advance as a fixed-density field candidate with separate
   desktop and compact budgets.

Silk Nebula, Obsidian Grid, and Constellation remain on performance hold. Their
local frame cadence does not justify target-laptop or production integration
work until their render paths are materially reduced.

## Review

Use the local HTTP version at `http://127.0.0.1:8765/`. A direct file or Codex
HTML preview may sandbox scripts or media and is not the supported review path.
The page now also exposes the browser's native audio controls as a playback
fallback. The artifact includes browser-friendly, full-length MP3 review copies
made from the two owner-supplied WAV files. The original WAV files were not
changed.

The page uses only Canvas and the Web Audio API. It does not add a runtime
dependency or change the Mistake Watch application. Production integration
still requires a performance budget, a direct-media analyser contract, and the
existing generated fallback for YouTube iframe playback.

## Theme integration contract

Every renderer now consumes the existing Mistake Watch `ListenTheme` shape:

```ts
type ListenTheme = {
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};
```

Values use the production space-separated RGB format, such as `"176 111 224"`.
The showcase presets include the current Listen-mode fallback palettes. A
runtime artwork theme can be applied without changing any renderer:

```js
window.visualizerShowcase.setTheme({
  primary: "176 111 224",
  secondary: "255 186 32",
  shadow: "176 111 224",
  wave: "225 184 255",
});
```

Preset themes can also be selected with `?theme=signal`, `gold`, `ember`,
`violet`, or `champagne`. Production should pass the existing
`useArtworkTheme(...)` result into the visualizer rather than duplicate artwork
color extraction.

## Visualizer settings contract

Each mode has the same reusable settings shape, while defaults can differ by
mode:

```ts
type VisualizerSettings = {
  brightness: number;
  bloom: number;
  reactivity: number;
  smoothing: number;
};
```

Values are percentages. The showcase validates, persists, resets, and renders
these values through native range controls patterned after the existing Rooms
and Personalization controls. Production can reuse the same contract with its
own preference storage:

```js
window.visualizerShowcase.setSettings("grid", {
  brightness: 155,
  bloom: 220,
  reactivity: 135,
  smoothing: 70,
});

window.visualizerShowcase.getSettings("grid");
```

`brightness` scales emitted color intensity, `bloom` scales Canvas shadow
radius, `reactivity` scales analyser energy, and `smoothing` controls both FFT
smoothing and the Silk/Grid glow attack and release duration.

## Integration architecture

The showcase is benchmark preparation, not evidence that a renderer meets the
TASK-015B production budget. Static Artwork remains the production-safe
default.

- `index.html` is the semantic review shell.
- `styles.css`, `panels.css`, and `responsive.css` own showcase presentation
  while keeping each source file within the project length limit.
- `src/showcase-controller.js` owns DOM, query, storage, playback, and
  visibility behavior.
- `src/visualizer-engine.js` owns the single Canvas, stable sizing, FPS cap,
  RAF lifecycle, and instrumentation.
- `src/audio-input.js` normalizes direct-media Web Audio samples.
- `src/benchmark-input.js` generates reusable deterministic tempo fixtures
  without allocating new signal buffers per frame.
- `src/view-helpers.js` owns small status and time-formatting concerns.
- `src/renderers/*.js` contains one framework-neutral renderer per file.
- `benchmark.mjs` runs Playwright validation and writes JSON evidence.

Each renderer factory returns this stable interface:

```ts
type VisualizerRenderer = {
  id: string;
  init(args?: RendererSize): void;
  resize(args: RendererSize): void;
  render(frame: RendererFrame): void;
  dispose(): void;
};

type RendererFrame = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  compact: boolean;
  input: NormalizedVisualizerInput;
  theme: ListenTheme;
  settings: VisualizerSettings;
  time: number;
  delta: number;
};
```

Renderers do not read query parameters, localStorage, document state, audio
elements, or production room state. A future React `ListenVisualization`
wrapper can own lifecycle and call the same interface.

The normalized input contains a zero-to-one spectrum, negative-one-to-one
waveform, normalized bass/mids/highs, an input kind, and optional tempo
metadata. Tempo input remains separate from analyser input.

## Benchmark-safe lifecycle

- One Canvas surface with effective device-pixel ratio capped at 1.25.
- Backing dimensions update only after a real ResizeObserver size change.
- Active rendering is capped at 30 FPS or the comparison 24 FPS.
- RAF stops while paused, hidden, reduced-motion, or disposed.
- Mode, theme, settings, and resize changes draw one deterministic static
  frame while stopped.
- Duplicate `start()` calls cannot create duplicate loops.
- Renderer state is disposed during mode replacement and page teardown.

The bounded review workloads are 96/64 Signal Bloom radial samples, 28/16
Mirror Spectrum bars per side, three 64/44-point Siri curves, a 28 by 12 or 18
by 10 Dot Waves field, seven 80-point Silk strands, a 20 by 40 Grid, and 60/36
Constellation particles with a 140/70 connection budget. Static Artwork and Off
have no active animation loop. These bounds are not a performance-pass claim.

## Deterministic benchmark mode

Start the existing local HTTP workflow:

```powershell
python -m http.server 8765 --directory docs/reviews/audio-visualizer-showcase
```

Normal review:
`http://127.0.0.1:8765/`

Query-controlled benchmark panel:
`http://127.0.0.1:8765/?benchmark=1&input=tempo&bpm=120&fps=30`

Hosted benchmark deployments should use the same `benchmark=1&input=tempo`
query. Tempo mode does not request the restricted local review tracks; the live
audio controls remain a local-only review path when those ignored assets are
present beside the showcase.

Tempo fixtures at 60, 90, 120, and 160 BPM are generated signals. They do not
claim to analyse either review track.

The stable browser API is:

```js
const benchmark = window.visualizerShowcase.benchmark;
benchmark.setInput({ type: "tempo", bpm: 120 });
benchmark.setFpsCap(30);
benchmark.applySafePreset("bloom");
benchmark.reset();
benchmark.start();
benchmark.snapshot();
benchmark.stop();
```

`snapshot()` returns mode, input, FPS cap, running/stopped reason, Canvas
CSS/backing dimensions, effective DPR, frame count, observed FPS, mean/p95/max
frame interval, an explicit long-frame threshold, and the count above that
threshold. The threshold is 50 ms at 30 FPS and 55 ms at 24 FPS so normal
60 Hz cadence is not misclassified. It sends no telemetry.

## Automated validation

With the server running:

```powershell
node docs/reviews/audio-visualizer-showcase/benchmark.mjs `
  --url=http://127.0.0.1:8765/ `
  --duration-ms=2000 `
  --fps=30 `
  --output=artifacts/laptop-smoke.json
```

The runner evaluates one renderer at a time across desktop 1440x900 and mobile
390x844. It covers deterministic tempo fixtures, live audio where playback
works, paused and reduced-motion stops, duplicate-loop protection, nonblank
Canvas output, theme/settings APIs, keyboard and native-audio targets,
horizontal overflow, and runtime console errors. Hidden-page validation is
best-effort because protocol support varies by Chromium version.

The default run covers Static Artwork, Off, Signal Bloom, Mirror Spectrum, Siri
Ribbon, and Dot Waves. Add `--include-holds=1` only when intentionally retesting
Silk Nebula, Obsidian Grid, and Constellation.

Python's basic HTTP server does not advertise byte-range support, so local MP3
playback works but browser seeking may restart the track. The runner records
Arrow-key seek as unsupported rather than failed in that environment. Use a
range-capable local server when validating seek behavior itself.

JSON artifacts label in-page frame telemetry separately from browser-process
telemetry. The runner does not claim CPU, GPU, memory, compositor, or exact tab
measurements; the laptop agent must collect those through Opera and Windows
process counters.

## Known limitations

- Web Audio analysis works only for direct CORS-compatible media. YouTube iframe
  audio requires the existing generated or future tempo-only fallback.
- GetSongBPM, microphone capture, stream interception, and external APIs remain
  excluded.
- Dramatic review settings remain available. The runner applies a separate
  non-persisted benchmark preset without weakening TASK-015B limits.
- Licensing and owner-supplied review-audio restrictions are recorded in
  [ATTRIBUTION.md](./ATTRIBUTION.md).
