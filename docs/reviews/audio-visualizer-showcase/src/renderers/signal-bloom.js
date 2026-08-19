import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
} from "./shared.js";

export function createSignalBloomRenderer() {
  return createRenderer("bloom", {
    render({ context, width, height, input, theme, settings, time, compact }) {
      clearCanvas(context, width, height, theme, settings, 2);
      const sampleCount = compact ? 64 : 96;
      const radius = Math.min(width, height) * 0.18;
      const centerX = width * 0.5;
      const centerY = height * 0.52;

      context.save();
      context.translate(centerX, centerY);
      context.rotate(time * 0.000035);
      context.lineCap = "round";
      context.shadowColor = alphaColor(theme, "shadow", 0.8, settings);

      for (let index = 0; index < sampleCount; index += 1) {
        const ratio = index / sampleCount;
        const bin = Math.floor(ratio * input.spectrum.length * 0.48);
        const value = reactiveEnergy(input.spectrum[bin] ?? 0, settings);
        const angle = ratio * Math.PI * 2;
        const length = 10 + value * radius * 0.82;
        const inner = radius * (0.88 + Math.sin(index * 0.73) * 0.025);
        const x1 = Math.cos(angle) * inner;
        const y1 = Math.sin(angle) * inner;
        const x2 = Math.cos(angle) * (inner + length);
        const y2 = Math.sin(angle) * (inner + length);
        const secondary = index % 5 === 0;
        context.strokeStyle = alphaColor(
          theme,
          secondary ? "secondary" : "primary",
          0.24 + value * 0.7,
          settings,
        );
        context.lineWidth = 1 + value * 2;
        context.shadowBlur = bloomRadius(2 + value * 16, settings);
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      }

      context.rotate(-time * 0.00007);
      context.shadowBlur = bloomRadius(7, settings);
      context.strokeStyle = alphaColor(
        theme,
        "wave",
        0.35 + input.mids * 0.58,
        settings,
      );
      context.lineWidth = 2;
      context.beginPath();
      for (let index = 0; index <= sampleCount; index += 1) {
        const angle = (index / sampleCount) * Math.PI * 2;
        const waveIndex = Math.floor(
          (index / sampleCount) * (input.waveform.length - 1),
        );
        const sample = input.waveform[waveIndex] ?? 0;
        const ringRadius = radius * 0.75 + sample * radius * 0.28;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();

      context.shadowBlur = 0;
      const core = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.7);
      core.addColorStop(
        0,
        alphaColor(theme, "primary", 0.3 + input.bass * 0.45, settings),
      );
      core.addColorStop(0.5, alphaColor(theme, "shadow", 0.18, settings));
      core.addColorStop(1, "transparent");
      context.fillStyle = core;
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.fill();
      context.restore();
    },
  });
}
