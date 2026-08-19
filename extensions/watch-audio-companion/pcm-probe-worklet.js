const REPORT_INTERVAL_SECONDS = 0.5;

class PcmProbeProcessor extends globalThis.AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = 0;
    this.peak = 0;
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

    for (let frame = 0; frame < frameLength; frame += 1) {
      let mono = 0;

      for (const channel of channels) {
        mono += channel[frame] ?? 0;
      }

      if (channels.length > 0) {
        mono /= channels.length;
      }

      const magnitude = Math.abs(mono);
      this.peak = Math.max(this.peak, magnitude);
      this.sumSquares += mono * mono;
      this.frames += 1;
    }

    if (this.frames >= this.reportAfterFrames) {
      this.port.postMessage({
        frames: this.frames,
        peak: this.peak,
        rms: Math.sqrt(this.sumSquares / this.frames),
      });
      this.frames = 0;
      this.peak = 0;
      this.sumSquares = 0;
    }

    return true;
  }
}

globalThis.registerProcessor("mistake-watch-pcm-probe", PcmProbeProcessor);
