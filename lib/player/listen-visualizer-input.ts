import type {
  RhythmFrameV1,
  VisualFrameV1,
} from "@/lib/audio-companion/client";
import type { ListenVisualizationMode } from "./listen-visualization";

const SPECTRUM_SIZE = 48;
const WAVEFORM_SIZE = 96;

export type ListenVisualizerInput = Readonly<{
  active: boolean;
  bass: number;
  confidence: number;
  energy: number;
  highs: number;
  kind: "idle" | "local-detail" | "preview" | "shared-rhythm";
  mids: number;
  onset: number;
  phase: number;
  spectrum: readonly number[];
  tempoBpm: number | null;
  waveform: readonly number[];
}>;

type CapabilityContext = {
  hasLocalDetail: boolean;
  hasSharedRhythm: boolean;
  preview: boolean;
};

export type ListenVisualizerInputBuffers = {
  spectrum: number[];
  waveform: number[];
};

export function createListenVisualizerInputBuffers(): ListenVisualizerInputBuffers {
  return {
    spectrum: Array.from({ length: SPECTRUM_SIZE }, () => 0),
    waveform: Array.from({ length: WAVEFORM_SIZE }, () => 0),
  };
}

export function resolveListenVisualizationCapability(
  mode: ListenVisualizationMode,
  context: CapabilityContext,
) {
  if (mode === "static-artwork" || mode === "off") {
    return { effectiveMode: mode, reason: null, source: "none" } as const;
  }
  if (context.preview) {
    return { effectiveMode: mode, reason: null, source: "preview" } as const;
  }
  if (mode === "mirror-spectrum" || mode === "signal-bloom") {
    return context.hasLocalDetail
      ? ({ effectiveMode: mode, reason: null, source: "local-detail" } as const)
      : ({
          effectiveMode: "static-artwork",
          reason: "companion-required",
          source: "fallback",
        } as const);
  }
  return context.hasSharedRhythm
    ? ({ effectiveMode: mode, reason: null, source: "shared-rhythm" } as const)
    : ({
        effectiveMode: "static-artwork",
        reason: "shared-rhythm-unavailable",
        source: "fallback",
      } as const);
}

export function createLocalDetailVisualizerInput(
  rhythm: Pick<
    RhythmFrameV1,
    "bass" | "bpm" | "confidence" | "energy" | "highs" | "mids" | "onset"
  >,
  visual: Pick<VisualFrameV1, "spectrum" | "waveform">,
  buffers = createListenVisualizerInputBuffers(),
): ListenVisualizerInput {
  for (let index = 0; index < SPECTRUM_SIZE; index += 1) {
    buffers.spectrum[index] = clamp((visual.spectrum[index] ?? 0) / 255);
  }
  for (let index = 0; index < WAVEFORM_SIZE; index += 1) {
    buffers.waveform[index] = clamp(
      ((visual.waveform[index] ?? 128) - 128) / 128,
      -1,
      1,
    );
  }
  return Object.freeze({
    active: true,
    bass: clamp(rhythm.bass),
    confidence: clamp(rhythm.confidence),
    energy: clamp(rhythm.energy),
    highs: clamp(rhythm.highs),
    kind: "local-detail",
    mids: clamp(rhythm.mids),
    onset: clamp(rhythm.onset),
    phase: 0,
    spectrum: buffers.spectrum,
    tempoBpm: rhythm.bpm,
    waveform: buffers.waveform,
  });
}

export function createSharedRhythmVisualizerInput(
  profile: {
    beatIntervalSeconds: number;
    bpm: number;
    confidence: number;
    mediaBeatOffsetSeconds: number;
  },
  mediaPositionSeconds: number,
  buffers = createListenVisualizerInputBuffers(),
): ListenVisualizerInput {
  const phase = round(
    positiveModulo(
      mediaPositionSeconds - profile.mediaBeatOffsetSeconds,
      profile.beatIntervalSeconds,
    ) / profile.beatIntervalSeconds,
  );
  const pulse = Math.exp(-phase * 8);
  const bass = clamp(0.14 + pulse * 0.76);
  const mids = clamp(0.12 + pulse * 0.46);
  const highs = clamp(0.08 + pulse * 0.3);
  const energy = clamp(0.12 + pulse * 0.68);
  for (let index = 0; index < SPECTRUM_SIZE; index += 1) {
    const ratio = index / (SPECTRUM_SIZE - 1);
    const band = ratio < 0.28 ? bass : ratio < 0.66 ? mids : highs;
    const harmonic = 0.72 + Math.sin(index * 0.43 + phase * Math.PI * 2) * 0.18;
    buffers.spectrum[index] = round(
      clamp(band * harmonic * (1 - ratio * 0.42)),
    );
  }
  for (let index = 0; index < WAVEFORM_SIZE; index += 1) {
    const ratio = index / WAVEFORM_SIZE;
    buffers.waveform[index] = round(
      clamp(
        Math.sin(ratio * Math.PI * 6 + phase * Math.PI * 2) * energy * 0.72 +
          Math.sin(ratio * Math.PI * 14 - phase * Math.PI) * highs * 0.2,
        -1,
        1,
      ),
    );
  }
  return Object.freeze({
    active: true,
    bass,
    confidence: clamp(profile.confidence),
    energy,
    highs,
    kind: "shared-rhythm",
    mids,
    onset: pulse,
    phase,
    spectrum: buffers.spectrum,
    tempoBpm: profile.bpm,
    waveform: buffers.waveform,
  });
}

export function createPreviewVisualizerInput(
  mediaTimeSeconds: number,
  buffers = createListenVisualizerInputBuffers(),
): ListenVisualizerInput {
  return {
    ...createSharedRhythmVisualizerInput(
      {
        beatIntervalSeconds: 0.5,
        bpm: 120,
        confidence: 0.92,
        mediaBeatOffsetSeconds: 0,
      },
      mediaTimeSeconds,
      buffers,
    ),
    kind: "preview",
  };
}

export function createIdleVisualizerInput(): ListenVisualizerInput {
  return IDLE_INPUT;
}

const IDLE_INPUT: ListenVisualizerInput = Object.freeze({
  active: false,
  bass: 0,
  confidence: 0,
  energy: 0,
  highs: 0,
  kind: "idle",
  mids: 0,
  onset: 0,
  phase: 0,
  spectrum: Object.freeze(Array.from({ length: SPECTRUM_SIZE }, () => 0)),
  tempoBpm: null,
  waveform: Object.freeze(Array.from({ length: WAVEFORM_SIZE }, () => 0)),
});

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
