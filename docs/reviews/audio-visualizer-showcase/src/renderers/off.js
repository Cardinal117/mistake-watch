import { clearCanvas, createRenderer } from "./shared.js";

export function createOffRenderer() {
  return createRenderer("off", {
    animated: false,
    expectsNonblank: false,
    render({ context, width, height, theme, settings }) {
      clearCanvas(context, width, height, theme, settings);
    },
  });
}
