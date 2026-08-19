import {
  alphaColor,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
} from "./shared.js";

const DESKTOP_COLUMNS = 28;
const DESKTOP_ROWS = 12;
const COMPACT_COLUMNS = 18;
const COMPACT_ROWS = 10;

export function createDotWavesRenderer() {
  return createRenderer("dots", {
    render({ context, width, height, input, theme, settings, time, compact }) {
      clearCanvas(context, width, height, theme, settings, 1);
      const columns = compact ? COMPACT_COLUMNS : DESKTOP_COLUMNS;
      const rows = compact ? COMPACT_ROWS : DESKTOP_ROWS;
      const insetX = width * 0.08;
      const insetY = height * 0.2;
      const stepX = (width - insetX * 2) / Math.max(1, columns - 1);
      const stepY = (height - insetY * 2) / Math.max(1, rows - 1);
      const tempoRate = input.tempoBpm ? input.tempoBpm / 120 : 1;
      const travel = time * 0.0016 * tempoRate;
      const primaryPath = new Path2D();
      const secondaryPath = new Path2D();

      for (let row = 0; row < rows; row += 1) {
        const rowRatio = row / Math.max(1, rows - 1);
        for (let column = 0; column < columns; column += 1) {
          const columnRatio = column / Math.max(1, columns - 1);
          const spectrumIndex = Math.floor(
            columnRatio * input.spectrum.length * 0.42,
          );
          const energy = reactiveEnergy(
            input.spectrum[spectrumIndex] ?? 0,
            settings,
          );
          const phase =
            columnRatio * Math.PI * 5.5 - rowRatio * Math.PI * 2.2 - travel;
          const wave = Math.sin(phase) * (4 + energy * height * 0.07);
          const pulse = Math.cos(phase * 0.55 + travel) * input.bass * 5;
          const x = insetX + column * stepX;
          const y = insetY + row * stepY + wave + pulse;
          const radius = 0.75 + energy * 2.2 + input.highs * 0.35;
          const path = (row + column) % 7 === 0 ? secondaryPath : primaryPath;
          path.moveTo(x + radius, y);
          path.arc(x, y, radius, 0, Math.PI * 2);
        }
      }

      context.fillStyle = alphaColor(
        theme,
        "primary",
        0.3 + input.mids * 0.5,
        settings,
      );
      context.fill(primaryPath);
      context.fillStyle = alphaColor(
        theme,
        "secondary",
        0.34 + input.highs * 0.48,
        settings,
      );
      context.fill(secondaryPath);
    },
  });
}
