import { WebAudioInput } from "./audio-input.js";
import { createTempoInput, normalizeTempoBpm } from "./benchmark-input.js";
import {
  BENCHMARK_SETTINGS,
  MODES,
  normalizeModeSettings,
  normalizeTheme,
  SETTINGS_DEFAULTS,
  SETTING_DEFINITIONS,
  TEMPO_FIXTURES,
  THEMES,
  TRACKS,
} from "./contracts.js";
import { VisualizerEngine } from "./visualizer-engine.js";
import { createStatusView, formatTime, renderModes } from "./view-helpers.js";

const STORAGE_KEY = "mw_visualizer_showcase_settings_v1";
const query = new URLSearchParams(window.location.search);
const benchmarkMode = query.get("benchmark") === "1";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const elements = {
  audio: document.querySelector("#audio"),
  canvas: document.querySelector("#visualizer"),
  play: document.querySelector("#play"),
  seek: document.querySelector("#seek"),
  currentTime: document.querySelector("#current-time"),
  duration: document.querySelector("#duration"),
  status: document.querySelector("#status-message"),
  modeTitle: document.querySelector("#active-mode-title"),
  modeKicker: document.querySelector("#mode-kicker"),
  modeSummary: document.querySelector("#mode-summary"),
  modeBadges: document.querySelector("#mode-badges"),
  modeStrip: document.querySelector("#mode-strip"),
  themeOptions: document.querySelector("#theme-options"),
  settingsModeTitle: document.querySelector("#settings-mode-title"),
  settings: document.querySelector("#visualizer-settings"),
  resetSettings: document.querySelector("#reset-settings"),
  benchmarkPanel: document.querySelector("#benchmark-panel"),
  benchmarkInput: document.querySelector("#benchmark-input"),
  benchmarkBpm: document.querySelector("#benchmark-bpm"),
  benchmarkFps: document.querySelector("#benchmark-fps"),
  benchmarkToggle: document.querySelector("#benchmark-toggle"),
  benchmarkReadout: document.querySelector("#benchmark-readout"),
};

let activeTrack = "ezio";
let activeMode = MODES[query.get("mode")] ? query.get("mode") : "bloom";
let activeThemeId = THEMES[query.get("theme")] ? query.get("theme") : "signal";
let activeTheme = THEMES[activeThemeId].theme;
let settingsByMode = loadSettings();
let inputType =
  benchmarkMode && query.get("input") === "tempo" ? "tempo" : "live";
let tempoBpm = normalizeTempoBpm(query.get("bpm"));
let benchmarkPlaying = false;
let forcedReducedMotion = false;
let disposed = false;
const statusView = createStatusView(elements.status);

if (inputType === "live") elements.audio.src = TRACKS[activeTrack].src;
const audioInput = new WebAudioInput(elements.audio);
const engine = new VisualizerEngine({
  canvas: elements.canvas,
  getInput: (time) =>
    inputType === "tempo"
      ? createTempoInput(tempoBpm, time)
      : audioInput.sample(),
  getSettings: (mode) => settingsByMode[mode],
  getTheme: () => activeTheme,
});
engine.setMode(activeMode);
engine.setFpsCap(query.get("fps") === "24" ? 24 : 30);

function loadSettings() {
  let parsed = {};
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    parsed = {};
  }
  return Object.fromEntries(
    Object.keys(MODES).map((mode) => [
      mode,
      normalizeModeSettings(mode, parsed[mode]),
    ]),
  );
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsByMode));
}

function updateUrl(updates) {
  const next = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) next.searchParams.delete(key);
    else next.searchParams.set(key, String(value));
  }
  history.replaceState(null, "", next);
}

function setTheme(themeOrId, options = {}) {
  if (typeof themeOrId === "string" && THEMES[themeOrId]) {
    activeThemeId = themeOrId;
    activeTheme = THEMES[themeOrId].theme;
  } else {
    activeThemeId = "custom";
    activeTheme = normalizeTheme(themeOrId);
  }
  document.documentElement.style.setProperty(
    "--theme-primary",
    activeTheme.primary,
  );
  document.documentElement.style.setProperty(
    "--theme-secondary",
    activeTheme.secondary,
  );
  document.documentElement.style.setProperty(
    "--theme-shadow",
    activeTheme.shadow,
  );
  document.documentElement.style.setProperty("--theme-wave", activeTheme.wave);
  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.theme === activeThemeId),
    );
  });
  if (options.updateUrl !== false) {
    updateUrl({ theme: activeThemeId === "custom" ? null : activeThemeId });
  }
  engine.drawStatic();
  return { ...activeTheme };
}

