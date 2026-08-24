import type { ListenVisualizerInput } from "./listen-visualizer-input";
import type { ListenVisualizationMode } from "./listen-visualization";

export type ListenCanvasTheme = {
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};

export type ListenCanvasRendererFrame = {
  compact: boolean;
  context: CanvasRenderingContext2D;
  deltaMs: number;
  height: number;
  input: ListenVisualizerInput;
  intensity: number;
  theme: ListenCanvasTheme;
  timeMs: number;
  width: number;
};

export type ListenCanvasRenderer = {
  dispose(): void;
  id: ListenVisualizationMode;
  init(): void;
  render(frame: ListenCanvasRendererFrame): void;
  resize(input: { compact: boolean; height: number; width: number }): void;
};

export function createRenderer(
  id: ListenVisualizationMode,
  hooks: Pick<ListenCanvasRenderer, "render"> &
    Partial<Omit<ListenCanvasRenderer, "id" | "render">>,
): ListenCanvasRenderer {
  return {
    dispose: hooks.dispose ?? (() => {}),
    id,
    init: hooks.init ?? (() => {}),
    render: hooks.render,
    resize: hooks.resize ?? (() => {}),
  };
}

export function clearCanvas(frame: ListenCanvasRendererFrame, tint = 0) {
  const { context, height, input, intensity, theme, width } = frame;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
  if (tint <= 0) return;

  const wash = context.createRadialGradient(
    width * 0.5,
    height * 0.52,
    0,
    width * 0.5,
    height * 0.52,
    Math.max(width, height) * 0.72,
  );
  wash.addColorStop(
    0,
    color(theme, "primary", tint * (0.025 + input.energy * 0.045), intensity),
  );
  wash.addColorStop(
    0.7,
    color(theme, "secondary", tint * (0.01 + input.bass * 0.02), intensity),
  );
  wash.addColorStop(1, "transparent");
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);
}

export function color(
  theme: ListenCanvasTheme,
  channel: keyof ListenCanvasTheme,
  alpha: number,
  intensity: number,
) {
  return `rgb(${theme[channel]} / ${clamp(alpha * intensity)})`;
}

export function sampleSpectrum(values: readonly number[], ratio: number) {
  const position = ratio * Math.max(0, values.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(values.length - 1, lower + 1);
  const mix = position - lower;
  return (values[lower] ?? 0) * (1 - mix) + (values[upper] ?? 0) * mix;
}

export function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}
