import {
  bloom,
  clearCanvas,
  color,
  createRenderer,
  react,
} from "../visualizer-renderer-shared.mjs";

export function createSignalBloomRenderer() {
  return createRenderer("signal-bloom", {
    render({ context, width, height, input, time, compact }) {
      clearCanvas(context, width, height, input, 0.9);
      const sampleCount = compact ? 64 : 96;
      const radius = Math.min(width, height) * 0.18;

      context.save();
      context.translate(width * 0.5, height * 0.52);
      context.rotate(time * 0.000035);
      context.lineCap = "round";
      context.shadowColor = color("shadow", 0.8);

      for (let index = 0; index < sampleCount; index += 1) {
        const ratio = index / sampleCount;
        const bin = Math.floor(ratio * input.spectrum.length * 0.48);
        const value = react(input.spectrum[bin] ?? 0);
        const angle = ratio * Math.PI * 2;
        const length = 10 + value * radius * 0.82;
        const inner = radius * (0.88 + Math.sin(index * 0.73) * 0.025);
        context.strokeStyle = color(
          index % 5 === 0 ? "secondary" : "primary",
          0.24 + value * 0.7,
        );
        context.lineWidth = 1 + value * 2;
        context.shadowBlur = bloom(2 + value * 16);
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(
          Math.cos(angle) * (inner + length),
          Math.sin(angle) * (inner + length),
        );
        context.stroke();
      }

      context.rotate(-time * 0.00007);
      context.shadowBlur = bloom(7);
      context.strokeStyle = color("wave", 0.35 + input.mids * 0.58);
      context.lineWidth = 2;
      context.beginPath();
      for (let index = 0; index <= sampleCount; index += 1) {
        const ratio = index / sampleCount;
        const angle = ratio * Math.PI * 2;
        const waveIndex = Math.floor(ratio * (input.waveform.length - 1));
        const ringRadius =
          radius * 0.75 + (input.waveform[waveIndex] ?? 0) * radius * 0.28;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();

      context.shadowBlur = 0;
      const core = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.7);
      core.addColorStop(0, color("primary", 0.3 + input.bass * 0.45));
      core.addColorStop(0.5, color("shadow", 0.18));
      core.addColorStop(1, "transparent");
      context.fillStyle = core;
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.fill();
      context.restore();
    },
  });
}
