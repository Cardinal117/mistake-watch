import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
  smoothedDuration,
} from "./shared.js";

const STRANDS = 7;
const POINTS = 80;

export function createSilkNebulaRenderer() {
  let energy = [];

  function reset() {
    energy = Array.from(
      { length: STRANDS },
      () => new Float32Array(POINTS + 1),
    );
  }

  reset();

  return createRenderer("silk", {
    init: reset,
    render({ context, width, height, input, theme, settings, time, delta }) {
      clearCanvas(context, width, height, theme, settings, 2);
      const frameDelta = Math.min(50, Math.max(0, delta));
      context.save();
      context.globalCompositeOperation = "lighter";

      for (let strand = 0; strand < STRANDS; strand += 1) {
        const phase = strand * 0.58 + time * 0.00012;
        const points = [];
        context.beginPath();
        for (let index = 0; index <= POINTS; index += 1) {
          const ratio = index / POINTS;
          const frequency = reactiveEnergy(
            input.spectrum[Math.floor(ratio * input.spectrum.length * 0.34)] ??
              0,
            settings,
          );
          const waveIndex = Math.floor(ratio * (input.waveform.length - 1));
          const vibration = reactiveEnergy(
            Math.abs(input.waveform[waveIndex] ?? 0),
            settings,
          );
          const target = Math.min(1, frequency * 0.72 + vibration * 0.7);
          const current = energy[strand][index];
          const responseTime = smoothedDuration(
            target > current ? 170 : 520,
            settings,
          );
          const response = 1 - Math.exp(-frameDelta / responseTime);
          const smoothed = current + (target - current) * response;
          energy[strand][index] = smoothed;
          const x = width * (0.06 + ratio * 0.88);
          const wave =
            Math.sin(ratio * 9 + phase) * (34 + input.mids * 78) +
            Math.sin(ratio * 21 - phase * 0.6) * 12;
          const y =
            height * 0.52 + wave + (strand - STRANDS / 2) * (5 + frequency * 5);
          points.push({ energy: smoothed, x, y });
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        const secondary = strand % 3 === 0;
        context.strokeStyle = alphaColor(
          theme,
          secondary ? "secondary" : "primary",
          0.08 + (secondary ? input.highs : input.mids) * 0.2,
          settings,
        );
        context.lineWidth = 0.9 + input.bass * 1.1;
        context.shadowColor = alphaColor(
          theme,
          secondary ? "secondary" : "shadow",
          0.85,
          settings,
        );
        context.shadowBlur = bloomRadius(4 + input.mids * 8, settings);
        context.stroke();

        let bloomPasses = 0;
        for (
          let index = 4;
          index < points.length && bloomPasses < 18;
          index += 4
        ) {
          const point = points[index];
          const previous = points[index - 4];
          const bloom = Math.pow(Math.max(point.energy, previous.energy), 1.7);
          if (bloom < 0.045) continue;
          bloomPasses += 1;
          const gold = secondary || point.energy > 0.72;
          context.strokeStyle = alphaColor(
            theme,
            gold ? "secondary" : "primary",
            0.08 + bloom * 0.78,
            settings,
          );
          context.shadowColor = alphaColor(
            theme,
            gold ? "secondary" : "shadow",
            0.9,
            settings,
          );
          context.shadowBlur = bloomRadius(7 + bloom * 34, settings);
          context.lineWidth = 0.8 + bloom * 4.2;
          context.beginPath();
          context.moveTo(previous.x, previous.y);
          context.lineTo(point.x, point.y);
          context.stroke();
        }
      }
      context.restore();
    },
    dispose: reset,
  });
}
