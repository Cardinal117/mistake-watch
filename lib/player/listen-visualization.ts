export const listenVisualizationModes = [
  {
    description: "Song artwork and color without continuous motion.",
    id: "static-artwork",
    label: "Static Artwork",
    motionLayers: 0,
    powerLabel: "Recommended",
    powerProfile: "recommended",
  },
  {
    description: "A neutral room background without ambient visuals.",
    id: "off",
    label: "Off",
    motionLayers: 0,
    powerLabel: "Lowest power",
    powerProfile: "lowest",
  },
  {
    description: "Artwork-reactive waves with layered depth.",
    id: "dynamic-horizon",
    label: "Dynamic Horizon",
    motionLayers: 3,
    powerLabel: "Higher power",
    powerProfile: "higher",
  },
  {
    description: "A focused signal line with restrained movement.",
    id: "signal-ribbon",
    label: "Signal Ribbon",
    motionLayers: 1,
    powerLabel: "Higher power",
    powerProfile: "higher",
  },
  {
    description: "A restrained pulse for quieter sessions.",
    id: "minimal-pulse",
    label: "Minimal Pulse",
    motionLayers: 1,
    powerLabel: "Higher power",
    powerProfile: "higher",
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
    "--listen-horizon-back-opacity": roundPresentationValue(
      0.08 + intensity * 0.18,
    ),
    "--listen-horizon-front-opacity": roundPresentationValue(
      0.14 + intensity * 0.28,
    ),
    "--listen-horizon-middle-opacity": roundPresentationValue(
      0.1 + intensity * 0.24,
    ),
    "--listen-pulse-high-opacity": roundPresentationValue(
      0.55 + intensity * 0.4,
    ),
    "--listen-pulse-low-opacity": roundPresentationValue(
      0.18 + intensity * 0.32,
    ),
    "--listen-ribbon-opacity": roundPresentationValue(0.28 + intensity * 0.38),
  } as const;
}

function roundPresentationValue(value: number) {
  return Number(value.toFixed(3));
}
