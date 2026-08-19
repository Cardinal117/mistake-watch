import assert from "node:assert/strict";
import test from "node:test";

import { BeatDetector } from "../../extensions/watch-audio-companion/beat-detector.mjs";
import {
  createRhythmFrameV1,
  isFreshRhythmFrame,
  normalizeRhythmFrameV1,
} from "../../extensions/watch-audio-companion/rhythm-contract.mjs";
import {
  estimateTempo,
  findAutocorrelationTempoCandidates,
  foldTempoNearReference,
} from "../../extensions/watch-audio-companion/tempo-estimator.mjs";

const FIXTURE_SAMPLE_RATE = 8_000;

for (const bpm of [60, 90, 120, 128, 160]) {
  test(`BeatDetector locks deterministic ${bpm} BPM fixture`, () => {
    const result = analysePulseFixture(bpm);

    assert.ok(result.bpm !== null, `expected ${bpm} BPM to lock`);
    assert.ok(
      Math.abs(result.bpm - bpm) <= 1.5,
      `${result.bpm} should match ${bpm}`,
    );
    assert.ok(
      result.confidence >= 0.55,
      `confidence ${result.confidence} is too low`,
    );
    assert.ok(result.beatIntervalSeconds > 0);
    assert.ok(result.beatOffsetSeconds >= 0);
    assert.ok(result.beatOffsetSeconds < result.beatIntervalSeconds);
    assert.ok(
      circularDistance(
        result.beatOffsetSeconds,
        0.25,
        result.beatIntervalSeconds,
      ) <= 0.025,
      `phase ${result.beatOffsetSeconds} should remain near the 0.25s fixture offset`,
    );

    for (const field of ["onset", "bass", "mids", "highs", "energy"]) {
      assert.ok(
        result[field] >= 0 && result[field] <= 1,
        `${field} must be bounded`,
      );
    }
  });
}

test("tempo estimator remains stable with deterministic jitter", () => {
  const interval = 60 / 128;
  const onsets = Array.from({ length: 40 }, (_, index) => {
    const jitter = index % 3 === 0 ? 0.004 : index % 3 === 1 ? -0.003 : 0;
    return 0.25 + index * interval + jitter;
  });
  const result = estimateTempo(onsets);

  assert.ok(Math.abs(result.bpm - 128) < 1);
  assert.ok(result.confidence > 0.8);
});

test("half-time and double-time candidates fold to an established pulse", () => {
  assert.equal(foldTempoNearReference(64, 128), 128);
  assert.equal(foldTempoNearReference(256, 128), 128);
  assert.equal(foldTempoNearReference(60, 60), 60);
});

test("autocorrelation produces the deterministic pulse as a tempo candidate", () => {
  const samples = Array.from({ length: 600 }, (_, index) =>
    index % 23 === 0 ? 1 : 0,
  );
  const candidates = findAutocorrelationTempoCandidates(samples, 60 / 128 / 23);

  assert.ok(candidates.length > 0);
  assert.ok(candidates.some((candidate) => Math.abs(candidate.bpm - 128) < 1));
  assert.ok(candidates.every((candidate) => candidate.correlation > 0));
});

test("RhythmFrameV1 clamps producer values and rejects invalid consumers", () => {
  const frame = createRhythmFrameV1({
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.9,
    bpm: 120,
    confidence: 2,
    energy: -1,
    highs: 0.5,
    mids: 0.5,
    bass: 0.5,
    onset: 0.5,
    sampledAtSeconds: 10,
    sequence: 3,
  });

  assert.equal(frame.version, 1);
  assert.equal(frame.confidence, 1);
  assert.equal(frame.energy, 0);
  assert.ok(frame.beatOffsetSeconds < frame.beatIntervalSeconds);
  assert.deepEqual(normalizeRhythmFrameV1(frame), frame);
  assert.equal(normalizeRhythmFrameV1({ ...frame, version: 2 }), null);
  assert.equal(normalizeRhythmFrameV1({ ...frame, onset: Infinity }), null);
});

