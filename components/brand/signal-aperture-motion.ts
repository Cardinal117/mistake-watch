export type ApertureFrame = {
  icon: "current" | "previous";
  rotation: number;
  travel: number;
};

const PIVOT = {
  x: 120 + 100 * Math.cos((-45 * Math.PI) / 180),
  y: 120 + 100 * Math.sin((-45 * Math.PI) / 180),
};
const smooth = (value: number) => value ** 3 * (value * (value * 6 - 15) + 10);

export function getIrisBladeAngle(travel: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const ring = -130 + 45 * Math.max(0, Math.min(1, travel));
  const pin = {
    x: 120 + 110 * Math.cos(radians(ring)),
    y: 120 + 110 * Math.sin(radians(ring)),
  };
  const start = {
    x: 120 + 110 * Math.cos(radians(-85)),
    y: 120 + 110 * Math.sin(radians(-85)),
  };
  const initial = Math.atan2(start.y - PIVOT.y, start.x - PIVOT.x);
  return (
    ((Math.atan2(pin.y - PIVOT.y, pin.x - PIVOT.x) - initial) * 180) / Math.PI
  );
}

export function getApertureFrame(
  elapsed: number,
  modeTransition: boolean,
): ApertureFrame {
  const duration = modeTransition ? 650 : 3600;
  const cycle = modeTransition ? 0 : Math.floor(elapsed / duration);
  const phase = modeTransition
    ? Math.min(duration, Math.max(0, elapsed))
    : Math.max(0, elapsed) % duration;

  if (modeTransition) {
    const travel =
      phase < 250
        ? 1 - smooth(phase / 250)
        : phase < 320
          ? 0
          : smooth(Math.min(1, (phase - 320) / 330));
    return {
      icon: phase < 270 ? "previous" : "current",
      rotation: phase < 250 ? 30 * smooth(phase / 250) : 30 + 30 * travel,
      travel,
    };
  }

  const travel =
    phase < 650
      ? 1 - smooth(phase / 650)
      : phase < 900
        ? 0
        : phase < 1800
          ? smooth((phase - 900) / 900)
          : 1;
  const rotation =
    cycle * 60 +
    (phase < 650
      ? 30 * smooth(phase / 650)
      : phase < 900
        ? 30
        : phase < 1800
          ? 30 + 30 * smooth((phase - 900) / 900)
          : 60);
  return { icon: "current", rotation, travel };
}
