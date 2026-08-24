import {
  clearCanvas,
  color,
  createRenderer,
  sampleSpectrum,
  type ListenCanvasRenderer,
} from "./listen-canvas-renderer-shared";
import type { ListenVisualizationMode } from "./listen-visualization";
import {
  createConstellationRenderer,
  createDotWavesRenderer,
  createSignalBloomRenderer,
} from "./listen-canvas-renderers-experimental";

export function createListenCanvasRenderer(
  mode: ListenVisualizationMode,
): ListenCanvasRenderer {
  switch (mode) {
    case "mirror-spectrum":
      return createMirrorSpectrumRenderer();
    case "siri-ribbon":
      return createSiriRibbonRenderer();
    case "dot-waves":
      return createDotWavesRenderer();
    case "signal-bloom":
      return createSignalBloomRenderer();
    case "constellation":
      return createConstellationRenderer();
    default:
      return createSiriRibbonRenderer();
  }
}

function createMirrorSpectrumRenderer() {
  return createRenderer("mirror-spectrum", {
    render(frame) {
      clearCanvas(frame, 0.8);
      const { compact, context, height, input, intensity, theme, width } =
        frame;
      const sideCount = Math.min(compact ? 16 : 28, input.spectrum.length);
      const gap = compact ? 2 : 3;
      const available = width * (0.72 + input.bass * 0.16);
      const barWidth = Math.max(
        2,
        (available / 2 - gap * (sideCount - 1)) / sideCount,
      );
      const centerX = width / 2;
      const centerY = height * 0.52;
      const gradient = context.createLinearGradient(
        0,
        centerY - height * 0.28,
        0,
        centerY + height * 0.28,
      );
      gradient.addColorStop(0, color(theme, "primary", 0.92, intensity));
      gradient.addColorStop(0.5, color(theme, "wave", 0.72, intensity));
      gradient.addColorStop(1, color(theme, "secondary", 0.72, intensity));
      context.fillStyle = gradient;
      context.shadowColor = color(theme, "shadow", 0.8, intensity);

      for (let index = 0; index < sideCount; index += 1) {
        const ratio = sideCount === 1 ? 0 : index / (sideCount - 1);
        const value = Math.pow(sampleSpectrum(input.spectrum, ratio), 1.3);
        const barHeight = 3 + value * height * 0.27;
        const rightX = centerX + gap / 2 + index * (barWidth + gap);
        const leftX = centerX - gap / 2 - barWidth - index * (barWidth + gap);
        context.shadowBlur = Math.min(12, value * 8 * intensity);
        drawMirroredBar(context, leftX, centerY, barWidth, barHeight);
        drawMirroredBar(context, rightX, centerY, barWidth, barHeight);
      }

      context.shadowBlur = 0;
      context.strokeStyle = color(theme, "wave", 0.16, intensity);
      context.beginPath();
      context.moveTo(width * 0.08, centerY);
      context.lineTo(width * 0.92, centerY);
      context.stroke();
    },
  });
}

function createSiriRibbonRenderer() {
  return createRenderer("siri-ribbon", {
    render(frame) {
      clearCanvas(frame, 0.6);
      const {
        compact,
        context,
        height,
        input,
        intensity,
        theme,
        timeMs,
        width,
      } = frame;
      const pointCount = compact ? 44 : 64;
      const centerY = height * 0.54;
      const inset = width * (compact ? 0.06 : 0.1);
      const drawableWidth = width - inset * 2;
      const tempoRate = input.tempoBpm ? input.tempoBpm / 120 : 1;
      const travel = timeMs * 0.0012 * tempoRate;
      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let curve = 0; curve < 3; curve += 1) {
        const offset = curve - 1;
        context.beginPath();
        for (let point = 0; point <= pointCount; point += 1) {
          const ratio = point / pointCount;
          const spectrum =
            input.spectrum[Math.floor(ratio * input.spectrum.length * 0.42)] ??
            0;
          const waveform = Math.abs(
            input.waveform[Math.floor(ratio * (input.waveform.length - 1))] ??
              0,
          );
          const envelope = Math.pow(Math.sin(Math.PI * ratio), 0.7);
          const carrier = Math.sin(
            ratio * Math.PI * (4.5 + curve * 0.65) +
              travel * (1.1 + curve * 0.16) +
              curve * 1.7,
          );
          const amplitude =
            envelope *
            height *
            (0.035 + spectrum * 0.13 + waveform * 0.07 + input.bass * 0.04);
          const x = inset + ratio * drawableWidth;
          const y = centerY + offset * 6 + carrier * amplitude;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        const channel =
          curve === 2 ? "secondary" : curve === 1 ? "wave" : "primary";
        context.strokeStyle = color(
          theme,
          channel,
          0.28 + input.mids * 0.46,
          intensity,
        );
        context.shadowColor = color(theme, "shadow", 0.6, intensity);
        context.shadowBlur = Math.min(8, 2 + input.bass * 6);
        context.lineWidth = 1 + (curve === 1 ? 1.2 : 0.35);
        context.stroke();
      }
      context.restore();
    },
  });
}

function drawMirroredBar(
  context: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  width: number,
  height: number,
) {
  context.fillRect(x, centerY - height, width, Math.max(1, height - 2));
  context.fillRect(x, centerY + 2, width, height);
}
