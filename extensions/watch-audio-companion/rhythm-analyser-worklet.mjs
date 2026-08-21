import { BeatDetector } from "./beat-detector.mjs";
import { createRhythmFrameV1 } from "./rhythm-contract.mjs";

const REPORT_INTERVAL_SECONDS = 0.25;

class RhythmAnalyserProcessor extends globalThis.AudioWorkletProcessor {
  constructor() {
    super();
    this.detector = new BeatDetector(globalThis.sampleRate);
    this.frames = 0;
    this.peak = 0;
    this.sequence = 0;
    this.sumSquares = 0;
    this.reportAfterFrames = Math.max(
      1,
      Math.round(globalThis.sampleRate * REPORT_INTERVAL_SECONDS),
    );
  }

  process(inputs, outputs) {
    const channels = inputs[0] ?? [];
    const outputChannels = outputs[0] ?? [];
    const frameLength = channels[0]?.length ?? outputChannels[0]?.length ?? 0;

    for (const output of outputChannels) {
      output.fill(0);
    }

    this.detector.processChannels(channels);
    this.collectProbe(channels, frameLength);

    if (this.frames >= this.reportAfterFrames) {
      this.sequence += 1;
      this.port.postMessage({
        type: "rhythm-frame",
        frames: this.frames,
        peak: this.peak,
        rms: Math.sqrt(this.sumSquares / Math.max(1, this.frames)),
        rhythm: createRhythmFrameV1({
          ...this.detector.snapshot(),
          sequence: this.sequence,
        }),
      });
      this.frames = 0;
      this.peak = 0;
      this.sumSquares = 0;
    }

    return true;
  }

  collectProbe(channels, frameLength) {
    for (let frame = 0; frame < frameLength; frame += 1) {
      let mono = 0;
      for (const channel of channels) {
        mono += channel[frame] ?? 0;
      }
      if (channels.length > 0) {
        mono /= channels.length;
      }

      this.peak = Math.max(this.peak, Math.abs(mono));
      this.sumSquares += mono * mono;
      this.frames += 1;
    }
  }
}

globalThis.registerProcessor(
  "mistake-watch-rhythm-analyser",
  RhythmAnalyserProcessor,
);
