import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
} from "./shared.js";

export function createMirrorSpectrumRenderer() {
  return createRenderer("spectrum", {
    render({ context, width, height, input, theme, settings, compact }) {
      clearCanvas(context, width, height, theme, settings, 1);
      const sideCount = Math.min(
        compact ? 16 : 28,
        Math.floor(input.spectrum.length / 2),
      );
      const available = width * (0.72 + input.bass * 0.16);
      const gap = compact ? 2 : 3;
      const sideWidth = available / 2;
      const barWidth = Math.max(
        2,
        (sideWidth - gap * (sideCount - 1)) / sideCount,
      );
      const centerX = width / 2;
      const centerY = height * 0.52;
      const gradient = context.createLinearGradient(
        0,
        centerY - height * 0.28,
        0,
        centerY + height * 0.28,
      );
      gradient.addColorStop(0, alphaColor(theme, "primary", 0.92, settings));
      gradient.addColorStop(0.5, alphaColor(theme, "wave", 0.72, settings));
      gradient.addColorStop(1, alphaColor(theme, "secondary", 0.72, settings));
      context.fillStyle = gradient;
      context.shadowColor = alphaColor(theme, "shadow", 0.8, settings);

      for (let index = 0; index < sideCount; index += 1) {
        const value = Math.pow(
          reactiveEnergy(
            input.spectrum[
              Math.floor((index * input.spectrum.length * 0.46) / sideCount)
            ] ?? 0,
            settings,
          ),
          1.3,
        );
        const barHeight = 3 + value * height * 0.27;
        const rightX = centerX + gap / 2 + index * (barWidth + gap);
        const leftX = centerX - gap / 2 - barWidth - index * (barWidth + gap);
        context.shadowBlur = bloomRadius(value * 12, settings);
        for (const x of [leftX, rightX]) {
          context.fillRect(x, centerY - barHeight, barWidth, barHeight - 2);
          context.fillRect(x, centerY + 2, barWidth, barHeight);
        }
      }

      context.shadowBlur = 0;
      context.strokeStyle = alphaColor(theme, "wave", 0.16, settings);
      context.beginPath();
      context.moveTo(width * 0.08, centerY);
      context.lineTo(width * 0.92, centerY);
      context.stroke();
    },
  });
}
