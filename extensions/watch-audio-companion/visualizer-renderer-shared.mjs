const SETTINGS = Object.freeze({
  brightness: 100,
  bloom: 35,
  reactivity: 110,
});

const MODE_SETTINGS = Object.freeze({
  spectrum: Object.freeze({ brightness: 100, bloom: 50, reactivity: 110 }),
  "signal-bloom": Object.freeze({
    brightness: 100,
    bloom: 80,
    reactivity: 110,
  }),
});

const THEME = Object.freeze({
  primary: "0 219 233",
  secondary: "255 186 32",
  shadow: "0 105 112",
  wave: "219 252 255",
});

export function createRenderer(id, hooks) {
  return {
    id,
    init: hooks.init ?? (() => {}),
    resize: hooks.resize ?? (() => {}),
    render: hooks.render,
    dispose: hooks.dispose ?? (() => {}),
  };
}

export function clearCanvas(context, width, height, input, tint = 1) {
  context.save();
  context.shadowBlur = 0;
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#0a0a0b";
  context.fillRect(0, 0, width, height);

  if (tint > 0) {
    const wash = context.createRadialGradient(
      width * 0.5,
      height * 0.52,
      0,
      width * 0.5,
      height * 0.52,
      Math.max(width, height) * 0.72,
    );
    wash.addColorStop(
      0,
      color("primary", tint * (0.025 + input.energy * 0.045)),
    );
    wash.addColorStop(
      0.68,
      color("secondary", tint * (0.012 + input.bass * 0.02)),
    );
    wash.addColorStop(1, "transparent");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);
  }

  context.restore();
}

export function settingsFor(mode) {
  return MODE_SETTINGS[mode] ?? SETTINGS;
}

export function react(value, settings = SETTINGS) {
  return clamp(value * (settings.reactivity / 100));
}

export function color(channel, alpha, settings = SETTINGS) {
  const brightness = settings.brightness / 100;
  return `rgb(${THEME[channel]} / ${clamp(alpha * brightness)})`;
}

export function bloom(value, settings = SETTINGS) {
  return Math.min(42, Math.max(0, value * (settings.bloom / 100)));
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
