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
import {
  createSiriRibbonDynamics,
  getSiriRibbonLobeTargets,
  SIRI_RIBBON_LOBE_COUNT,
  updateSiriRibbonDynamics,
} from "./listen-siri-ribbon";

export {
  createSiriRibbonDynamics,
  getSiriRibbonLobeTargets,
  updateSiriRibbonDynamics,
} from "./listen-siri-ribbon";

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
  const dynamics = createSiriRibbonDynamics();
  const xPositions = new Float32Array(SIRI_RIBBON_LOBE_COUNT + 1);
  let geometryCompact = false;
  let geometryWidth = -1;

  return createRenderer("siri-ribbon", {
    resize({ compact, width }) {
      updateSiriGeometry(xPositions, width, compact);
      geometryCompact = compact;
      geometryWidth = width;
    },
    render(frame) {
      clearCanvas(frame);
      const {
        compact,
        context,
        deltaMs,
        height,
        input,
        intensity,
        theme,
        width,
      } = frame;
      if (width !== geometryWidth || compact !== geometryCompact) {
        updateSiriGeometry(xPositions, width, compact);
        geometryCompact = compact;
        geometryWidth = width;
      }
      const targets = getSiriRibbonLobeTargets(input, dynamics.targets);
      const levels = updateSiriRibbonDynamics(dynamics, targets, deltaMs);
      const centerY = height * 0.5;
      const amplitude = height * (compact ? 0.34 : 0.38);

      context.save();
      context.globalCompositeOperation = "source-over";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowBlur = 0;

      drawSiriRibbonPath(
        context,
        xPositions,
        centerY + 2,
        levels,
        amplitude,
        SECONDARY_LOBE_ORDER,
      );
      context.fillStyle = color(
        theme,
        "secondary",
        0.1 + input.energy * 0.16,
        intensity,
      );
      context.fill();

      drawSiriRibbonPath(
        context,
        xPositions,
        centerY,
        levels,
        amplitude * 0.82,
      );
      context.fillStyle = color(
        theme,
        "primary",
        0.18 + input.energy * 0.22,
        intensity,
      );
      context.strokeStyle = color(
        theme,
        "wave",
        0.4 + input.onset * 0.28,
        intensity,
      );
      context.lineWidth = compact ? 1.1 : 1.35;
      context.fill();
      context.stroke();
      context.restore();
    },
  });
}

const SECONDARY_LOBE_ORDER = [1, 4, 2, 0, 3] as const;

function updateSiriGeometry(
  output: Float32Array,
  width: number,
  compact: boolean,
) {
  const inset = width * (compact ? 0.055 : 0.09);
  const step = (width - inset * 2) / (output.length - 1);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = inset + step * index;
  }
}

function drawSiriRibbonPath(
  context: CanvasRenderingContext2D,
  xPositions: Float32Array,
  centerY: number,
  levels: Float32Array,
  amplitude: number,
  order?: readonly number[],
) {
  context.beginPath();
  context.moveTo(xPositions[0], centerY);

  for (let index = 0; index < SIRI_RIBBON_LOBE_COUNT; index += 1) {
    const left = xPositions[index];
    const right = xPositions[index + 1];
    const middle = (left + right) / 2;
    const control = (right - left) * 0.22;
    const level = levels[order?.[index] ?? index] ?? 0;
    const y = centerY - level * amplitude;
    context.bezierCurveTo(
      left + control,
      centerY,
      middle - control,
      y,
      middle,
      y,
    );
    context.bezierCurveTo(
      middle + control,
      y,
      right - control,
      centerY,
      right,
      centerY,
    );
  }

  for (let index = SIRI_RIBBON_LOBE_COUNT - 1; index >= 0; index -= 1) {
    const left = xPositions[index];
    const right = xPositions[index + 1];
    const middle = (left + right) / 2;
    const control = (right - left) * 0.22;
    const level = levels[order?.[index] ?? index] ?? 0;
    const y = centerY + level * amplitude;
    context.bezierCurveTo(
      right - control,
      centerY,
      middle + control,
      y,
      middle,
      y,
    );
    context.bezierCurveTo(
      middle - control,
      y,
      left + control,
      centerY,
      left,
      centerY,
    );
  }
  context.closePath();
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
