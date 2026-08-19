import { createConstellationRenderer } from "./constellation.js";
import { createDotWavesRenderer } from "./dot-waves.js";
import { createMirrorSpectrumRenderer } from "./mirror-spectrum.js";
import { createObsidianGridRenderer } from "./obsidian-grid.js";
import { createOffRenderer } from "./off.js";
import { createSignalBloomRenderer } from "./signal-bloom.js";
import { createSiriRibbonRenderer } from "./siri-ribbon.js";
import { createSilkNebulaRenderer } from "./silk-nebula.js";
import { createStaticArtworkRenderer } from "./static-artwork.js";

export const RENDERER_FACTORIES = {
  static: createStaticArtworkRenderer,
  off: createOffRenderer,
  bloom: createSignalBloomRenderer,
  spectrum: createMirrorSpectrumRenderer,
  ribbon: createSiriRibbonRenderer,
  dots: createDotWavesRenderer,
  silk: createSilkNebulaRenderer,
  grid: createObsidianGridRenderer,
  constellation: createConstellationRenderer,
};

export function createRenderer(mode) {
  const factory = RENDERER_FACTORIES[mode];
  if (!factory) throw new Error(`Unknown visualizer mode: ${mode}`);
  return factory();
}
