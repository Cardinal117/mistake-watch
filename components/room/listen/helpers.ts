"use client";

import type { RoomQueueItem } from "@/lib/rooms";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import { type ListenTheme } from "@/components/room/listen/shared";

export function formatListenPreparationStatus(
  status: ReturnType<typeof useNextItemPreparation>["status"],
) {
  if (status === "preparing") {
    return "Preparing next:";
  }

  if (status === "ready") {
    return "Next ready:";
  }

  if (status === "partial") {
    return "Next warming:";
  }

  if (status === "skipped") {
    return "Next queued:";
  }

  return "Next pending:";
}
export function getQueueItemDisplayDuration(
  item: RoomQueueItem,
  metadata: ReturnType<typeof useYouTubeMetadata>,
) {
  if (
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
  ) {
    return formatSeconds(metadata.metadata.durationSeconds);
  }

  if (
    item.duration &&
    item.duration !== "Metadata pending" &&
    item.duration !== "-"
  ) {
    return item.duration;
  }

  if (
    item.isUnavailable ||
    metadata.metadata?.availability?.playable === false ||
    (!metadata.loading && metadata.status === "unavailable")
  ) {
    return "Unavailable";
  }

  return null;
}
export function extractThemeFromImage(
  image: HTMLImageElement,
  fallbackTheme: ListenTheme,
): ListenTheme | null {
  try {
    const canvas = document.createElement("canvas");
    const size = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return null;
    }

    canvas.width = size;
    canvas.height = size;
    context.drawImage(image, 0, 0, size, size);

    const pixels = context.getImageData(0, 0, size, size).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let weightTotal = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 510;
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (alpha < 0.5 || lightness < 0.12 || lightness > 0.86) {
        continue;
      }

      const weight =
        alpha * (0.4 + saturation) * (1 - Math.abs(lightness - 0.52));

      red += r * weight;
      green += g * weight;
      blue += b * weight;
      weightTotal += weight;
    }

    if (weightTotal <= 0) {
      return fallbackTheme;
    }

    const base = {
      b: blue / weightTotal,
      g: green / weightTotal,
      r: red / weightTotal,
    };
    const hsl = softenListenThemeHue(rgbToHsl(base));
    const primary = hslToRgb({
      h: hsl.h,
      l: clampNumber(hsl.l * 1.03 + 0.12, 0.42, 0.68),
      s: clampNumber(hsl.s * 1.08, 0.38, 0.72),
    });
    const secondary = hslToRgb({
      h: (hsl.h + 22) % 360,
      l: clampNumber(hsl.l * 0.95 + 0.08, 0.34, 0.62),
      s: clampNumber(hsl.s * 0.96, 0.3, 0.62),
    });
    const wave = hslToRgb({
      h: (hsl.h + 8) % 360,
      l: clampNumber(hsl.l * 1.18 + 0.16, 0.5, 0.78),
      s: clampNumber(hsl.s * 1.08, 0.44, 0.78),
    });

    return {
      primary: rgbToCss(primary),
      secondary: rgbToCss(secondary),
      shadow: rgbToCss(primary),
      wave: rgbToCss(wave),
    };
  } catch {
    return fallbackTheme;
  }
}
export function softenListenThemeHue(theme: {
  h: number;
  l: number;
  s: number;
}) {
  const redRange = theme.h < 18 || theme.h > 344;

  if (!redRange) {
    return theme;
  }

  return {
    h: theme.h < 180 ? 28 : 332,
    l: theme.l,
    s: theme.s * 0.72,
  };
}
export function rgbToHsl({ b, g, r }: { b: number; g: number; r: number }) {
  const normalizedRed = r / 255;
  const normalizedGreen = g / 255;
  const normalizedBlue = b / 255;
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    if (max === normalizedRed) {
      hue = 60 * (((normalizedGreen - normalizedBlue) / delta) % 6);
    } else if (max === normalizedGreen) {
      hue = 60 * ((normalizedBlue - normalizedRed) / delta + 2);
    } else {
      hue = 60 * ((normalizedRed - normalizedGreen) / delta + 4);
    }
  }

  return {
    h: (hue + 360) % 360,
    l: lightness,
    s: saturation,
  };
}
export function hslToRgb({ h, l, s }: { h: number; l: number; s: number }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    b: Math.round((blue + match) * 255),
    g: Math.round((green + match) * 255),
    r: Math.round((red + match) * 255),
  };
}
export function rgbToCss({ b, g, r }: { b: number; g: number; r: number }) {
  return `${r} ${g} ${b}`;
}
export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
export function formatSeconds(totalSeconds: number) {
  const safeValue =
    Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export function formatQueueRemainingDuration(totalSeconds: number) {
  const safeValue =
    Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${Math.max(1, minutes)}m`;
}
