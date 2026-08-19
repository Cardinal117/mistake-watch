function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil(sortedValues.length * ratio) - 1,
  );
  return sortedValues[index];
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export class FrameInstrumentation {
  constructor(longFrameThresholdMs = 50) {
    this.longFrameThresholdMs = longFrameThresholdMs;
    this.reset();
  }

  setLongFrameThreshold(value) {
    this.longFrameThresholdMs = value;
  }

  reset() {
    this.frameCount = 0;
    this.intervals = [];
    this.lastFrameAt = null;
    this.startedAt = performance.now();
  }

  record(timestamp) {
    if (this.lastFrameAt !== null) {
      this.intervals.push(timestamp - this.lastFrameAt);
    }
    this.lastFrameAt = timestamp;
    this.frameCount += 1;
  }

  snapshot() {
    const sorted = [...this.intervals].sort((a, b) => a - b);
    const total = this.intervals.reduce((sum, value) => sum + value, 0);
    const mean = this.intervals.length > 0 ? total / this.intervals.length : 0;
    const elapsed = Math.max(1, performance.now() - this.startedAt);
    const observedFps = total > 0 ? (this.intervals.length * 1000) / total : 0;
    return {
      frameCount: this.frameCount,
      observedFps: round(observedFps),
      meanFrameIntervalMs: round(mean),
      p95FrameIntervalMs: round(percentile(sorted, 0.95)),
      maxFrameIntervalMs: round(sorted.at(-1) ?? 0),
      longFrameThresholdMs: this.longFrameThresholdMs,
      longFrameCount: this.intervals.filter(
        (value) => value > this.longFrameThresholdMs,
      ).length,
      sampleDurationMs: round(elapsed),
    };
  }
}
