import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
  smoothedDuration,
} from "./shared.js";

const ROWS = 20;
const COLUMNS = 40;

export function createObsidianGridRenderer() {
  let energy = [];

  function reset() {
    energy = Array.from({ length: ROWS }, () => new Float32Array(COLUMNS + 1));
  }

  reset();

  return createRenderer("grid", {
    init: reset,
    render({ context, width, height, input, theme, settings, time, delta }) {
      clearCanvas(context, width, height, theme, settings);
      const frameDelta = Math.min(50, Math.max(0, delta));
      const horizon = height * 0.34;
      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineWidth = 1;

      for (let row = 0; row < ROWS; row += 1) {
        const depth = row / (ROWS - 1);
        const yBase = horizon + Math.pow(depth, 1.7) * height * 0.7;
        let rowEnergy = 0;
        context.beginPath();
        for (let column = 0; column <= COLUMNS; column += 1) {
          const xRatio = column / COLUMNS;
          const mirrored = xRatio <= 0.5 ? xRatio * 2 : (1 - xRatio) * 2;
          const mirroredColumn = Math.min(column, COLUMNS - column);
          const perspective = 0.12 + depth * 0.88;
          const x = width * 0.5 + (xRatio - 0.5) * width * 1.25 * perspective;
          const bin = Math.floor(mirrored * input.spectrum.length * 0.36);
          const value = reactiveEnergy(input.spectrum[bin] ?? 0, settings);
          const waveIndex = Math.floor(mirrored * (input.waveform.length - 1));
          const vibration = reactiveEnergy(
            Math.abs(input.waveform[waveIndex] ?? 0),
            settings,
          );
          const target = Math.min(1, value * 0.72 + vibration * 0.68) * depth;
          const current = energy[row][column];
          const responseTime = smoothedDuration(
            target > current ? 155 : 500,
            settings,
          );
          const response = 1 - Math.exp(-frameDelta / responseTime);
          const smoothed = current + (target - current) * response;
          energy[row][column] = smoothed;
          rowEnergy += smoothed;
          const ridge =
            Math.sin(mirroredColumn * 0.42 + row * 0.26 + time * 0.0012) *
            value *
            22 *
            depth;
          const y = yBase - value * height * 0.12 * depth - ridge;
          if (column === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        const secondary = row % 5 === 0;
        context.strokeStyle = alphaColor(
          theme,
          secondary ? "secondary" : "primary",
          0.06 + depth * 0.27,
          settings,
        );
        context.shadowColor = alphaColor(
          theme,
          secondary ? "secondary" : "shadow",
          0.75,
          settings,
        );
        context.shadowBlur = bloomRadius(
          2 + depth * 4 + (rowEnergy / (COLUMNS + 1)) * 18,
          settings,
        );
        context.stroke();
      }
      context.restore();
    },
    dispose: reset,
  });
}
