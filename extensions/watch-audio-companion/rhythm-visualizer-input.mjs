import { normalizeRhythmFrameV1 } from "./rhythm-contract.mjs";
import {
  VISUAL_SPECTRUM_BANDS,
  VISUAL_WAVEFORM_POINTS,
  normalizeVisualFrameV1,
} from "./visual-frame-contract.mjs";

const STALE_AFTER_MS = 1_500;
const VISUAL_STALE_AFTER_MS = 250;
const VISUAL_SILENCE_GRACE_MS = 700;
const VISUAL_ACTIVITY_THRESHOLD = 0.025;
const SPECTRUM_SIZE = 96;
const WAVEFORM_SIZE = 192;

export class RhythmVisualizerInput {
  constructor() {
    this.spectrum = new Float32Array(SPECTRUM_SIZE);
    this.waveform = new Float32Array(WAVEFORM_SIZE);
    this.liveSpectrum = new Float32Array(VISUAL_SPECTRUM_BANDS);
    this.liveWaveform = new Float32Array(VISUAL_WAVEFORM_POINTS);
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

  acceptVisual(candidate, receivedAtMs) {
    const frame = normalizeVisualFrameV1(candidate);
    if (!frame || frame.sequence <= this.visualSequence) {
      return false;
    }

    this.visualReceivedAtMs = finiteNow(receivedAtMs);
    this.visualSequence = frame.sequence;
    let activity = 0;
    for (let index = 0; index < this.liveSpectrum.length; index += 1) {
      this.liveSpectrum[index] = frame.spectrum[index] / 255;
      activity = Math.max(activity, this.liveSpectrum[index]);
    }
    for (let index = 0; index < this.liveWaveform.length; index += 1) {
      this.liveWaveform[index] = (frame.waveform[index] - 128) / 128;
      activity = Math.max(activity, Math.abs(this.liveWaveform[index]));
    }
    if (activity >= VISUAL_ACTIVITY_THRESHOLD) {
      this.lastVisualActivityAtMs = this.visualReceivedAtMs;
    }
    return true;
  }

  shouldAnimate(nowMs) {
    const now = finiteNow(nowMs);
    if (this.visualSequence >= 0) {
      return now - this.lastVisualActivityAtMs <= VISUAL_SILENCE_GRACE_MS;
    }

    const input = this.sample(now);
    return input.active && input.energy >= VISUAL_ACTIVITY_THRESHOLD;
  }

  sample(nowMs) {
    const now = finiteNow(nowMs);
    const hasRhythm = this.frame && now - this.receivedAtMs <= STALE_AFTER_MS;
    const hasVisual =
      this.visualSequence >= 0 &&
      now - this.visualReceivedAtMs <= VISUAL_STALE_AFTER_MS;
    if (!hasRhythm && !hasVisual) {
      return this.createIdleInput();
    }

    const frame = hasRhythm ? this.frame : deriveRhythm(this.liveSpectrum);
    const phase = hasRhythm
      ? calculatePhase(frame, now - this.receivedAtMs)
      : 0;
    let spectrum = this.liveSpectrum;
    let waveform = this.liveWaveform;
    if (!hasVisual) {
      const pulse = frame.bpm === null ? frame.onset : Math.exp(-phase * 8);
      fillSpectrum(this.spectrum, frame, phase, pulse);
      fillWaveform(this.waveform, frame, phase, pulse);
      spectrum = this.spectrum;
      waveform = this.waveform;
    }

    return {
      active: true,
      bass: frame.bass,
      confidence: frame.confidence,
      energy: frame.energy,
      highs: frame.highs,
      kind: hasVisual ? "analysis" : "rhythm",
      mids: frame.mids,
      onset: frame.onset,
      phase,
      spectrum,
      tempoBpm: frame.confidence >= 0.5 ? frame.bpm : null,
      waveform,
    };
  }

  reset() {
    this.frame = null;
    this.receivedAtMs = 0;
    this.sequence = -1;
    this.visualReceivedAtMs = 0;
    this.visualSequence = -1;
    this.lastVisualActivityAtMs = Number.NEGATIVE_INFINITY;
    this.spectrum.fill(0);
    this.waveform.fill(0);
    this.liveSpectrum.fill(0);
    this.liveWaveform.fill(0);
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

function deriveRhythm(spectrum) {
  const bass = averageRange(spectrum, 0, 0.28);
  const mids = averageRange(spectrum, 0.28, 0.66);
  const highs = averageRange(spectrum, 0.66, 1);
  return {
    bass,
    bpm: null,
    confidence: 0,
    energy: clamp(bass * 0.45 + mids * 0.35 + highs * 0.2),
    highs,
    mids,
    onset: 0,
  };
}

function averageRange(values, startRatio, endRatio) {
  const start = Math.floor(values.length * startRatio);
  const end = Math.max(start + 1, Math.floor(values.length * endRatio));
  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += values[index];
  }
  return total / (end - start);
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
