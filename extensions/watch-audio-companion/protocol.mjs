import { normalizeRhythmFrameV1 } from "./rhythm-contract.mjs";
export { normalizeVisualFrameV1 } from "./visual-frame-contract.mjs";

export const MESSAGE_TARGET = Object.freeze({
  offscreen: "watch-audio-offscreen",
  visualizer: "watch-audio-visualizer",
  worker: "watch-audio-worker",
});

export const MESSAGE_TYPE = Object.freeze({
  captureState: "capture-state",
  getStatus: "get-status",
  startCapture: "start-capture",
  stopCapture: "stop-capture",
  visualFrame: "visual-frame",
});

const allowedProductionOrigins = new Set([
  "https://watch.mistakestudios.com",
  "https://mistake-watch.vercel.app",
]);

export function isAllowedWatchUrl(value) {
  try {
    const url = new URL(value);

    if (allowedProductionOrigins.has(url.origin)) {
      return true;
    }

    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export function normalizeAnalyserTelemetry(value) {
  return {
    frames: toNonNegativeInteger(value?.frames),
    peak: clampUnit(value?.peak),
    rhythm: normalizeRhythmFrameV1(value?.rhythm),
    rms: clampUnit(value?.rms),
  };
}

export function publicErrorMessage(error) {
  return error instanceof Error && error.message
    ? error.message
    : "Audio capture failed.";
}

function clampUnit(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toNonNegativeInteger(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
