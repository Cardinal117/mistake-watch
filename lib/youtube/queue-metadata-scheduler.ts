"use client";

import { BoundedMetadataScheduler } from "@/lib/queue/metadata-scheduler";
import type { YouTubeMetadataResponse } from "./metadata";
import {
  fetchYouTubeMetadata,
  getYouTubeMetadataCacheKey,
  readCachedYouTubeMetadata,
} from "./metadata-client";

export const MAX_QUEUE_METADATA_CONCURRENCY = 3;

const scheduler = new BoundedMetadataScheduler<YouTubeMetadataResponse>(
  MAX_QUEUE_METADATA_CONCURRENCY,
);

export function scheduleQueueYouTubeMetadata(
  input: string,
  options: { priority: number; signal?: AbortSignal },
) {
  const cached = readCachedYouTubeMetadata(input);

  if (cached) {
    return Promise.resolve(cached);
  }

  return scheduler.schedule({
    key: getYouTubeMetadataCacheKey(input),
    priority: options.priority,
    run: () => fetchYouTubeMetadata(input, { instrumentQueue: true }),
    signal: options.signal,
  });
}

export function getQueueMetadataSchedulerSnapshot() {
  return scheduler.getSnapshot();
}
