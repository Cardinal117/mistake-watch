export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function alphaColor(theme, channel, alpha = 1, settings) {
  const brightness = settings.brightness / 100;
  return `rgb(${theme[channel]} / ${clamp(alpha * brightness, 0, 1)})`;
}

export function bloomRadius(value, settings) {
  return Math.min(42, Math.max(0, value * (settings.bloom / 100)));
}

export function reactiveEnergy(value, settings) {
  return clamp(value * (settings.reactivity / 100));
}

export function smoothedDuration(milliseconds, settings) {
  return milliseconds * (0.55 + (settings.smoothing / 100) * 1.25);
}

export function clearCanvas(context, width, height, theme, settings, tint = 0) {
  context.save();
  context.shadowBlur = 0;
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#060607";
  context.fillRect(0, 0, width, height);
  if (tint > 0) {
    const wash = context.createRadialGradient(
      width * 0.5,
      height * 0.5,
      0,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    wash.addColorStop(0, alphaColor(theme, "primary", tint * 0.035, settings));
    wash.addColorStop(1, "transparent");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

export function createRenderer(id, hooks) {
  return {
    id,
    animated: hooks.animated ?? true,
    expectsNonblank: hooks.expectsNonblank ?? true,
    init: hooks.init ?? (() => {}),
    resize: hooks.resize ?? (() => {}),
    render: hooks.render,
    dispose: hooks.dispose ?? (() => {}),
  };
}