function renderThemeOptions() {
  elements.themeOptions.replaceChildren(
    ...Object.entries(THEMES).map(([id, entry]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-button";
      button.dataset.theme = id;
      button.setAttribute("aria-pressed", String(id === activeThemeId));
      button.innerHTML = `
        <span class="theme-swatches" aria-hidden="true">
          <span style="background:rgb(${entry.theme.primary})"></span>
          <span style="background:rgb(${entry.theme.secondary})"></span>
          <span style="background:rgb(${entry.theme.shadow})"></span>
          <span style="background:rgb(${entry.theme.wave})"></span>
        </span>
        <span class="theme-name">${entry.label}</span>
      `;
      button.style.setProperty("--theme-primary", entry.theme.primary);
      button.style.setProperty("--theme-shadow", entry.theme.shadow);
      button.addEventListener("click", () => setTheme(id));
      return button;
    }),
  );
}

function setSettings(mode, patch, options = {}) {
  if (!MODES[mode]) throw new Error(`Unknown visualizer mode: ${mode}`);
  settingsByMode = {
    ...settingsByMode,
    [mode]: normalizeModeSettings(mode, {
      ...settingsByMode[mode],
      ...patch,
    }),
  };
  if (options.persist !== false) persistSettings();
  if (mode === activeMode) {
    audioInput.setSmoothing(settingsByMode[mode].smoothing);
    renderSettingsControls();
    engine.drawStatic();
  }
  return { ...settingsByMode[mode] };
}

function renderSettingsControls() {
  elements.settingsModeTitle.textContent = MODES[activeMode].title;
  const activeSettings = settingsByMode[activeMode];
  elements.settings.replaceChildren(
    ...SETTING_DEFINITIONS.map((definition) => {
      const wrapper = document.createElement("label");
      wrapper.className = "setting-control";
      wrapper.innerHTML = `
        <span class="setting-header">
          <span class="setting-label">${definition.label}</span>
          <output class="setting-output">${activeSettings[definition.id]}%</output>
        </span>
        <span class="setting-description">${definition.description}</span>
        <input class="setting-slider" type="range" min="${definition.min}"
          max="${definition.max}" step="${definition.step}"
          value="${activeSettings[definition.id]}"
          aria-label="${MODES[activeMode].title} ${definition.label}" />
      `;
      const input = wrapper.querySelector("input");
      const output = wrapper.querySelector("output");
      input.addEventListener("input", () => {
        output.value = `${input.value}%`;
        setSettings(activeMode, { [definition.id]: Number(input.value) });
      });
      return wrapper;
    }),
  );
}

function updateModeCopy() {
  const mode = MODES[activeMode];
  elements.modeTitle.textContent = mode.title;
  elements.modeKicker.textContent = mode.kicker;
  elements.modeSummary.textContent = mode.summary;
  elements.modeBadges.replaceChildren(
    ...mode.badges.map((label, index) => {
      const badge = document.createElement("span");
      badge.className = `badge badge--${index === 0 ? mode.decision : "neutral"}`;
      badge.textContent = label;
      return badge;
    }),
  );
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.mode === activeMode),
    );
  });
}

function setMode(mode, options = {}) {
  if (!MODES[mode]) throw new Error(`Unknown visualizer mode: ${mode}`);
  activeMode = mode;
  engine.setMode(mode);
  audioInput.setSmoothing(settingsByMode[mode].smoothing);
  updateModeCopy();
  renderSettingsControls();
  if (options.updateUrl !== false) updateUrl({ mode });
  updateBenchmarkReadout();
  return activeMode;
}

function stoppedReason() {
  if (document.hidden) return "hidden";
  if (reduceMotion.matches || forcedReducedMotion) return "reduced-motion";
  if (inputType === "tempo") return benchmarkPlaying ? null : "paused";
  return elements.audio.paused ? "paused" : null;
}

