"use client";

import type { RoomQueueItem } from "@/lib/rooms";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import { type ListenTheme } from "@/components/room/listen/shared";
import { deriveListenArtworkTheme } from "@/lib/player/listen-artwork-palette";

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

    return deriveListenArtworkTheme(
      context.getImageData(0, 0, size, size).data,
      fallbackTheme,
    );
  } catch {
    return fallbackTheme;
  }
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
