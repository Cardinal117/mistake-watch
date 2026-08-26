export type ListenArtworkTheme = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};

type Rgb = { b: number; g: number; r: number };
type Hsl = { h: number; l: number; s: number };
type ColorBucket = Rgb & { count: number; hsl: Hsl };

export function deriveListenArtworkTheme(
  pixels: Uint8ClampedArray,
  fallbackTheme: ListenArtworkTheme,
): ListenArtworkTheme {
  const buckets = collectColorBuckets(pixels);

  if (buckets.length === 0) {
    return fallbackTheme;
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const dominant = [...buckets].sort(
    (left, right) => right.count - left.count,
  )[0];
  const secondaryBackground = pickDistinctBackground(buckets, dominant);
  const accent = pickAccent(buckets, dominant, total);
  const secondaryAccent = pickSecondaryAccent(buckets, accent, total);
  const softenedAccent = softenHarshRed(accent.hsl);
  const primary = hslToRgb({
    h: softenedAccent.h,
    l: clamp(softenedAccent.l * 1.04 + 0.12, 0.46, 0.68),
    s: clamp(softenedAccent.s * 1.12, 0.48, 0.84),
  });
  const secondary = hslToRgb({
    h: secondaryAccent.hsl.h,
    l: clamp(secondaryAccent.hsl.l * 0.9 + 0.13, 0.4, 0.64),
    s: clamp(secondaryAccent.hsl.s, 0.38, 0.72),
  });
  const wave = hslToRgb({
    h: (softenedAccent.h + 6) % 360,
    l: clamp(softenedAccent.l * 1.08 + 0.2, 0.58, 0.8),
    s: clamp(softenedAccent.s * 1.08, 0.52, 0.86),
  });

  return {
    backgroundPrimary: rgbToCss(darkenBackground(dominant.hsl)),
    backgroundSecondary: rgbToCss(darkenBackground(secondaryBackground.hsl)),
    primary: rgbToCss(primary),
    secondary: rgbToCss(secondary),
    shadow: rgbToCss(primary),
    wave: rgbToCss(wave),
  };
}

function collectColorBuckets(pixels: Uint8ClampedArray) {
  const quantized = new Map<number, Omit<ColorBucket, "hsl">>();

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    const color = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2],
    };
    const hsl = rgbToHsl(color);

    if (alpha < 0.5 || hsl.l < 0.06 || hsl.l > 0.94) {
      continue;
    }

    const key = ((color.r >> 5) << 6) | ((color.g >> 5) << 3) | (color.b >> 5);
    const bucket = quantized.get(key) ?? { b: 0, count: 0, g: 0, r: 0 };
    bucket.r += color.r;
    bucket.g += color.g;
    bucket.b += color.b;
    bucket.count += 1;
    quantized.set(key, bucket);
  }

  return [...quantized.values()].map((bucket) => {
    const color = {
      b: bucket.b / bucket.count,
      g: bucket.g / bucket.count,
      r: bucket.r / bucket.count,
    };

    return { ...color, count: bucket.count, hsl: rgbToHsl(color) };
  });
}

function pickAccent(
  buckets: ColorBucket[],
  dominant: ColorBucket,
  total: number,
) {
  const minimumCount = Math.max(3, Math.ceil(total * 0.02));
  const candidates = buckets.filter(
    (bucket) =>
      bucket.count >= minimumCount &&
      bucket.hsl.s >= 0.24 &&
      bucket.hsl.l >= 0.16 &&
      bucket.hsl.l <= 0.84,
  );

  return maxBy(candidates.length > 0 ? candidates : buckets, (bucket) => {
    const share = bucket.count / total;
    const contrast = colorDistance(bucket, dominant) / 441.7;
    const minority = 1 - Math.min(1, share / 0.35);
    const balancedLightness =
      1 - Math.min(1, Math.abs(bucket.hsl.l - 0.52) / 0.52);

    return (
      bucket.hsl.s * 0.42 +
      contrast * 0.28 +
      minority * 0.18 +
      balancedLightness * 0.12
    );
  });
}

function pickSecondaryAccent(
  buckets: ColorBucket[],
  accent: ColorBucket,
  total: number,
) {
  const minimumCount = Math.max(3, Math.ceil(total * 0.02));
  const candidates = buckets.filter(
    (bucket) =>
      bucket.count >= minimumCount && colorDistance(bucket, accent) >= 54,
  );

  return maxBy(
    candidates.length > 0 ? candidates : [accent],
    (bucket) => bucket.hsl.s * 0.6 + (bucket.count / total) * 0.4,
  );
}

function pickDistinctBackground(buckets: ColorBucket[], dominant: ColorBucket) {
  const candidates = buckets.filter(
    (bucket) => bucket !== dominant && colorDistance(bucket, dominant) >= 42,
  );

  return maxBy(
    candidates.length > 0 ? candidates : [dominant],
    (bucket) => bucket.count * (0.72 + bucket.hsl.s * 0.28),
  );
}

function darkenBackground(hsl: Hsl) {
  return hslToRgb({
    h: hsl.h,
    l: clamp(hsl.l * 0.44, 0.09, 0.24),
    s: clamp(hsl.s * 0.86, 0.22, 0.64),
  });
}

function maxBy<T>(items: T[], score: (item: T) => number) {
  return items.reduce((best, item) =>
    score(item) > score(best) ? item : best,
  );
}

function colorDistance(left: Rgb, right: Rgb) {
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function softenHarshRed(hsl: Hsl) {
  if (hsl.h >= 18 && hsl.h <= 344) {
    return hsl;
  }

  return { ...hsl, h: hsl.h < 180 ? 24 : 338, s: hsl.s * 0.82 };
}

function rgbToHsl({ b, g, r }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  return { h: (hue + 360) % 360, l: lightness, s: saturation };
}

function hslToRgb({ h, l, s }: Hsl): Rgb {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) [red, green] = [chroma, x];
  else if (huePrime < 2) [red, green] = [x, chroma];
  else if (huePrime < 3) [green, blue] = [chroma, x];
  else if (huePrime < 4) [green, blue] = [x, chroma];
  else if (huePrime < 5) [red, blue] = [x, chroma];
  else [red, blue] = [chroma, x];

  return {
    b: Math.round((blue + match) * 255),
    g: Math.round((green + match) * 255),
    r: Math.round((red + match) * 255),
  };
}

function rgbToCss({ b, g, r }: Rgb) {
  return `${r} ${g} ${b}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
