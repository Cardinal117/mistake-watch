import {
  clearCanvas,
  color,
  createRenderer,
  react,
} from "../visualizer-renderer-shared.mjs";

const DESKTOP_COLUMNS = 28;
const DESKTOP_ROWS = 12;
const COMPACT_COLUMNS = 18;
const COMPACT_ROWS = 10;

export function createDotWavesRenderer() {
  return createRenderer("dot-waves", {
    render({ context, width, height, input, time, compact }) {
      clearCanvas(context, width, height, input, 0.82);
      const columns = compact ? COMPACT_COLUMNS : DESKTOP_COLUMNS;
      const rows = compact ? COMPACT_ROWS : DESKTOP_ROWS;
      const insetX = width * 0.08;
      const insetY = height * 0.2;
      const stepX = (width - insetX * 2) / Math.max(1, columns - 1);
      const stepY = (height - insetY * 2) / Math.max(1, rows - 1);
      const tempoRate = input.tempoBpm ? input.tempoBpm / 120 : 1;
      const travel = time * 0.0016 * tempoRate;

      context.fillStyle = color("primary", 0.3 + input.mids * 0.5);
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const rowRatio = row / Math.max(1, rows - 1);
        for (let column = 0; column < columns; column += 1) {
          const columnRatio = column / Math.max(1, columns - 1);
          const centerDistance = Math.abs(columnRatio - 0.5) * 2;
          const centerFocus = 0.42 + Math.pow(1 - centerDistance, 1.45) * 0.88;
          const spectrumIndex = Math.floor(
            columnRatio * input.spectrum.length * 0.48,
          );
          const energy = react(input.spectrum[spectrumIndex] ?? 0);
          const phase =
            columnRatio * Math.PI * 5.5 - rowRatio * Math.PI * 2.2 - travel;
          const wave = Math.sin(phase) * (4 + energy * height * 0.07);
          const pulse = Math.cos(phase * 0.55 + travel) * input.bass * 5;
          const x = insetX + column * stepX;
          const y = insetY + row * stepY + wave + pulse;
          const radius =
            (0.7 + energy * 2.2 + input.highs * 0.35) * centerFocus;
          context.moveTo(x + radius, y);
          context.arc(x, y, radius, 0, Math.PI * 2);
        }
      }
      context.fill();

      const centerGradient = context.createRadialGradient(
        width * 0.5,
        height * 0.52,
        0,
        width * 0.5,
        height * 0.52,
        Math.min(width, height) * 0.2,
      );
      centerGradient.addColorStop(
        0,
        color("secondary", 0.2 + input.onset * 0.32),
      );
      centerGradient.addColorStop(1, "transparent");
      context.fillStyle = centerGradient;
      context.fillRect(0, 0, width, height);
    },
  });
}
