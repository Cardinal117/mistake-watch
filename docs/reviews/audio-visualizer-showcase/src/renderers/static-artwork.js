import { alphaColor, clearCanvas, createRenderer } from "./shared.js";

export function createStaticArtworkRenderer() {
  return createRenderer("static", {
    animated: false,
    render({ context, width, height, theme, settings }) {
      clearCanvas(context, width, height, theme, settings, 1);

      const artwork = context.createRadialGradient(
        width * 0.72,
        height * 0.5,
        0,
        width * 0.72,
        height * 0.5,
        Math.max(width, height) * 0.72,
      );
      artwork.addColorStop(0, alphaColor(theme, "primary", 0.2, settings));
      artwork.addColorStop(0.42, alphaColor(theme, "shadow", 0.09, settings));
      artwork.addColorStop(
        0.78,
        alphaColor(theme, "secondary", 0.025, settings),
      );
      artwork.addColorStop(1, "transparent");
      context.fillStyle = artwork;
      context.fillRect(0, 0, width, height);
    },
  });
}
