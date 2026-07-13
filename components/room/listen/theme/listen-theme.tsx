"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/ui";
import { type ListenTheme } from "@/components/room/listen/shared";
import { extractThemeFromImage } from "@/components/room/listen/helpers";

export const LISTEN_THEME_PRESETS = [
  {
    primary: "255 186 32",
    secondary: "184 130 22",
    shadow: "255 186 32",
    wave: "255 214 108",
  },
  {
    primary: "219 116 62",
    secondary: "255 186 32",
    shadow: "219 116 62",
    wave: "255 196 92",
  },
  {
    primary: "176 111 224",
    secondary: "255 186 32",
    shadow: "176 111 224",
    wave: "225 184 255",
  },
  {
    primary: "255 219 157",
    secondary: "155 112 72",
    shadow: "255 186 32",
    wave: "255 205 88",
  },
] satisfies ListenTheme[];
export function ListenCenterWaveform({
  active,
  artworkUrl,
}: {
  active: boolean;
  artworkUrl?: string | null;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0 overflow-hidden"
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider artwork is used as a low-detail center-stage ambient layer.
        <img
          alt=""
          className="absolute inset-x-[-12%] bottom-[-24%] h-[105%] w-[124%] object-cover opacity-24 blur-3xl saturate-150"
          key={artworkUrl}
          loading="eager"
          src={artworkUrl}
          style={{
            animation: "listen-artwork-fade-in 1400ms ease-out both",
          }}
        />
      ) : null}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgb(19_19_20_/_0.02),transparent_34%,rgb(19_19_20_/_0.42)),linear-gradient(90deg,rgb(14_14_15_/_0.44),transparent_34%,transparent_66%,rgb(14_14_15_/_0.44))]" />
      <div
        className={cx(
          "absolute inset-x-[-12%] bottom-0 z-10 flex h-[72%] items-end justify-center gap-2 px-8 transition-opacity duration-1000",
          active ? "opacity-100" : "opacity-78",
        )}
      >
        {Array.from({ length: 96 }).map((_, index) => (
          <span
            className={cx(
              "listen-center-wave-bar w-2 rounded-t-sm",
              !active && "animation-paused",
            )}
            key={index}
            style={{
              animationDelay: `${(index % 13) * 80}ms`,
              backgroundColor: "rgb(var(--listen-wave))",
              boxShadow:
                "0 0 24px rgb(var(--listen-wave) / 0.48), 0 0 54px rgb(var(--listen-shadow) / 0.28)",
              height: `${18 + ((index * 23) % 78)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
export function ListenAmbientBackdrop({
  artworkUrl,
}: {
  artworkUrl?: string | null;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider artwork drives the ambient listen-room backdrop.
        <img
          alt=""
          className="absolute -inset-[12%] h-[124%] w-[124%] object-cover opacity-48 blur-3xl saturate-150"
          fetchPriority="high"
          key={artworkUrl}
          loading="eager"
          src={artworkUrl}
          style={{
            animation: "listen-artwork-fade-in 1400ms ease-out both",
          }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(14_14_15_/_0.58),rgb(19_19_20_/_0.34)_38%,rgb(14_14_15_/_0.88)),linear-gradient(180deg,rgb(14_14_15_/_0.18),rgb(14_14_15_/_0.9))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.028)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255_/_0.022)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
    </div>
  );
}
export function useArtworkTheme(
  artworkUrl: string | null | undefined,
  fallbackTheme: ListenTheme,
) {
  const [extractedTheme, setExtractedTheme] = useState<{
    theme: ListenTheme;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!artworkUrl) {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      if (cancelled) {
        return;
      }

      const nextTheme = extractThemeFromImage(image, fallbackTheme);

      if (nextTheme) {
        setExtractedTheme({
          theme: nextTheme,
          url: artworkUrl,
        });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setExtractedTheme(null);
      }
    };
    image.src = artworkUrl;

    return () => {
      cancelled = true;
    };
  }, [artworkUrl, fallbackTheme]);

  if (extractedTheme && extractedTheme.url === artworkUrl) {
    return extractedTheme.theme;
  }

  return fallbackTheme;
}
export function getListenTheme(sourceKey?: string | null) {
  if (!sourceKey) {
    return LISTEN_THEME_PRESETS[0];
  }

  let hash = 0;

  for (let index = 0; index < sourceKey.length; index += 1) {
    hash = (hash * 31 + sourceKey.charCodeAt(index)) >>> 0;
  }

  return LISTEN_THEME_PRESETS[hash % LISTEN_THEME_PRESETS.length];
}
