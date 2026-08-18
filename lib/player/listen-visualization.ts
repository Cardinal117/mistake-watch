export const listenVisualizationModes = [
  {
    description: "Artwork-reactive waves with layered depth.",
    id: "dynamic-horizon",
    label: "Dynamic Horizon",
    motionLayers: 3,
  },
  {
    description: "A focused signal line with restrained movement.",
    id: "signal-ribbon",
    label: "Signal Ribbon",
    motionLayers: 1,
  },
  {
    description: "A low-power pulse for quieter sessions.",
    id: "minimal-pulse",
    label: "Minimal Pulse",
    motionLayers: 1,
  },
  {
    description: "Song artwork and color without continuous motion.",
    id: "static-artwork",
    label: "Static Artwork",
    motionLayers: 0,
  },
  {
    description: "A neutral room background without ambient visuals.",
    id: "off",
    label: "Off",
    motionLayers: 0,
  },
] as const;

export type ListenVisualizationMode =
  (typeof listenVisualizationModes)[number]["id"];

export const DEFAULT_LISTEN_VISUALIZATION_MODE: ListenVisualizationMode =
  "dynamic-horizon";

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
