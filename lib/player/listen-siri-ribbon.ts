import type { ListenVisualizerInput } from "./listen-visualizer-input";

export const SIRI_RIBBON_LOBE_COUNT = 5;

const POSITION_WEIGHTS = [0.55, 0.8, 1, 0.8, 0.55] as const;
const SPECTRUM_POSITIONS = [0.86, 0.42, 0.08, 0.62, 0.98] as const;
const ATTACK_MS = [26, 42, 34, 42, 26] as const;
const RELEASE_MS = [110, 220, 280, 220, 110] as const;

export type SiriRibbonDynamics = {
  levels: Float32Array;
  targets: Float32Array;
};

export function createSiriRibbonDynamics(): SiriRibbonDynamics {
  return {
    levels: new Float32Array(SIRI_RIBBON_LOBE_COUNT),
    targets: new Float32Array(SIRI_RIBBON_LOBE_COUNT),
  };
}

export function getSiriRibbonLobeTargets(
  input: ListenVisualizerInput,
  output: Float32Array = new Float32Array(SIRI_RIBBON_LOBE_COUNT),
) {
  const rest = 0.045 + input.energy * 0.07;
  for (let index = 0; index < SIRI_RIBBON_LOBE_COUNT; index += 1) {
    const spectrum = sampleSpectrum(input.spectrum, SPECTRUM_POSITIONS[index]);
    const role = getRoleSignal(input, spectrum, index);
    output[index] = clamp((rest + role * 0.78) * POSITION_WEIGHTS[index]);
  }
  return output;
}

export function updateSiriRibbonDynamics(
  dynamics: SiriRibbonDynamics,
  targets: ArrayLike<number>,
  deltaMs: number,
) {
  const elapsed = clamp(deltaMs, 1, 250);
  for (let index = 0; index < SIRI_RIBBON_LOBE_COUNT; index += 1) {
    const current = dynamics.levels[index] ?? 0;
    const target = clamp(targets[index] ?? 0);
    const duration = target > current ? ATTACK_MS[index] : RELEASE_MS[index];
    const blend = 1 - Math.exp(-elapsed / duration);
    dynamics.levels[index] = current + (target - current) * blend;
  }
  return dynamics.levels;
}

function sampleSpectrum(values: readonly number[], ratio: number) {
  if (values.length === 0) return 0;
  const position = ratio * (values.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(values.length - 1, lower + 1);
  const mix = position - lower;
  return (values[lower] ?? 0) * (1 - mix) + (values[upper] ?? 0) * mix;
}

function getRoleSignal(
  input: ListenVisualizerInput,
  spectrum: number,
  index: number,
) {
  switch (index) {
    case 0:
      return input.highs * 0.46 + input.onset * 0.22 + spectrum * 0.32;
    case 1:
      return input.mids * 0.5 + input.energy * 0.18 + spectrum * 0.32;
    case 2:
      return input.bass * 0.48 + input.onset * 0.3 + spectrum * 0.22;
    case 3:
      return input.mids * 0.46 + input.energy * 0.2 + spectrum * 0.34;
    default:
      return input.highs * 0.42 + input.onset * 0.28 + spectrum * 0.3;
  }
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}
