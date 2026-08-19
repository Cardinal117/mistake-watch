import {
  alphaColor,
  bloomRadius,
  clearCanvas,
  createRenderer,
  reactiveEnergy,
} from "./shared.js";

const CURVE_COUNT = 3;
const DESKTOP_POINTS = 64;
const COMPACT_POINTS = 44;

export function createSiriRibbonRenderer() {
  return createRenderer("ribbon", {
    render({ context, width, height, input, theme, settings, time, compact }) {
      clearCanvas(context, width, height, theme, settings, 1);
      const pointCount = compact ? COMPACT_POINTS : DESKTOP_POINTS;
      const centerY = height * 0.54;
      const horizontalInset = width * (compact ? 0.06 : 0.1);
      const drawableWidth = width - horizontalInset * 2;
      const tempoRate = input.tempoBpm ? input.tempoBpm / 120 : 1;
      const travel = time * 0.0012 * tempoRate;

      context.save();
      context.globalCompositeOperation = "lighter";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let curve = 0; curve < CURVE_COUNT; curve += 1) {
        const secondary = curve === 2;
        const curveOffset = curve - (CURVE_COUNT - 1) / 2;
        context.beginPath();

        for (let point = 0; point <= pointCount; point += 1) {
          const ratio = point / pointCount;
          const spectrumIndex = Math.floor(
            ratio * input.spectrum.length * 0.42,
          );
          const waveIndex = Math.floor(ratio * (input.waveform.length - 1));
          const spectrum = reactiveEnergy(
            input.spectrum[spectrumIndex] ?? 0,
            settings,
          );
          const waveform = reactiveEnergy(
            Math.abs(input.waveform[waveIndex] ?? 0),
            settings,
          );
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
          const x = horizontalInset + ratio * drawableWidth;
          const y =
            centerY +
            curveOffset * (5 + input.mids * 7) +
            carrier * amplitude +
            detail * amplitude * 0.14;

          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.strokeStyle = alphaColor(
          theme,
          secondary ? "secondary" : curve === 1 ? "wave" : "primary",
          0.28 + input.mids * 0.46,
          settings,
        );
        context.shadowColor = alphaColor(
          theme,
          secondary ? "secondary" : "shadow",
          0.72,
          settings,
        );
        context.shadowBlur = bloomRadius(2 + input.bass * 7, settings);
        context.lineWidth = 1 + (curve === 1 ? 1.2 : 0.35) + input.bass * 0.7;
        context.stroke();
      }

      context.restore();
    },
  });
}
