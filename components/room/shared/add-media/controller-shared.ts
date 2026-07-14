"use client";

import { useMemo, useState } from "react";

import { parseYouTubeVideoId } from "@/lib/player/source";
import type { RoomQueueItem } from "@/lib/rooms";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata-client";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import type { QueueAddInput, SourceLoadInput } from "../../queue/contracts";
import type { DuplicatePreference } from "./contracts";

const duplicatePreferenceStorageKey = "mw_queue_duplicate_preference";

export function useDuplicatePreference() {
  return useState<DuplicatePreference>(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem(duplicatePreferenceStorageKey) === "allow"
      ? "allow"
      : "warn",
  );
}

export function rememberDuplicatePreference(remember: boolean) {
  if (remember) {
    window.localStorage.setItem(duplicatePreferenceStorageKey, "allow");
  }
}

export function useQueueSourceDuplicates(items: RoomQueueItem[]) {
  const duplicateVideoIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.videoId)
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    [items],
  );
  const duplicateSourceUrls = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.sourceUrl)
          .filter((sourceUrl): sourceUrl is string => Boolean(sourceUrl)),
      ),
    [items],
  );

  return { duplicateSourceUrls, duplicateVideoIds };
}

export function isDuplicateQueueSource(
  input: Pick<QueueAddInput, "sourceUrl">,
  duplicateSourceUrls: Set<string>,
  duplicateVideoIds: Set<string>,
) {
  const videoId = parseYouTubeVideoId(input.sourceUrl);

  return (
    duplicateSourceUrls.has(input.sourceUrl) ||
    Boolean(videoId && duplicateVideoIds.has(videoId))
  );
}

export function youtubeSearchItemToQueueInput(
  item: YouTubeSearchItem,
): QueueAddInput {
  return {
    artist: item.channelTitle ?? undefined,
    channelName: item.channelTitle ?? undefined,
    durationSeconds: item.durationSeconds ?? undefined,
    isUnavailable: item.availability.playable === false,
    sourceTitle: item.title,
    sourceType: "youtube",
    sourceUrl: item.url,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
  };
}

export async function resolveYouTubeQueueInput(
  input: SourceLoadInput,
): Promise<
  { error: null; input: QueueAddInput } | { error: string; input: null }
> {
  if (input.sourceType !== "youtube") {
    return { error: null, input };
  }

  const metadata = await fetchYouTubeMetadata(input.sourceUrl);

  if (metadata.availability?.playable === false) {
    return { error: metadata.availability.reason, input: null };
  }

  return {
    error: null,
    input: {
      ...input,
      artist: metadata.metadata?.channelTitle ?? undefined,
      channelName: metadata.metadata?.channelTitle ?? undefined,
      durationSeconds: metadata.metadata?.durationSeconds ?? undefined,
      sourceTitle: metadata.metadata?.title ?? input.sourceTitle,
      thumbnailUrl: metadata.metadata?.thumbnailUrl ?? undefined,
    },
  };
}
