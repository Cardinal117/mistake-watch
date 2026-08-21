import {
  clearCanvas,
  color,
  createRenderer,
  react,
} from "./visualizer-renderer-shared.mjs";
import { createConstellationRenderer } from "./visualizer-renderers/constellation.mjs";
import { createDotWavesRenderer } from "./visualizer-renderers/dot-waves.mjs";
import { createSignalBloomRenderer } from "./visualizer-renderers/signal-bloom.mjs";

export const VISUALIZER_MODE_DETAILS = Object.freeze({
  spectrum: Object.freeze({
    label: "Mirror Spectrum",
    power: "Beta / very high power",
  }),
  ribbon: Object.freeze({
    label: "Siri Ribbon",
    power: "Experimental / high power",
  }),
  "dot-waves": Object.freeze({
    label: "Dot Waves",
    power: "Beta / very high power",
  }),
  "signal-bloom": Object.freeze({
    label: "Signal Bloom",
    power: "Experimental / high power",
  }),
  constellation: Object.freeze({
    label: "Constellation",
    power: "Experimental / extreme power",
  }),
});

export function createVisualizerRenderer(mode) {
  switch (normalizeVisualizerMode(mode)) {
    case "ribbon":
      return createSiriRibbonRenderer();
    case "dot-waves":
      return createDotWavesRenderer();
    case "signal-bloom":
      return createSignalBloomRenderer();
    case "constellation":
      return createConstellationRenderer();
    default:
      return createMirrorRenderer();
  }
}

export function normalizeVisualizerMode(mode) {
  return Object.hasOwn(VISUALIZER_MODE_DETAILS, mode) ? mode : "spectrum";
}

function createMirrorRenderer() {
  return {
    id: "spectrum",
    render({ context, width, height, input, compact }) {
      clearCanvas(context, width, height, input);
      const sideCount = Math.min(
        compact ? 14 : 24,
        Math.floor(input.spectrum.length / 2),
      );
      const gap = compact ? 2 : 3;
      const available = width * 0.72;
      const barWidth = Math.max(
        2,
        (available / 2 - gap * (sideCount - 1)) / sideCount,
      );
      const centerX = width / 2;
      const centerY = height * 0.54;
      const gradient = context.createLinearGradient(
        0,
        centerY - height * 0.3,
        0,
        centerY + height * 0.3,
      );
      gradient.addColorStop(0, color("primary", 0.92));
      gradient.addColorStop(0.5, color("wave", 0.74));
      gradient.addColorStop(1, color("secondary", 0.76));
      context.fillStyle = gradient;
      context.shadowColor = color("shadow", 0.8);

      for (let index = 0; index < sideCount; index += 1) {
        const sourceIndex = Math.floor(
          (index * input.spectrum.length * 0.48) / sideCount,
        );
        const value = Math.pow(react(input.spectrum[sourceIndex] ?? 0), 1.25);
        const heightScale = 3 + value * height * 0.28;
        const rightX = centerX + gap / 2 + index * (barWidth + gap);
        const leftX = centerX - gap / 2 - barWidth - index * (barWidth + gap);
        context.shadowBlur = Math.min(10, value * 8 * input.confidence);
        drawMirroredBar(context, leftX, centerY, barWidth, heightScale);
        drawMirroredBar(context, rightX, centerY, barWidth, heightScale);
      }

      context.shadowBlur = 0;
      context.strokeStyle = color("wave", 0.18);
      context.beginPath();
      context.moveTo(width * 0.08, centerY);
      context.lineTo(width * 0.92, centerY);
      context.stroke();
    },
  };
}

function createSiriRibbonRenderer() {
  return {
    id: "ribbon",
    render({ context, width, height, input, time, compact }) {
      clearCanvas(context, width, height, input);
      const pointCount = compact ? 40 : 58;
      const centerY = height * 0.54;
      const inset = width * (compact ? 0.06 : 0.1);
      const drawableWidth = width - inset * 2;
      const tempoRate = input.tempoBpm ? input.tempoBpm / 120 : 1;
      const travel = time * 0.0012 * tempoRate;

      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let curve = 0; curve < 3; curve += 1) {
        const secondary = curve === 2;
        const curveOffset = curve - 1;
        context.beginPath();

        for (let point = 0; point <= pointCount; point += 1) {
          const ratio = point / pointCount;
          const spectrumIndex = Math.floor(ratio * input.spectrum.length * 0.5);
          const waveIndex = Math.floor(ratio * (input.waveform.length - 1));
          const spectrum = react(input.spectrum[spectrumIndex] ?? 0);
          const waveform = react(Math.abs(input.waveform[waveIndex] ?? 0));
          const envelope = Math.pow(Math.sin(Math.PI * ratio), 0.7);
          const carrier = Math.sin(
            ratio * Math.PI * (4.5 + curve * 0.65) +
              travel * (1.1 + curve * 0.16) +
              curve * 1.7,
          );
          const detail = Math.sin(ratio * Math.PI * 11 - travel * 0.55);
          const amplitude =
            envelope *
            height *
            (0.035 + spectrum * 0.13 + waveform * 0.07 + input.bass * 0.04);
          const x = inset + ratio * drawableWidth;
          const y =
            centerY +
            curveOffset * (5 + input.mids * 7) +
            carrier * amplitude +
            detail * amplitude * 0.14;

          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.strokeStyle = color(
          secondary ? "secondary" : curve === 1 ? "wave" : "primary",
          0.3 + input.mids * 0.44,
        );
        context.shadowColor = color(secondary ? "secondary" : "shadow", 0.72);
        context.shadowBlur = Math.min(8, 2 + input.bass * 6);
        context.lineWidth = 1 + (curve === 1 ? 1.1 : 0.3) + input.bass * 0.6;
        context.stroke();
      }

      context.restore();
    },
  };
}

function drawMirroredBar(context, x, centerY, width, height) {
  context.fillRect(x, centerY - height, width, Math.max(1, height - 2));
  context.fillRect(x, centerY + 2, width, height);
}
