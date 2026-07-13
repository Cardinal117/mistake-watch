"use client";

import { UNKNOWN_YOUTUBE_AVAILABILITY } from "./availability";
import type { YouTubeMetadataResponse } from "./metadata";
import { beginQueueMetadataRequest } from "@/lib/performance/queue";
import { parseYouTubeVideoId } from "@/lib/player/source";

const metadataCache = new Map<string, YouTubeMetadataResponse>();
const pendingMetadataRequests = new Map<
  string,
  Promise<YouTubeMetadataResponse>
>();

export function getYouTubeMetadataCacheKey(input: string) {
  const trimmedInput = input.trim();

  return parseYouTubeVideoId(trimmedInput) ?? trimmedInput;
}

export function readCachedYouTubeMetadata(input: string) {
  return metadataCache.get(getYouTubeMetadataCacheKey(input)) ?? null;
}

export function fetchYouTubeMetadata(
  input: string,
  options?: { instrumentQueue?: boolean },
) {
  const key = getYouTubeMetadataCacheKey(input);
  const cached = metadataCache.get(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingMetadataRequests.get(key);

  if (pending) {
    return pending;
  }

  const completeInstrumentation = options?.instrumentQueue
    ? beginQueueMetadataRequest({ client: "metadata-client" })
    : null;
  const request = fetch(`/api/youtube/metadata?url=${encodeURIComponent(key)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("metadata request failed");
      }

      return response.json() as Promise<YouTubeMetadataResponse>;
    })
    .then((metadata) => {
      metadataCache.set(key, metadata);

      return metadata;
    })
    .catch(() => {
      const fallback: YouTubeMetadataResponse = {
        availability: UNKNOWN_YOUTUBE_AVAILABILITY,
        metadata: null,
        reason: "YouTube metadata unavailable.",
        status: "unavailable",
      };

      metadataCache.set(key, fallback);

      return fallback;
    })
    .finally(() => {
      pendingMetadataRequests.delete(key);
      completeInstrumentation?.();
    });

  pendingMetadataRequests.set(key, request);

  return request;
}
