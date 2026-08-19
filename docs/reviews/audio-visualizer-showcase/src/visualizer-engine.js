import { createStaticInput } from "./contracts.js";
import { FrameInstrumentation } from "./instrumentation.js";
import { createRenderer } from "./renderers/index.js";

const DPR_CAP = 1.25;
const FPS_CAPS = new Set([24, 30]);

export class VisualizerEngine {
  constructor({ canvas, getInput, getSettings, getTheme }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.getInput = getInput;
    this.getSettings = getSettings;
    this.getTheme = getTheme;
    this.mode = "bloom";
    this.renderer = createRenderer(this.mode);
    this.renderer.init();
    this.fpsCap = 30;
    this.running = false;
    this.stoppedReason = "paused";
    this.rafId = null;
    this.lastRafAt = null;
    this.accumulatedMs = 0;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.destroyed = false;
    this.instrumentation = new FrameInstrumentation();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.renderer.dispose();
    this.mode = mode;
    this.renderer = createRenderer(mode);
    this.renderer.init({
      width: this.width,
      height: this.height,
      compact: this.width < 640,
    });
    this.renderer.resize({
      width: this.width,
      height: this.height,
      compact: this.width < 640,
    });
    this.drawStatic();
  }

  setFpsCap(value) {
    const normalized = Number(value);
    if (!FPS_CAPS.has(normalized)) throw new Error("FPS cap must be 24 or 30");
    this.fpsCap = normalized;
    this.instrumentation.setLongFrameThreshold(normalized === 24 ? 55 : 50);
    this.accumulatedMs = 0;
  }

  resize() {
    if (this.destroyed) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const backingWidth = Math.max(1, Math.round(width * dpr));
    const backingHeight = Math.max(1, Math.round(height * dpr));
    if (
      backingWidth === this.canvas.width &&
      backingHeight === this.canvas.height &&
      width === this.width &&
      height === this.height
    ) {
      return;
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = backingWidth;
    this.canvas.height = backingHeight;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.renderer.resize({ width, height, compact: width < 640 });
    this.drawStatic();
  }

  start() {
    if (this.destroyed || this.running) return;
    if (!this.renderer.animated) {
      this.stop("static-mode");
      return;
    }
    this.running = true;
    this.stoppedReason = null;
    this.lastRafAt = null;
    this.accumulatedMs = 0;
    this.schedule();
  }

  stop(reason, { drawStatic = true } = {}) {
    this.running = false;
    this.stoppedReason = reason;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastRafAt = null;
    this.accumulatedMs = 0;
    if (drawStatic && reason !== "hidden") this.drawStatic();
  }

  schedule() {
    if (!this.running || this.rafId !== null || this.destroyed) return;
    this.rafId = requestAnimationFrame((timestamp) =>
      this.onAnimationFrame(timestamp),
    );
  }

  onAnimationFrame(timestamp) {
    this.rafId = null;
    if (!this.running || this.destroyed) return;
    const minimumInterval = 1000 / this.fpsCap;
    if (this.lastRafAt === null) {
      this.accumulatedMs = minimumInterval;
    } else {
      this.accumulatedMs += Math.min(250, timestamp - this.lastRafAt);
    }
    if (this.accumulatedMs >= minimumInterval - 0.5) {
      const delta = Math.max(minimumInterval, this.accumulatedMs);
      this.accumulatedMs = Math.max(0, this.accumulatedMs - minimumInterval);
      this.renderFrame(timestamp, delta, false);
    }
    this.lastRafAt = timestamp;
    this.schedule();
  }

  renderFrame(time, delta, isStatic) {
    const input = isStatic ? createStaticInput() : this.getInput(time);
    this.renderer.render({
      context: this.context,
      width: this.width,
      height: this.height,
      input,
      theme: this.getTheme(),
      settings: this.getSettings(this.mode),
      time: isStatic ? 0 : time,
      delta: isStatic ? 0 : delta,
      compact: this.width < 640,
    });
    if (!isStatic) this.instrumentation.record(time);
  }

  drawStatic() {
    if (this.destroyed || this.width <= 1 || this.height <= 1) return;
    this.renderFrame(0, 0, true);
  }

  resetInstrumentation() {
    this.instrumentation.reset();
  }

  snapshot(extra = {}) {
    return {
      mode: this.mode,
      animated: this.renderer.animated,
      expectsNonblank: this.renderer.expectsNonblank,
      fpsCap: this.fpsCap,
      running: this.running,
      stoppedReason: this.stoppedReason,
      canvas: {
        cssWidth: this.width,
        cssHeight: this.height,
        backingWidth: this.canvas.width,
        backingHeight: this.canvas.height,
        effectiveDpr: this.dpr,
      },
      ...this.instrumentation.snapshot(),
      ...extra,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop("unmounted", { drawStatic: false });
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
