import assert from "node:assert/strict";
import test from "node:test";

import { createRhythmFrameV1 } from "../../extensions/watch-audio-companion/rhythm-contract.mjs";
import {
  RhythmVisualizerInput,
  createFixtureFrame,
} from "../../extensions/watch-audio-companion/rhythm-visualizer-input.mjs";
import { VisualizerEngine } from "../../extensions/watch-audio-companion/visualizer-engine.mjs";
import { createVisualizerRenderer } from "../../extensions/watch-audio-companion/visualizer-renderers.mjs";

test("rhythm input maps bounded scalar frames into reusable display arrays", () => {
  const adapter = new RhythmVisualizerInput();
  const frame = createFrame();

  assert.equal(adapter.accept(frame, 1_000), true);
  const first = adapter.sample(1_000);
  const spectrum = first.spectrum;
  const waveform = first.waveform;
  const later = adapter.sample(1_250);

  assert.equal(first.active, true);
  assert.equal(first.tempoBpm, 120);
  assert.equal(first.spectrum.length, 96);
  assert.equal(first.waveform.length, 192);
  assert.equal(later.spectrum, spectrum);
  assert.equal(later.waveform, waveform);
  assert.ok(later.phase >= 0 && later.phase < 1);
  assert.notEqual(later.phase, first.phase);
  assert.ok(spectrum.every((value) => value >= 0 && value <= 1));
  assert.ok(waveform.every((value) => value >= -1 && value <= 1));
});

test("live visual frames replace the synthetic display arrays without polling", () => {
  const adapter = new RhythmVisualizerInput();
  adapter.accept(createFrame(), 1_000);

  assert.equal(typeof adapter.acceptVisual, "function");
  assert.equal(
    adapter.acceptVisual(
      {
        sampledAtSeconds: 10,
        sequence: 3,
        spectrum: Array.from({ length: 48 }, (_, index) => index * 5),
        version: 1,
        waveform: Array.from({ length: 96 }, (_, index) => 128 + (index % 32)),
      },
      1_010,
    ),
    true,
  );

  const input = adapter.sample(1_020);
  assert.equal(input.kind, "analysis");
  assert.equal(input.spectrum.length, 48);
  assert.equal(input.waveform.length, 96);
  assert.equal(input.spectrum[0], 0);
  assert.ok(input.spectrum.at(-1) > 0.9);
  assert.equal(input.waveform[0], 0);
  assert.ok(input.waveform.at(-1) > 0);

  assert.equal(
    adapter.acceptVisual(
      {
        sampledAtSeconds: 10,
        sequence: 3,
        spectrum: new Array(48).fill(255),
        version: 1,
        waveform: new Array(96).fill(128),
      },
      1_030,
    ),
    false,
  );
});

test("live visual activity idles after sustained silence and wakes on audio", () => {
  const adapter = new RhythmVisualizerInput();

  adapter.acceptVisual(createVisualFrame({ level: 210, sequence: 1 }), 1_000);
  assert.equal(adapter.shouldAnimate(1_000), true);

  adapter.acceptVisual(createVisualFrame({ level: 0, sequence: 2 }), 1_100);
  assert.equal(adapter.shouldAnimate(1_500), true);
  assert.equal(adapter.shouldAnimate(1_801), false);

  adapter.acceptVisual(createVisualFrame({ level: 180, sequence: 3 }), 1_900);
  assert.equal(adapter.shouldAnimate(1_900), true);
});

test("rhythm input rejects ordering regressions and becomes idle when stale", () => {
  const adapter = new RhythmVisualizerInput();

  assert.equal(adapter.accept(createFrame({ sequence: 4 }), 2_000), true);
  assert.equal(adapter.accept(createFrame({ sequence: 4 }), 2_100), false);
  assert.equal(adapter.accept(createFrame({ sequence: 3 }), 2_100), false);
  assert.equal(adapter.sample(3_501).active, false);

  adapter.reset();
  assert.equal(adapter.accept(createFrame({ sequence: 0 }), 4_000), true);
});

