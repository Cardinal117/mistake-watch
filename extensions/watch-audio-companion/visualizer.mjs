import { MESSAGE_TARGET, MESSAGE_TYPE } from "./protocol.mjs";
import {
  RhythmVisualizerInput,
  createFixtureFrame,
} from "./rhythm-visualizer-input.mjs";
import { VisualizerEngine } from "./visualizer-engine.mjs";
import {
  VISUALIZER_MODE_DETAILS,
  normalizeVisualizerMode,
} from "./visualizer-renderers.mjs";

const POLL_INTERVAL_MS = 250;
const inputAdapter = new RhythmVisualizerInput();
const state = {
  fixtureSequence: 0,
  input: "live",
  lastActive: false,
  pollId: null,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
};

const elements = {
  bpm: document.querySelector("#bpm"),
  confidence: document.querySelector("#confidence"),
  fps: document.querySelector("#fps"),
  input: document.querySelector("#input"),
  mode: document.querySelector("#mode"),
  powerNotice: document.querySelector("#power-notice"),
  status: document.querySelector("#status"),
  stop: document.querySelector("#stop-capture"),
};

applyQuery();

const engine = new VisualizerEngine({
  canvas: document.querySelector("#visualizer"),
  fps: elements.fps.value,
  getInput: (time) => sampleInput(time),
  mode: elements.mode.value,
});

elements.mode.addEventListener("change", () => {
  engine.setMode(elements.mode.value);
  updateModeLabel();
});
elements.fps.addEventListener("change", () =>
  engine.setFps(elements.fps.value),
);
elements.input.addEventListener("change", () => {
  state.input = elements.input.value;
  inputAdapter.reset();
  syncControlState();
  void refresh();
});
elements.stop.addEventListener("click", () => void stopCapture());
state.reducedMotion.addEventListener("change", syncLifecycle);
document.addEventListener("visibilitychange", () => {
  syncLifecycle();
  if (!document.hidden) void refresh();
});
globalThis.addEventListener("pagehide", dispose);

state.pollId = globalThis.setInterval(() => void refresh(), POLL_INTERVAL_MS);
void refresh();
syncLifecycle();
updateModeLabel();

globalThis.rhythmVisualizerLab = Object.freeze({
  setFps: (fps) => {
    elements.fps.value = Number(fps) === 30 ? "30" : "24";
    engine.setFps(elements.fps.value);
  },
  setInput: (input) => {
    elements.input.value = input === "fixture" ? "fixture" : "live";
    elements.input.dispatchEvent(new Event("change"));
  },
  setMode: (mode) => {
    elements.mode.value = normalizeVisualizerMode(mode);
    elements.mode.dispatchEvent(new Event("change"));
  },
  snapshot: () => ({
    ...engine.snapshot(),
    input: state.input,
    status: elements.status.dataset.state,
  }),
});

async function refresh() {
  if (document.hidden) return;

  if (state.input === "fixture") {
    const nowSeconds = performance.now() / 1_000;
    inputAdapter.accept(
      createFixtureFrame(120, nowSeconds, state.fixtureSequence++),
      performance.now(),
    );
    state.lastActive = true;
    setStatus("fixture", "120 BPM fixture");
    updateReadout(inputAdapter.sample(performance.now()));
    syncControlState();
    syncLifecycle();
    return;
  }

  try {
    const response = await sendMessage({
      target: MESSAGE_TARGET.offscreen,
      type: MESSAGE_TYPE.getStatus,
    });
    const status = response?.ok ? response.status : null;
    state.lastActive = Boolean(status?.active);

    if (status?.active) {
      if (status.rhythm) {
        inputAdapter.accept(status.rhythm, performance.now());
      }
      const input = inputAdapter.sample(performance.now());
      setStatus(
        input.tempoBpm === null ? "listening" : "locked",
        status.reason,
      );
    } else {
      inputAdapter.reset();
      setStatus("idle", "Capture inactive");
    }
  } catch {
    state.lastActive = false;
    inputAdapter.reset();
    setStatus("idle", "Capture inactive");
  }

  updateReadout(inputAdapter.sample(performance.now()));
  syncControlState();
  syncLifecycle();
}

function sampleInput(time) {
  return inputAdapter.sample(time);
}

function syncLifecycle() {
  const shouldRun =
    !document.hidden &&
    !state.reducedMotion.matches &&
    (state.input === "fixture" || state.lastActive);
  if (shouldRun) engine.start();
  else engine.stop(document.hidden ? "hidden" : "inactive");
}

async function stopCapture() {
  try {
    await sendMessage({
      target: MESSAGE_TARGET.worker,
      type: MESSAGE_TYPE.stopCapture,
    });
  } finally {
    state.lastActive = false;
    inputAdapter.reset();
    setStatus("idle", "Capture stopped");
    syncControlState();
    syncLifecycle();
  }
}

function updateReadout(input) {
  elements.bpm.textContent = input.tempoBpm ? input.tempoBpm.toFixed(1) : "--";
  elements.confidence.textContent = `${Math.round(input.confidence * 100)}%`;
}

function setStatus(value, detail) {
  elements.status.dataset.state = value;
  elements.status.textContent =
    value === "locked"
      ? "Rhythm locked"
      : value === "listening"
        ? "Analysing"
        : value === "fixture"
          ? detail
          : "Capture inactive";
}

function updateModeLabel() {
  const details =
    VISUALIZER_MODE_DETAILS[normalizeVisualizerMode(elements.mode.value)];
  document.querySelector("#mode-title").textContent = details.label;
  elements.powerNotice.textContent = `${details.power}. Static Artwork remains the safe default in Mistake Watch.`;
}

function syncControlState() {
  elements.stop.disabled = state.input !== "live" || !state.lastActive;
}

function applyQuery() {
  const query = new URLSearchParams(location.search);
  elements.input.value = query.get("input") === "fixture" ? "fixture" : "live";
  elements.mode.value = normalizeVisualizerMode(query.get("mode"));
  elements.fps.value = query.get("fps") === "30" ? "30" : "24";
  state.input = elements.input.value;
}

function sendMessage(message) {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    return Promise.reject(new Error("Extension runtime unavailable."));
  }
  return globalThis.chrome.runtime.sendMessage(message);
}

function dispose() {
  globalThis.clearInterval(state.pollId);
  engine.destroy();
}
