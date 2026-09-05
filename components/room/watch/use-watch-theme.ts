"use client";

import { useMemo, type CSSProperties } from "react";
import type { LiveRoomState } from "@/lib/spacetime";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import { getListenPresentationVariables } from "@/lib/player/listen-visualization";
import { getListenTheme, useArtworkTheme } from "../listen/theme/listen-theme";
import { useListenAmbientPreference } from "../listen/theme/use-listen-ambient-preference";
import { readableWatchAccent } from "./watch-accent";
import type { WatchMediaHubItem } from "./contracts";

/** Share Listen's extraction and presentation preferences without mounting its player. */
export function useWatchTheme(
  liveRoom: LiveRoomState,
  items: WatchMediaHubItem[],
) {
  const session = liveRoom.snapshot.session;
  const source = session?.sourceUrl;
  // An old queue selection must not tint a newly loaded direct source.
  const current =
    items.find(
      (item) =>
        item.id === session?.activeQueueItemId && item.sourceUrl === source,
    ) ??
    items.find((item) => item.status === "now" && item.sourceUrl === source);
  const artwork =
    current?.thumbnailUrl ??
    (session?.sourceType === "youtube" && source
      ? getYouTubeThumbnailUrl(source)
      : null);
  const fallback = useMemo(() => getListenTheme(source), [source]);
  const theme = useArtworkTheme(artwork, fallback);
  const { visualIntensity, backgroundDimming, backgroundVibrancy } =
    useListenAmbientPreference();
  return {
    ...getListenPresentationVariables(
      visualIntensity,
      backgroundDimming,
      backgroundVibrancy,
    ),
    "--listen-background-primary": theme.backgroundPrimary,
    "--listen-background-secondary": theme.backgroundSecondary,
    "--listen-primary": readableWatchAccent(theme.primary),
    "--listen-secondary": theme.secondary,
    "--listen-shadow": theme.shadow,
    "--listen-wave": theme.wave,
  } as CSSProperties;
}
