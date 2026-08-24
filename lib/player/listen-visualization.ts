export const listenVisualizationModes = [
  {
    description: "Song artwork and color without continuous motion.",
    id: "static-artwork",
    inputSource: "none",
    label: "Static Artwork",
    motionLayers: 0,
    powerLabel: "Recommended",
    powerProfile: "recommended",
  },
  {
    description: "A neutral room background without ambient visuals.",
    id: "off",
    inputSource: "none",
    label: "Off",
    motionLayers: 0,
    powerLabel: "Lowest power",
    powerProfile: "lowest",
  },
  {
    description: "Mirrored frequency detail from the local audio companion.",
    id: "mirror-spectrum",
    inputSource: "local-detail",
    label: "Mirror Spectrum",
    motionLayers: 1,
    powerLabel: "Beta / very high power",
    powerProfile: "beta",
  },
  {
    description: "A tempo-locked ribbon shared across room participants.",
    id: "siri-ribbon",
    inputSource: "shared-rhythm",
    label: "Siri Ribbon",
    motionLayers: 1,
    powerLabel: "Experimental / high power",
    powerProfile: "experimental",
  },
  {
    description: "A centered tempo field shared across room participants.",
    id: "dot-waves",
    inputSource: "shared-rhythm",
    label: "Dot Waves",
    motionLayers: 1,
    powerLabel: "Beta / very high power",
    powerProfile: "beta",
  },
  {
    description: "A radial local-audio bloom with waveform detail.",
    id: "signal-bloom",
    inputSource: "local-detail",
    label: "Signal Bloom",
    motionLayers: 1,
    powerLabel: "Experimental / high power",
    powerProfile: "experimental",
  },
  {
    description: "A bounded beat-driven particle field shared by the room.",
    id: "constellation",
    inputSource: "shared-rhythm",
    label: "Constellation",
    motionLayers: 1,
    powerLabel: "Experimental / extreme power",
    powerProfile: "experimental",
  },
] as const;

export type ListenVisualizationMode =
  (typeof listenVisualizationModes)[number]["id"];

export const DEFAULT_LISTEN_VISUALIZATION_MODE: ListenVisualizationMode =
  "static-artwork";

export const LISTEN_VISUAL_INTENSITY = {
  default: 75,
  max: 100,
  min: 25,
  step: 5,
} as const;

export const LISTEN_BACKGROUND_DIMMING = {
  default: 55,
  max: 85,
  min: 35,
  step: 5,
} as const;

export function isListenVisualizationMode(
  value: unknown,
): value is ListenVisualizationMode {
  return listenVisualizationModes.some((mode) => mode.id === value);
}

export function normalizeListenVisualizationMode(
  value: unknown,
): ListenVisualizationMode {
  return isListenVisualizationMode(value)
    ? value
    : DEFAULT_LISTEN_VISUALIZATION_MODE;
}

export function getListenVisualizationMode(mode: ListenVisualizationMode) {
  return (
    listenVisualizationModes.find((candidate) => candidate.id === mode) ??
    listenVisualizationModes[0]
  );
}

export function normalizeListenAmbientLevel(
  value: unknown,
  bounds: { default: number; max: number; min: number; step: number },
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return bounds.default;
  }

  const clamped = Math.min(bounds.max, Math.max(bounds.min, parsed));
  return Math.round(clamped / bounds.step) * bounds.step;
}

export function getListenPresentationVariables(
  visualIntensity: unknown,
  backgroundDimming: unknown,
) {
  const intensity =
    normalizeListenAmbientLevel(visualIntensity, LISTEN_VISUAL_INTENSITY) / 100;
  const dimming =
    normalizeListenAmbientLevel(backgroundDimming, LISTEN_BACKGROUND_DIMMING) /
    100;

  return {
    "--listen-artwork-opacity": roundPresentationValue(0.25 + intensity * 0.6),
    "--listen-dim-bottom": roundPresentationValue(0.45 + dimming * 0.5),
    "--listen-dim-edge": roundPresentationValue(0.42 + dimming * 0.5),
    "--listen-dim-left": roundPresentationValue(0.22 + dimming * 0.5),
    "--listen-dim-middle": roundPresentationValue(0.1 + dimming * 0.3),
    "--listen-dim-top": roundPresentationValue(0.04 + dimming * 0.2),
    "--listen-panel-dim-end": roundPresentationValue(0.35 + dimming * 0.45),
    "--listen-panel-dim-middle": roundPresentationValue(0.22 + dimming * 0.4),
    "--listen-panel-dim-start": roundPresentationValue(0.28 + dimming * 0.45),
    "--listen-rail-dim-bottom": roundPresentationValue(0.25 + dimming * 0.35),
    "--listen-rail-dim-top": roundPresentationValue(0.3 + dimming * 0.4),
    "--listen-room-dim-end": roundPresentationValue(0.4 + dimming * 0.4),
    "--listen-room-dim-middle": roundPresentationValue(0.2 + dimming * 0.4),
  } as const;
}

function roundPresentationValue(value: number) {
  return Number(value.toFixed(3));
}