test("low-confidence rhythm keeps energy but disables tempo locking", () => {
  const adapter = new RhythmVisualizerInput();
  adapter.accept(createFrame({ confidence: 0.49 }), 1_000);

  const input = adapter.sample(1_100);
  assert.equal(input.active, true);
  assert.equal(input.tempoBpm, null);
  assert.equal(input.phase, 0);
  assert.equal(input.energy, 0.7);
});

test("deterministic fixture remains a valid bounded rhythm frame", () => {
  const adapter = new RhythmVisualizerInput();
  const fixture = createFixtureFrame(160, 3.25, 7);

  assert.equal(adapter.accept(fixture, 500), true);
  const input = adapter.sample(500);
  assert.equal(input.tempoBpm, 160);
  assert.equal(input.confidence, 0.92);
});

for (const mode of [
  "spectrum",
  "ribbon",
  "dot-waves",
  "signal-bloom",
  "constellation",
]) {
  for (const compact of [false, true]) {
    test(`${mode} renderer draws bounded ${compact ? "compact" : "desktop"} output`, () => {
      const adapter = new RhythmVisualizerInput();
      adapter.accept(createFrame(), 1_000);
      const context = createCanvasContext();
      const renderer = createVisualizerRenderer(mode);

      renderer.init?.();
      renderer.resize?.({
        compact,
        height: compact ? 390 : 480,
        width: compact ? 360 : 960,
      });
      renderer.render({
        compact,
        context,
        delta: 16.67,
        height: compact ? 390 : 480,
        input: adapter.sample(1_100),
        time: 1_100,
        width: compact ? 360 : 960,
      });

      assert.equal(renderer.id, mode);
      assert.ok(context.calls.fillRect > 0);
      assert.ok(context.calls.gradients > 0);
      assert.ok(context.calls.fill + context.calls.stroke > 0);
      renderer.dispose?.();
    });
  }
}

test("Dot Waves keeps its strongest reactive field centered", () => {
  const context = createCanvasContext();
  const renderer = createVisualizerRenderer("dot-waves");

  renderer.render({
    compact: false,
    context,
    delta: 16.67,
    height: 480,
    input: createUniformInput(),
    time: 1_100,
    width: 960,
  });

  const center = context.arcs.filter(({ x }) => x >= 336 && x <= 624);
  const edges = context.arcs.filter(({ x }) => x < 192 || x > 768);
  assert.ok(center.length > 0);
  assert.ok(edges.length > 0);
  assert.ok(averageRadius(center) > averageRadius(edges) * 1.3);
});

test("Constellation keeps energized circles inside a compact viewport", () => {
  const width = 320;
  const height = 240;
  const context = createCanvasContext();
  const renderer = createVisualizerRenderer("constellation");

  renderer.init();
  renderer.resize({ compact: true, height, width });
  renderer.render({
    compact: true,
    context,
    delta: 32,
    height,
    input: createUniformInput(),
    time: 1_100,
    width,
  });

  assert.ok(context.arcs.length > 0);
  for (const { radius, x, y } of context.arcs) {
    assert.ok(x - radius >= 0, `left edge clipped at ${x - radius}`);
    assert.ok(x + radius <= width, `right edge clipped at ${x + radius}`);
    assert.ok(y - radius >= 0, `top edge clipped at ${y - radius}`);
    assert.ok(y + radius <= height, `bottom edge clipped at ${y + radius}`);
  }
});

test("visualizer engine starts with the real default renderer contract", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

  try {
    const engine = new VisualizerEngine({
      canvas: createCanvas(),
      getInput: () => createUniformInput(),
    });

    assert.equal(engine.snapshot().mode, "spectrum");
    for (const mode of [
      "ribbon",
      "dot-waves",
      "signal-bloom",
      "constellation",
      "spectrum",
    ]) {
      engine.setMode(mode);
      assert.equal(engine.snapshot().mode, mode);
    }
    engine.destroy();
  } finally {
    restoreGlobal("ResizeObserver", originalResizeObserver);
    restoreGlobal("requestAnimationFrame", originalRequestAnimationFrame);
    restoreGlobal("cancelAnimationFrame", originalCancelAnimationFrame);
  }
});

