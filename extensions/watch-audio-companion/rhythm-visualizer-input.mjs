import { normalizeRhythmFrameV1 } from "./rhythm-contract.mjs";

const STALE_AFTER_MS = 1_500;
const SPECTRUM_SIZE = 96;
const WAVEFORM_SIZE = 192;

export class RhythmVisualizerInput {
  constructor() {
    this.spectrum = new Float32Array(SPECTRUM_SIZE);
    this.waveform = new Float32Array(WAVEFORM_SIZE);
    this.reset();
  }

  accept(candidate, receivedAtMs) {
    const frame = normalizeRhythmFrameV1(candidate);
    if (!frame || frame.sequence <= this.sequence) {
      return false;
    }

    this.frame = frame;
    this.receivedAtMs = finiteNow(receivedAtMs);
    this.sequence = frame.sequence;
    return true;
  }

  sample(nowMs) {
    const now = finiteNow(nowMs);
    if (!this.frame || now - this.receivedAtMs > STALE_AFTER_MS) {
      return this.createIdleInput();
    }

    const frame = this.frame;
    const phase = calculatePhase(frame, now - this.receivedAtMs);
    const pulse = frame.bpm === null ? frame.onset : Math.exp(-phase * 8);
    fillSpectrum(this.spectrum, frame, phase, pulse);
    fillWaveform(this.waveform, frame, phase, pulse);

    return {
      active: true,
      bass: frame.bass,
      confidence: frame.confidence,
      energy: frame.energy,
      highs: frame.highs,
      kind: "rhythm",
      mids: frame.mids,
      onset: frame.onset,
      phase,
      spectrum: this.spectrum,
      tempoBpm: frame.confidence >= 0.5 ? frame.bpm : null,
      waveform: this.waveform,
    };
  }

  reset() {
    this.frame = null;
    this.receivedAtMs = 0;
    this.sequence = -1;
    this.spectrum.fill(0);
    this.waveform.fill(0);
  }

  createIdleInput() {
    this.spectrum.fill(0);
    this.waveform.fill(0);
    return {
      active: false,
      bass: 0,
      confidence: 0,
      energy: 0,
      highs: 0,
      kind: "idle",
      mids: 0,
      onset: 0,
      phase: 0,
      spectrum: this.spectrum,
      tempoBpm: null,
      waveform: this.waveform,
    };
  }
}

export function createFixtureFrame(bpm, sampledAtSeconds, sequence) {
  const interval = 60 / clamp(Number(bpm) || 120, 40, 240);
  const phase = positiveModulo(sampledAtSeconds, interval) / interval;
  const pulse = Math.exp(-phase * 8);

  return {
    version: 1,
    sequence,
    sampledAtSeconds,
    bpm: 60 / interval,
    beatIntervalSeconds: interval,
    beatOffsetSeconds: 0,
    confidence: 0.92,
    onset: pulse,
    bass: clamp(0.16 + pulse * 0.78),
    mids: clamp(0.12 + pulse * 0.48),
    highs: clamp(0.08 + pulse * 0.32),
    energy: clamp(0.14 + pulse * 0.7),
  };
}

function calculatePhase(frame, elapsedMs) {
  if (
    frame.bpm === null ||
    frame.beatIntervalSeconds === null ||
    frame.beatOffsetSeconds === null ||
    frame.confidence < 0.5
  ) {
    return 0;
  }

  const sourceTime = frame.sampledAtSeconds + Math.max(0, elapsedMs) / 1_000;
  return (
    positiveModulo(
      sourceTime - frame.beatOffsetSeconds,
      frame.beatIntervalSeconds,
    ) / frame.beatIntervalSeconds
  );
}

function fillSpectrum(target, frame, phase, pulse) {
  for (let index = 0; index < target.length; index += 1) {
    const ratio = index / (target.length - 1);
    const band =
      ratio < 0.28 ? frame.bass : ratio < 0.66 ? frame.mids : frame.highs;
    const harmonic = 0.72 + Math.sin(index * 0.43 + phase * Math.PI * 2) * 0.18;
    const rolloff = 1 - ratio * 0.42;
    target[index] = clamp(
      (band * 0.68 + frame.energy * 0.18 + frame.onset * 0.14) *
        harmonic *
        rolloff *
        (0.72 + pulse * 0.28),
    );
  }
}

function fillWaveform(target, frame, phase, pulse) {
  const amplitude = clamp(
    frame.energy * 0.46 + frame.onset * 0.34 + pulse * 0.2,
  );
  for (let index = 0; index < target.length; index += 1) {
    const ratio = index / target.length;
    target[index] = clampSigned(
      Math.sin(ratio * Math.PI * 6 + phase * Math.PI * 2) * amplitude * 0.72 +
        Math.sin(ratio * Math.PI * 14 - phase * Math.PI) * frame.highs * 0.2,
    );
  }
}

function finiteNow(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampSigned(value) {
  return clamp(value, -1, 1);
}