test("freshness gate rejects stale and out-of-order rhythm frames", () => {
  const frame = createRhythmFrameV1({
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.1,
    bpm: 120,
    confidence: 0.8,
    energy: 0.5,
    highs: 0.5,
    mids: 0.5,
    bass: 0.5,
    onset: 0.5,
    sampledAtSeconds: 10,
    sequence: 5,
  });

  assert.equal(isFreshRhythmFrame(frame, { sequence: 4 }, 11), true);
  assert.equal(isFreshRhythmFrame(frame, { sequence: 5 }, 11), false);
  assert.equal(isFreshRhythmFrame(frame, { sequence: 4 }, 13), false);
  assert.equal(
    isFreshRhythmFrame(frame, { sampledAtSeconds: 11, sequence: 4 }, 11),
    false,
  );
});

test("AudioWorklet processor emits bounded frames and silent analysis output", async () => {
  const originalProcessor = globalThis.AudioWorkletProcessor;
  const originalRegister = globalThis.registerProcessor;
  const originalSampleRate = globalThis.sampleRate;
  const messages = [];
  let Processor = null;

  globalThis.AudioWorkletProcessor = class {
    constructor() {
      this.port = { postMessage: (message) => messages.push(message) };
    }
  };
  globalThis.registerProcessor = (name, implementation) => {
    assert.equal(name, "mistake-watch-rhythm-analyser");
    Processor = implementation;
  };
  globalThis.sampleRate = 48_000;

  try {
    await import(
      `../../extensions/watch-audio-companion/rhythm-analyser-worklet.mjs?test=${Date.now()}`
    );
    const processor = new Processor();

    for (let blockIndex = 0; blockIndex < 100; blockIndex += 1) {
      const input = new Float32Array(128);
      input.fill(blockIndex % 10 === 0 ? 0.25 : 0);
      const output = new Float32Array(128);
      assert.equal(processor.process([[input]], [[output]]), true);
      assert.ok(output.every((value) => value === 0));
    }

    assert.ok(messages.length > 0);
    assert.equal(messages[0].type, "rhythm-frame");
    assert.ok(normalizeRhythmFrameV1(messages[0].rhythm));
    assert.equal(ArrayBuffer.isView(messages[0].rhythm), false);
  } finally {
    globalThis.AudioWorkletProcessor = originalProcessor;
    globalThis.registerProcessor = originalRegister;
    globalThis.sampleRate = originalSampleRate;
  }
});

function analysePulseFixture(bpm) {
  const detector = new BeatDetector(FIXTURE_SAMPLE_RATE);
  const durationSeconds = Math.max(24, (60 / bpm) * 24);
  const totalFrames = Math.round(durationSeconds * FIXTURE_SAMPLE_RATE);
  const blockSize = 128;

  for (let start = 0; start < totalFrames; start += blockSize) {
    const length = Math.min(blockSize, totalFrames - start);
    const block = new Float32Array(length);

    for (let frame = 0; frame < length; frame += 1) {
      const time = (start + frame) / FIXTURE_SAMPLE_RATE;
      block[frame] = pulseSample(time, bpm);
    }

    detector.processChannels([block]);
  }

  return detector.snapshot();
}

function pulseSample(time, bpm) {
  const interval = 60 / bpm;
  const phase = positiveModulo(time - 0.25, interval);

  if (phase > 0.045) {
    return 0;
  }

  const envelope = Math.exp(-phase * 70);
  return (
    Math.sin(2 * Math.PI * 110 * phase) * envelope * 0.7 +
    Math.sin(2 * Math.PI * 1_400 * phase) * envelope * 0.25
  );
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function circularDistance(left, right, period) {
  const difference = Math.abs(left - right) % period;
  return Math.min(difference, period - difference);
}
