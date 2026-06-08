"use client";

import type { YouTubePlaylistPreviewResponse } from "./playlist";

const playlistPreviewCache = new Map<string, YouTubePlaylistPreviewResponse>();
const pendingPlaylistPreviews = new Map<
  string,
  Promise<YouTubePlaylistPreviewResponse>
>();

export function fetchPlaylistPreview(input: string, roomId: string) {
  const trimmedInput = input.trim();
  const key = `${roomId}:${trimmedInput}`;
  const cached = playlistPreviewCache.get(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingPlaylistPreviews.get(key);

  if (pending) {
    return pending;
  }

  const params = new URLSearchParams({
    roomId,
    url: trimmedInput,
  });

  const request = fetch(`/api/youtube/playlist?${params.toString()}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("playlist request failed");
      }

      return response.json() as Promise<YouTubePlaylistPreviewResponse>;
    })
    .then((preview) => {
      playlistPreviewCache.set(key, preview);

      return preview;
    })
    .finally(() => {
      pendingPlaylistPreviews.delete(key);
    });

  pendingPlaylistPreviews.set(key, request);

  return request;
}
