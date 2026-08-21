const SETTINGS = Object.freeze({
  brightness: 100,
  bloom: 35,
  reactivity: 110,
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

export function react(value) {
  return clamp(value * (SETTINGS.reactivity / 100));
}

export function color(channel, alpha) {
  const brightness = SETTINGS.brightness / 100;
  return `rgb(${THEME[channel]} / ${clamp(alpha * brightness)})`;
}

export function bloom(value) {
  return Math.min(12, Math.max(0, value * (SETTINGS.bloom / 100)));
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
