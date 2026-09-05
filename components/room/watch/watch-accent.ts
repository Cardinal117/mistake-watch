// Dark artwork can produce an accent too dim for small labels. Preserve its hue
// while lifting it to 4.5:1 against the brightest standard Watch control surface.
export function readableWatchAccent(rgb: string) {
  const channels = rgb.split(" ").map(Number);
  const luminance = (values: number[]) =>
    values.reduce((sum, value, index) => {
      const linear = value / 255;
      return (
        sum +
        (linear <= 0.04045
          ? linear / 12.92
          : ((linear + 0.055) / 1.055) ** 2.4) *
          [0.2126, 0.7152, 0.0722][index]
      );
    }, 0);
  const background = luminance([53, 52, 54]);
  for (let step = 0; step <= 100; step++) {
    const lifted = channels.map((value) =>
      Math.round(value + ((255 - value) * step) / 100),
    );
    if ((luminance(lifted) + 0.05) / (background + 0.05) >= 4.5)
      return lifted.join(" ");
  }
  return "229 226 227";
}