function syncLifecycle() {
  const reason = stoppedReason();
  if (reason) engine.stop(reason);
  else {
    engine.start();
    if (inputType === "tempo") statusView.hide();
  }
  updateBenchmarkReadout();
}

async function togglePlayback() {
  if (inputType === "tempo") {
    benchmarkPlaying = !benchmarkPlaying;
    syncLifecycle();
    return;
  }
  if (elements.audio.paused) {
    if (!audioInput.ensure()) {
      statusView.show(
        "The browser blocked Web Audio analysis. Native playback remains available.",
      );
    }
    await audioInput.resume().catch(() => {});
    await elements.audio.play().catch(() => {
      statusView.show(
        "Press the native audio play button to start this track.",
      );
    });
  } else {
    elements.audio.pause();
  }
}

function setInput(nextInput) {
  const requested = typeof nextInput === "string" ? nextInput : nextInput?.type;
  if (requested !== "live" && requested !== "tempo") {
    throw new Error("Input type must be live or tempo");
  }
  if (requested === "tempo" && !benchmarkMode) {
    throw new Error("Deterministic tempo input requires ?benchmark=1");
  }
  inputType = requested;
  if (nextInput?.bpm !== undefined) tempoBpm = normalizeTempoBpm(nextInput.bpm);
  benchmarkPlaying = false;
  if (elements.benchmarkInput) elements.benchmarkInput.value = inputType;
  if (elements.benchmarkBpm) elements.benchmarkBpm.value = String(tempoBpm);
  updateUrl({
    input: inputType === "tempo" ? "tempo" : null,
    bpm: inputType === "tempo" ? tempoBpm : null,
  });
  syncLifecycle();
  return { type: inputType, bpm: tempoBpm };
}

function updateBenchmarkReadout() {
  if (!elements.benchmarkReadout) return;
  const snapshot = engine.snapshot({ inputType, tempoBpm });
  elements.benchmarkReadout.textContent = `${snapshot.running ? "RUNNING" : `STOPPED: ${snapshot.stoppedReason}`} · ${snapshot.mode} · ${snapshot.fpsCap} FPS · ${inputType === "tempo" ? `${tempoBpm} BPM fixture` : "live analyser"}`;
  if (elements.benchmarkToggle) {
    elements.benchmarkToggle.textContent = snapshot.running
      ? "Stop sample"
      : "Start sample";
  }
}

function configureBenchmarkPanel() {
  if (!benchmarkMode || !elements.benchmarkPanel) return;
  elements.benchmarkPanel.hidden = false;
  elements.benchmarkInput.value = inputType;
  elements.benchmarkBpm.value = String(tempoBpm);
  elements.benchmarkFps.value = String(engine.fpsCap);
  elements.benchmarkInput.addEventListener("change", () =>
    setInput({ type: elements.benchmarkInput.value, bpm: tempoBpm }),
  );
  elements.benchmarkBpm.addEventListener("change", () => {
    tempoBpm = normalizeTempoBpm(elements.benchmarkBpm.value);
    updateUrl({ bpm: tempoBpm });
    engine.drawStatic();
    updateBenchmarkReadout();
  });
  elements.benchmarkFps.addEventListener("change", () => {
    engine.setFpsCap(Number(elements.benchmarkFps.value));
    updateUrl({ fps: engine.fpsCap });
    updateBenchmarkReadout();
  });
  elements.benchmarkToggle.addEventListener("click", () => {
    if (engine.running) {
      if (inputType === "live") elements.audio.pause();
      else benchmarkPlaying = false;
    } else if (inputType === "live") {
      togglePlayback();
      return;
    } else {
      benchmarkPlaying = true;
    }
    syncLifecycle();
  });
  updateBenchmarkReadout();
}

