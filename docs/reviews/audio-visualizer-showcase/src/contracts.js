export const TRACKS = {
  ezio: { title: "Ezio's Family", src: "./assets/ezios-family.mp3" },
  aryll: { title: "Aryll's Theme", src: "./assets/arylls-theme.mp3" },
};

export const MODES = {
  static: {
    stage: "CONTROL",
    title: "Static Artwork",
    kicker: "Benchmark control / safe default",
    summary:
      "A motion-free artwork-color wash representing the current production-safe baseline.",
    badges: ["Control", "No continuous motion"],
    decision: "add",
  },
  off: {
    stage: "CONTROL",
    title: "Off",
    kicker: "Benchmark control / minimum work",
    summary:
      "A neutral room surface with the visualizer fully disabled and no active render loop.",
    badges: ["Control", "Lowest power"],
    decision: "add",
  },
  bloom: {
    stage: "TEST",
    title: "Signal Bloom",
    kicker: "Laptop candidate / cinematic",
    summary:
      "A radial frequency aperture that turns orchestral swells into a clear focal event.",
    badges: ["Laptop test", "Medium power"],
    decision: "add",
  },
  spectrum: {
    stage: "TEST",
    title: "Mirror Spectrum",
    kicker: "Laptop candidate / technical",
    summary:
      "A centre-origin spectrum that spreads equally left and right as the beat gains energy.",
    badges: ["Laptop test", "Lowest new cost"],
    decision: "add",
  },
  ribbon: {
    stage: "TEST",
    title: "Siri Ribbon",
    kicker: "Laptop candidate / fluid signal",
    summary:
      "Three bounded signal curves replace the former broad ribbon with tempo-aware motion.",
    badges: ["Laptop test", "Signal Ribbon replacement"],
    decision: "add",
  },
  dots: {
    stage: "TEST",
    title: "Dot Waves",
    kicker: "Laptop candidate / field motion",
    summary:
      "A fixed-density signal field moves with tempo and spectrum energy without unbounded geometry.",
    badges: ["Laptop test", "Fixed dot budget"],
    decision: "add",
  },
  silk: {
    stage: "HOLD",
    title: "Silk Nebula",
    kicker: "Performance hold / ambient",
    summary:
      "A flowing ribbon whose strongest vibrations ignite into localized blue and gold bloom.",
    badges: ["Performance hold", "High measured cost"],
    decision: "later",
  },
  grid: {
    stage: "HOLD",
    title: "Obsidian Grid",
    kicker: "Experimental / spatial",
    summary:
      "A perspective terrain whose energetic ridges flare as the arrangement grows in intensity.",
    badges: ["Keep for later", "Higher power"],
    decision: "later",
  },
  constellation: {
    stage: "HOLD",
    title: "Constellation",
    kicker: "Experimental / playful",
    summary:
      "Frequency stars brighten, connect, and expand outward as beats move through the track.",
    badges: ["Keep for later", "Higher power"],
    decision: "later",
  },
};

export const THEMES = {
  signal: {
    label: "Signal",
    theme: {
      primary: "0 219 233",
      secondary: "255 186 32",
      shadow: "0 219 233",
      wave: "219 252 255",
    },
  },
  gold: {
    label: "Gold",
    theme: {
      primary: "255 186 32",
      secondary: "184 130 22",
      shadow: "255 186 32",
      wave: "255 214 108",
    },
  },
  ember: {
    label: "Ember",
    theme: {
      primary: "219 116 62",
      secondary: "255 186 32",
      shadow: "219 116 62",
      wave: "255 196 92",
    },
  },
  violet: {
    label: "Violet",
    theme: {
      primary: "176 111 224",
      secondary: "255 186 32",
      shadow: "176 111 224",
      wave: "225 184 255",
    },
  },
  champagne: {
    label: "Champagne",
    theme: {
      primary: "255 219 157",
      secondary: "155 112 72",
      shadow: "255 186 32",
      wave: "255 205 88",
    },
  },
};

