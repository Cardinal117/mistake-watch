"use client";

import { useEffect, useMemo, useState } from "react";

import { parseYouTubeVideoId } from "@/lib/player/source";
import { beginQueueMetadataRequest } from "@/lib/performance/queue";
import { UNKNOWN_YOUTUBE_AVAILABILITY } from "./availability";
import type { YouTubeMetadataResponse } from "./metadata";

const clientCache = new Map<string, YouTubeMetadataResponse>();
const pendingRequests = new Map<string, Promise<YouTubeMetadataResponse>>();

export function useYouTubeMetadata(
  sourceUrl?: string | null,
  options?: { instrumentQueue?: boolean },
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
        ? (clientCache.get(videoId) ?? null)
        : null;

  useEffect(() => {
    if (!videoId) {
      return;
    }

    if (clientCache.has(videoId)) {
      return;
    }

    const request = getMetadataRequest(videoId, options?.instrumentQueue);
    let cancelled = false;

    request
      .then((response) => {
        if (cancelled) {
          return;
        }

        setResolved({ result: response, videoId });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const fallback: YouTubeMetadataResponse = {
          availability: UNKNOWN_YOUTUBE_AVAILABILITY,
          metadata: null,
          reason: "YouTube metadata unavailable.",
          status: "unavailable",
        };
        clientCache.set(videoId, fallback);
        setResolved({ result: fallback, videoId });
      });

    return () => {
      cancelled = true;
    };
  }, [options?.instrumentQueue, videoId]);

  return {
    loading: Boolean(videoId && !result),
    metadata: result?.metadata ?? null,
    reason: result?.reason,
    status: result?.status ?? (videoId ? "unavailable" : "unavailable"),
    videoId,
  };
}

function getMetadataRequest(videoId: string, instrumentQueue = false) {
  const cached = clientCache.get(videoId);

  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingRequests.get(videoId);

  if (pending) {
    return pending;
  }

  const completeInstrumentation = instrumentQueue
    ? beginQueueMetadataRequest({ client: "metadata-hook" })
    : null;
  const request = fetch(
    `/api/youtube/metadata?videoId=${encodeURIComponent(videoId)}`,
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("metadata request failed");
      }

      return response.json() as Promise<YouTubeMetadataResponse>;
    })
    .then((metadata) => {
      clientCache.set(videoId, metadata);

      return metadata;
    })
    .finally(() => {
      pendingRequests.delete(videoId);
      completeInstrumentation?.();
    });

  pendingRequests.set(videoId, request);

  return request;
}
