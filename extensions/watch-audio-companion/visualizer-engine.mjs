import { createVisualizerRenderer } from "./visualizer-renderers.mjs";

const DPR_CAP = 1.25;

export class VisualizerEngine {
  constructor({ canvas, getInput, mode = "spectrum", fps = 24 }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.getInput = getInput;
    this.mode = mode;
    this.fps = normalizeFps(fps);
    this.renderer = createVisualizerRenderer(mode);
    this.running = false;
    this.destroyed = false;
    this.rafId = null;
    this.lastRenderedAt = null;
    this.frameCount = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode === "ribbon" ? "ribbon" : "spectrum";
    this.renderer = createVisualizerRenderer(this.mode);
    this.drawStatic();
  }

  setFps(value) {
    this.fps = normalizeFps(value);
    this.lastRenderedAt = null;
  }

  start() {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.schedule();
  }

  stop(reason = "stopped") {
    if (!this.running && this.stoppedReason === reason) return;
    this.running = false;
    this.stoppedReason = reason;
    this.lastRenderedAt = null;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.drawStatic();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(
      DPR_CAP,
      Math.max(1, globalThis.devicePixelRatio || 1),
    );
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);

    if (
      this.canvas.width !== backingWidth ||
      this.canvas.height !== backingHeight
    ) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.drawStatic();
  }

  schedule() {
    if (!this.running || this.rafId !== null) return;
    this.rafId = requestAnimationFrame((timestamp) => this.onFrame(timestamp));
  }

  onFrame(timestamp) {
    this.rafId = null;
    if (!this.running || this.destroyed) return;
    const interval = 1_000 / this.fps;
    if (
      this.lastRenderedAt === null ||
      timestamp - this.lastRenderedAt >= interval - 0.5
    ) {
      const input = this.getInput(timestamp);
      this.render(input, timestamp);
      this.lastRenderedAt = timestamp;
      this.frameCount += 1;
    }
    this.schedule();
  }

  render(input, time) {
    this.renderer.render({
      compact: this.width < 640,
      context: this.context,
      height: this.height,
      input,
      time,
      width: this.width,
    });
  }

  drawStatic() {
    if (!this.context || !this.width || !this.height) return;
    this.render(this.getInput(performance.now()), 0);
  }

  snapshot() {
    return {
      canvas: {
        backingHeight: this.canvas.height,
        backingWidth: this.canvas.width,
        cssHeight: this.height,
        cssWidth: this.width,
        effectiveDpr: this.dpr,
      },
      fps: this.fps,
      frameCount: this.frameCount,
      mode: this.mode,
      running: this.running,
      stoppedReason: this.stoppedReason ?? null,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.stop("destroyed");
    this.destroyed = true;
    this.resizeObserver.disconnect();
  }
}

function normalizeFps(value) {
  return Number(value) === 30 ? 30 : 24;
}