export const SETTING_DEFINITIONS = [
  {
    description: "Controls the visible strength of lines and particles.",
    id: "brightness",
    label: "Brightness",
    min: 40,
    max: 180,
    step: 5,
  },
  {
    description: "Controls emitted-light radius and bloom presence.",
    id: "bloom",
    label: "Bloom",
    min: 0,
    max: 250,
    step: 5,
  },
  {
    description: "Amplifies the response to frequency and waveform energy.",
    id: "reactivity",
    label: "Reactivity",
    min: 50,
    max: 180,
    step: 5,
  },
  {
    description: "Higher values make movement and glow linger longer.",
    id: "smoothing",
    label: "Smoothing",
    min: 0,
    max: 100,
    step: 5,
  },
];

export const SETTINGS_DEFAULTS = {
  static: { brightness: 100, bloom: 0, reactivity: 100, smoothing: 60 },
  off: { brightness: 100, bloom: 0, reactivity: 100, smoothing: 60 },
  bloom: { brightness: 110, bloom: 125, reactivity: 110, smoothing: 65 },
  spectrum: { brightness: 110, bloom: 75, reactivity: 115, smoothing: 60 },
  ribbon: { brightness: 115, bloom: 55, reactivity: 115, smoothing: 60 },
  dots: { brightness: 120, bloom: 0, reactivity: 115, smoothing: 55 },
  silk: { brightness: 115, bloom: 165, reactivity: 115, smoothing: 70 },
  grid: { brightness: 155, bloom: 220, reactivity: 135, smoothing: 70 },
  constellation: {
    brightness: 120,
    bloom: 165,
    reactivity: 125,
    smoothing: 65,
  },
};

export const BENCHMARK_SETTINGS = {
  static: { brightness: 100, bloom: 0, reactivity: 100, smoothing: 60 },
  off: { brightness: 100, bloom: 0, reactivity: 100, smoothing: 60 },
  bloom: { brightness: 100, bloom: 80, reactivity: 110, smoothing: 60 },
  spectrum: { brightness: 100, bloom: 50, reactivity: 110, smoothing: 55 },
  ribbon: { brightness: 100, bloom: 35, reactivity: 110, smoothing: 55 },
  dots: { brightness: 105, bloom: 0, reactivity: 110, smoothing: 50 },
  silk: { brightness: 100, bloom: 80, reactivity: 110, smoothing: 60 },
  grid: { brightness: 105, bloom: 70, reactivity: 110, smoothing: 60 },
  constellation: {
    brightness: 100,
    bloom: 70,
    reactivity: 110,
    smoothing: 60,
  },
};

export const TEMPO_FIXTURES = [60, 90, 120, 160];

const THEME_KEYS = ["primary", "secondary", "shadow", "wave"];

export function normalizeTheme(candidate, fallback = THEMES.signal.theme) {
  const normalized = {};
  for (const key of THEME_KEYS) {
    const value = String(candidate?.[key] ?? fallback[key]).trim();
    normalized[key] = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value)
      ? value
      : fallback[key];
  }
  return normalized;
}

export function normalizeModeSettings(mode, candidate = {}) {
  const defaults = SETTINGS_DEFAULTS[mode] ?? SETTINGS_DEFAULTS.bloom;
  return Object.fromEntries(
    SETTING_DEFINITIONS.map((definition) => {
      const value = Number(candidate[definition.id]);
      const fallback = defaults[definition.id];
      const normalized = Number.isFinite(value) ? value : fallback;
      return [
        definition.id,
        Math.min(definition.max, Math.max(definition.min, normalized)),
      ];
    }),
  );
}

export function createStaticInput(kind = "static") {
  const spectrum = new Float32Array(256);
  const waveform = new Float32Array(512);
  for (let i = 0; i < spectrum.length; i += 1) {
    spectrum[i] = 0.06 + Math.sin(i * 0.13) * 0.015;
  }
  return {
    kind,
    spectrum,
    waveform,
    bass: 0.12,
    mids: 0.1,
    highs: 0.08,
    tempoBpm: null,
    phase: 0,
  };
}
