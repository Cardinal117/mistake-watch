import assert from "node:assert/strict";
import test from "node:test";

import { createRhythmFrameV1 } from "../../extensions/watch-audio-companion/rhythm-contract.mjs";
import {
  RhythmVisualizerInput,
  createFixtureFrame,
} from "../../extensions/watch-audio-companion/rhythm-visualizer-input.mjs";
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

for (const mode of ["spectrum", "ribbon"]) {
  test(`${mode} renderer draws a bounded rhythm input`, () => {
    const adapter = new RhythmVisualizerInput();
    adapter.accept(createFrame(), 1_000);
    const context = createCanvasContext();
    const renderer = createVisualizerRenderer(mode);

    renderer.render({
      compact: false,
      context,
      height: 480,
      input: adapter.sample(1_100),
      time: 1_100,
      width: 960,
    });

    assert.equal(renderer.id, mode);
    assert.ok(context.calls.fillRect > 0);
    assert.ok(context.calls.stroke > 0);
    assert.ok(context.calls.gradients > 0);
  });
}

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

function createCanvasContext() {
  const calls = { fillRect: 0, gradients: 0, stroke: 0 };
  const gradient = { addColorStop() {} };
  return {
    calls,
    beginPath() {},
    createLinearGradient() {
      calls.gradients += 1;
      return gradient;
    },
    createRadialGradient() {
      calls.gradients += 1;
      return gradient;
    },
    fillRect() {
      calls.fillRect += 1;
    },
    lineTo() {},
    moveTo() {},
    restore() {},
    save() {},
    stroke() {
      calls.stroke += 1;
    },
  };
}
