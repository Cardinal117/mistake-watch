"use client";

import { useEffect, useMemo, useState } from "react";

import { parseYouTubeVideoId } from "@/lib/player/source";
import { isMetadataScheduleAbort } from "@/lib/queue/metadata-scheduler";
import { UNKNOWN_YOUTUBE_AVAILABILITY } from "./availability";
import type { YouTubeMetadataResponse } from "./metadata";
import {
  fetchYouTubeMetadata,
  readCachedYouTubeMetadata,
} from "./metadata-client";
import { scheduleQueueYouTubeMetadata } from "./queue-metadata-scheduler";

export function useYouTubeMetadata(
  sourceUrl?: string | null,
  options?: { instrumentQueue?: boolean; queuePriority?: number },
) {
  const videoId = useMemo(
    () => (sourceUrl ? parseYouTubeVideoId(sourceUrl) : null),
    [sourceUrl],
  );
  const [resolved, setResolved] = useState<{
    result: YouTubeMetadataResponse;
    videoId: string;
  } | null>(null);
  const result =
    videoId && resolved?.videoId === videoId
      ? resolved.result
      : videoId
        ? readCachedYouTubeMetadata(sourceUrl ?? videoId)
        : null;

  useEffect(() => {
    if (!videoId) {
      return;
    }

    const metadataInput = sourceUrl ?? videoId;

    if (readCachedYouTubeMetadata(metadataInput)) {
      return;
    }

    const controller = new AbortController();
    const request =
      typeof options?.queuePriority === "number"
        ? scheduleQueueYouTubeMetadata(metadataInput, {
            priority: options.queuePriority,
            signal: controller.signal,
          })
        : fetchYouTubeMetadata(metadataInput, {
            instrumentQueue: options?.instrumentQueue,
          });

    request
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setResolved({ result: response, videoId });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isMetadataScheduleAbort(error)) {
          return;
        }

        const fallback: YouTubeMetadataResponse = {
          availability: UNKNOWN_YOUTUBE_AVAILABILITY,
          metadata: null,
          reason: "YouTube metadata unavailable.",
          status: "unavailable",
        };
        setResolved({ result: fallback, videoId });
      });

    return () => {
      controller.abort();
    };
  }, [options?.instrumentQueue, options?.queuePriority, sourceUrl, videoId]);

  return {
    loading: Boolean(videoId && !result),
    metadata: result?.metadata ?? null,
    reason: result?.reason,
    status: result?.status ?? (videoId ? "unavailable" : "unavailable"),
    videoId,
  };
}