function installEvents() {
  elements.play.addEventListener("click", togglePlayback);
  elements.resetSettings.addEventListener("click", () => {
    setSettings(activeMode, SETTINGS_DEFAULTS[activeMode]);
  });
  elements.audio.addEventListener("play", () => {
    audioInput.ensure();
    audioInput.resume().catch(() => {});
    elements.play.textContent = "Ⅱ";
    elements.play.setAttribute("aria-label", "Pause audio");
    statusView.hide();
    syncLifecycle();
  });
  elements.audio.addEventListener("pause", () => {
    elements.play.textContent = "▶";
    elements.play.setAttribute("aria-label", "Play audio");
    syncLifecycle();
  });
  elements.audio.addEventListener("loadedmetadata", () => {
    elements.duration.textContent = formatTime(elements.audio.duration);
  });
  elements.audio.addEventListener("timeupdate", () => {
    elements.currentTime.textContent = formatTime(elements.audio.currentTime);
    elements.seek.value = elements.audio.duration
      ? Math.round(
          (elements.audio.currentTime / elements.audio.duration) * 1000,
        )
      : 0;
  });
  elements.audio.addEventListener("error", () =>
    statusView.show(
      "The selected review track could not be loaded. Keep the assets folder beside index.html.",
    ),
  );
  elements.seek.addEventListener("input", () => {
    if (elements.audio.duration) {
      elements.audio.currentTime =
        (Number(elements.seek.value) / 1000) * elements.audio.duration;
    }
  });
  document.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", async () => {
      const wasPlaying = !elements.audio.paused;
      activeTrack = button.dataset.track;
      document.querySelectorAll("[data-track]").forEach((candidate) => {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      });
      elements.audio.src = TRACKS[activeTrack].src;
      elements.audio.load();
      if (wasPlaying) {
        await elements.audio
          .play()
          .catch(() =>
            statusView.show("Press play to start the selected track."),
          );
      }
    });
  });
  document.addEventListener("visibilitychange", syncLifecycle);
  reduceMotion.addEventListener("change", syncLifecycle);
  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, button, select, audio")) return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    }
    if (inputType !== "live") return;
    if (event.code === "ArrowLeft") {
      elements.audio.currentTime = Math.max(0, elements.audio.currentTime - 5);
    }
    if (event.code === "ArrowRight") {
      elements.audio.currentTime = Math.min(
        elements.audio.duration || Infinity,
        elements.audio.currentTime + 5,
      );
    }
  });
  window.addEventListener("pagehide", dispose, { once: true });
}

function dispose() {
  if (disposed) return;
  disposed = true;
  engine.destroy();
  audioInput.dispose();
}

function installPublicApi() {
  window.visualizerShowcase = {
    getMode: () => activeMode,
    setMode,
    getTheme: () => ({ ...activeTheme }),
    setTheme,
    getSettings: (mode = activeMode) => ({ ...settingsByMode[mode] }),
    setSettings,
    dispose,
    benchmark: {
      fixtures: [...TEMPO_FIXTURES],
      setInput,
      setFpsCap(value) {
        engine.setFpsCap(value);
        if (elements.benchmarkFps) elements.benchmarkFps.value = String(value);
        updateBenchmarkReadout();
        return engine.fpsCap;
      },
      applySafePreset(mode = activeMode) {
        return setSettings(mode, BENCHMARK_SETTINGS[mode], { persist: false });
      },
      start() {
        if (inputType === "live") {
          throw new Error("Use the page playback control to start live audio");
        }
        benchmarkPlaying = true;
        statusView.hide();
        syncLifecycle();
      },
      stop(reason = "benchmark-stop") {
        if (inputType === "live") elements.audio.pause();
        benchmarkPlaying = false;
        engine.stop(reason);
        updateBenchmarkReadout();
      },
      setReducedMotionForTest(value) {
        forcedReducedMotion = Boolean(value);
        syncLifecycle();
      },
      reset() {
        engine.resetInstrumentation();
        updateBenchmarkReadout();
      },
      snapshot() {
        return engine.snapshot({
          inputType,
          tempoBpm,
          benchmarkMode,
          reducedMotion: reduceMotion.matches || forcedReducedMotion,
          documentHidden: document.hidden,
        });
      },
    },
  };
}

renderThemeOptions();
renderModes(elements.modeStrip, MODES, activeMode, setMode);
setTheme(activeThemeId, { updateUrl: false });
setMode(activeMode, { updateUrl: false });
installEvents();
configureBenchmarkPanel();
installPublicApi();
statusView.show("Press play to start the audio-reactive preview.");
syncLifecycle();
