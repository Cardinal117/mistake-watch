import {
  estimateTempo,
  findAutocorrelationTempoCandidates,
} from "./tempo-estimator.mjs";

const WINDOW_SECONDS = 0.02;
const REFRACTORY_SECONDS = 0.18;
const THRESHOLD_HISTORY_WINDOWS = 100;
const AUTOCORRELATION_HISTORY_WINDOWS = 600;
const ONSET_RETENTION_SECONDS = 45;

export class BeatDetector {
  constructor(sampleRate) {
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      throw new Error("BeatDetector requires a positive sample rate.");
    }

    this.sampleRate = sampleRate;
    this.windowSize = Math.max(64, Math.round(sampleRate * WINDOW_SECONDS));
    this.lowAlpha = filterAlpha(180, sampleRate);
    this.midAlpha = filterAlpha(2_000, sampleRate);
    this.reset();
  }

  reset() {
    this.bassLow = 0;
    this.midLow = 0;
    this.windowFrames = 0;
    this.totalFrames = 0;
    this.bandSquares = [0, 0, 0];
    this.previousBands = [0, 0, 0];
    this.bandPeaks = [0.001, 0.001, 0.001];
    this.fluxHistory = [];
    this.onsetTimes = [];
    this.lastOnsetSeconds = -Infinity;
    this.onset = 0;
    this.tempo = estimateTempo([]);
  }

  processChannels(channels) {
    const frameLength = channels[0]?.length ?? 0;

    for (let frame = 0; frame < frameLength; frame += 1) {
      let mono = 0;
      for (const channel of channels) {
        mono += channel[frame] ?? 0;
      }
      this.processSample(channels.length > 0 ? mono / channels.length : 0);
    }

    return this.snapshot();
  }

  processSample(sample) {
    const bounded = Math.min(
      1,
      Math.max(-1, Number.isFinite(sample) ? sample : 0),
    );
    this.bassLow += this.lowAlpha * (bounded - this.bassLow);
    this.midLow += this.midAlpha * (bounded - this.midLow);

    const bands = [
      this.bassLow,
      this.midLow - this.bassLow,
      bounded - this.midLow,
    ];

    for (let index = 0; index < bands.length; index += 1) {
      this.bandSquares[index] += bands[index] * bands[index];
    }

    this.windowFrames += 1;
    this.totalFrames += 1;

    if (this.windowFrames >= this.windowSize) {
      this.finishWindow();
    }
  }

  snapshot() {
    const normalized = this.previousBands.map((value, index) =>
      clampUnit(value / Math.max(this.bandPeaks[index], 0.001)),
    );

    return {
      sampledAtSeconds: this.totalFrames / this.sampleRate,
      ...this.tempo,
      onset: this.onset,
      bass: normalized[0],
      mids: normalized[1],
      highs: normalized[2],
      energy: clampUnit(
        Math.sqrt(
          (normalized[0] ** 2 + normalized[1] ** 2 + normalized[2] ** 2) / 3,
        ),
      ),
    };
  }

  finishWindow() {
    const bands = this.bandSquares.map((sum) =>
      Math.sqrt(sum / Math.max(1, this.windowFrames)),
    );
    const flux = bands.reduce(
      (sum, value, index) =>
        sum + Math.max(0, value - this.previousBands[index]),
      0,
    );
    const threshold = adaptiveThreshold(
      this.fluxHistory.slice(-THRESHOLD_HISTORY_WINDOWS),
    );
    const sampledAtSeconds = this.totalFrames / this.sampleRate;
    const energy = Math.sqrt(
      bands.reduce((sum, value) => sum + value * value, 0) / bands.length,
    );
    const canTrigger =
      sampledAtSeconds - this.lastOnsetSeconds >= REFRACTORY_SECONDS;
    const isOnset = canTrigger && energy > 0.002 && flux > threshold;

    this.onset = isOnset
      ? clampUnit((flux - threshold) / Math.max(0.005, threshold * 2))
      : this.onset * 0.72;

    if (isOnset) {
      this.lastOnsetSeconds = sampledAtSeconds;
      this.onsetTimes.push(sampledAtSeconds);
      this.onsetTimes = this.onsetTimes.filter(
        (value) => sampledAtSeconds - value <= ONSET_RETENTION_SECONDS,
      );
      this.tempo = estimateTempo(this.onsetTimes, {
        autocorrelationCandidates: findAutocorrelationTempoCandidates(
          this.fluxHistory,
          this.windowSize / this.sampleRate,
        ),
        previousBpm: this.tempo.bpm,
      });
    }

    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > AUTOCORRELATION_HISTORY_WINDOWS) {
      this.fluxHistory.shift();
    }

    this.previousBands = bands;
    this.bandPeaks = bands.map((value, index) =>
      Math.max(value, this.bandPeaks[index] * 0.995, 0.001),
    );
    this.bandSquares = [0, 0, 0];
    this.windowFrames = 0;
  }
}

function adaptiveThreshold(history) {
  if (history.length < 4) {
    return 0.002;
  }

  const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
  const variance =
    history.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    history.length;
  return mean + Math.sqrt(variance) * 1.35 + 0.0005;
}

function filterAlpha(frequency, sampleRate) {
  return 1 - Math.exp((-2 * Math.PI * frequency) / sampleRate);
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
