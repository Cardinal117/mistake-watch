import { createStaticInput } from "./contracts.js";

function averageRange(values, startRatio, endRatio) {
  const start = Math.floor(values.length * startRatio);
  const end = Math.max(start + 1, Math.floor(values.length * endRatio));
  let total = 0;
  for (let index = start; index < end; index += 1) total += values[index];
  return total / (end - start);
}

export class WebAudioInput {
  constructor(audio) {
    this.audio = audio;
    this.audioContext = null;
    this.analyser = null;
    this.frequencyBytes = null;
    this.waveformBytes = null;
    this.spectrum = null;
    this.waveform = null;
    this.normalizedInput = null;
    this.source = null;
    this.error = null;
  }

  ensure() {
    if (this.analyser) return true;
    if (this.error) return false;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.72;
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.frequencyBytes = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformBytes = new Uint8Array(this.analyser.fftSize);
      this.spectrum = new Float32Array(this.frequencyBytes.length);
      this.waveform = new Float32Array(this.waveformBytes.length);
      this.normalizedInput = {
        kind: "live",
        spectrum: this.spectrum,
        waveform: this.waveform,
        bass: 0,
        mids: 0,
        highs: 0,
        tempoBpm: null,
        phase: 0,
      };
      return true;
    } catch (error) {
      this.error = error;
      return false;
    }
  }

  setSmoothing(value) {
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = Math.min(
        0.96,
        Math.max(0.08, 0.36 + (value / 100) * 0.58),
      );
    }
  }

  async resume() {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  sample() {
    if (!this.analyser || !this.frequencyBytes || !this.waveformBytes) {
      return createStaticInput("live-unavailable");
    }
    this.analyser.getByteFrequencyData(this.frequencyBytes);
    this.analyser.getByteTimeDomainData(this.waveformBytes);
    for (let index = 0; index < this.frequencyBytes.length; index += 1) {
      this.spectrum[index] = this.frequencyBytes[index] / 255;
    }
    for (let index = 0; index < this.waveformBytes.length; index += 1) {
      this.waveform[index] = (this.waveformBytes[index] - 128) / 128;
    }
    this.normalizedInput.bass = averageRange(this.spectrum, 0, 0.08);
    this.normalizedInput.mids = averageRange(this.spectrum, 0.08, 0.32);
    this.normalizedInput.highs = averageRange(this.spectrum, 0.32, 0.72);
    return this.normalizedInput;
  }

  dispose() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.audioContext?.close().catch(() => {});
    this.source = null;
    this.analyser = null;
    this.audioContext = null;
    this.frequencyBytes = null;
    this.waveformBytes = null;
    this.spectrum = null;
    this.waveform = null;
    this.normalizedInput = null;
  }
}