test("visualizer mode changes dispose renderer state without duplicating the frame loop", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const scheduled = new Map();
  const events = [];
  let nextFrameId = 1;

  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrameId++;
    scheduled.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => scheduled.delete(id);

  try {
    const engine = new VisualizerEngine({
      canvas: createCanvas(),
      getInput: () => createUniformInput(),
      mode: "spectrum",
      rendererFactory: (mode) => createLifecycleRenderer(mode, events),
    });

    engine.start();
    assert.equal(scheduled.size, 1);

    engine.setMode("dot-waves");
    engine.setMode("signal-bloom");
    engine.setMode("constellation");

    assert.equal(engine.snapshot().mode, "constellation");
    assert.equal(scheduled.size, 1);
    assert.deepEqual(events, [
      "init:spectrum",
      "resize:spectrum",
      "dispose:spectrum",
      "init:dot-waves",
      "resize:dot-waves",
      "dispose:dot-waves",
      "init:signal-bloom",
      "resize:signal-bloom",
      "dispose:signal-bloom",
      "init:constellation",
      "resize:constellation",
    ]);

    engine.destroy();
    assert.equal(scheduled.size, 0);
    assert.equal(events.at(-1), "dispose:constellation");
  } finally {
    restoreGlobal("ResizeObserver", originalResizeObserver);
    restoreGlobal("requestAnimationFrame", originalRequestAnimationFrame);
    restoreGlobal("cancelAnimationFrame", originalCancelAnimationFrame);
  }
});

function createFrame(overrides = {}) {
  return createRhythmFrameV1({
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.1,
    bpm: 120,
    confidence: 0.84,
    energy: 0.7,
    highs: 0.55,
    mids: 0.6,
    bass: 0.8,
    onset: 0.65,
    sampledAtSeconds: 10,
    sequence: 1,
    ...overrides,
  });
}

function createVisualFrame({ level, sequence }) {
  return {
    sampledAtSeconds: sequence,
    sequence,
    spectrum: new Array(48).fill(level),
    version: 1,
    waveform: new Array(96).fill(128),
  };
}

function createCanvasContext() {
  const arcs = [];
  const calls = { fill: 0, fillRect: 0, gradients: 0, stroke: 0 };
  const gradient = { addColorStop() {} };
  return {
    arcs,
    calls,
    arc(x, y, radius) {
      arcs.push({ radius, x, y });
    },
    beginPath() {},
    closePath() {},
    createLinearGradient() {
      calls.gradients += 1;
      return gradient;
    },
    createRadialGradient() {
      calls.gradients += 1;
      return gradient;
    },
    fill() {
      calls.fill += 1;
    },
    fillRect() {
      calls.fillRect += 1;
    },
    lineTo() {},
    moveTo() {},
    rotate() {},
    restore() {},
    save() {},
    setTransform() {},
    stroke() {
      calls.stroke += 1;
    },
    translate() {},
  };
}

function createUniformInput() {
  return {
    active: true,
    bass: 0.8,
    confidence: 0.84,
    energy: 0.7,
    highs: 0.55,
    mids: 0.6,
    onset: 0.65,
    phase: 0.4,
    spectrum: new Float32Array(96).fill(0.7),
    tempoBpm: 120,
    waveform: new Float32Array(192).fill(0.3),
  };
}

function averageRadius(arcs) {
  return arcs.reduce((total, { radius }) => total + radius, 0) / arcs.length;
}

function createCanvas() {
  const context = createCanvasContext();
  return {
    getBoundingClientRect: () => ({ height: 480, width: 960 }),
    getContext: () => context,
    height: 0,
    width: 0,
  };
}

function createLifecycleRenderer(mode, events) {
  return {
    id: mode,
    dispose: () => events.push(`dispose:${mode}`),
    init: () => events.push(`init:${mode}`),
    render() {},
    resize: () => events.push(`resize:${mode}`),
  };
}

function restoreGlobal(key, value) {
  if (value === undefined) delete globalThis[key];
  else globalThis[key] = value;
}
