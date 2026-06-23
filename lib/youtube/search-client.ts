"use client";

import type { YouTubeSearchResponse } from "./search";

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

type SearchCacheEntry = {
  expiresAt: number;
  value: YouTubeSearchResponse;
};

const searchCache = new Map<string, SearchCacheEntry>();

export async function fetchYouTubeSearch({
  query,
  roomId,
  signal,
}: {
  query: string;
  roomId: string;
  signal?: AbortSignal;
}) {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  const key = `${roomId}:${normalizedQuery.toLowerCase()}`;
  const cached = searchCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    roomId,
    type: "video",
  });

  const response = await fetch(`/api/youtube/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("youtube search request failed");
  }

  const payload = (await response.json()) as YouTubeSearchResponse;

  searchCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    value: payload,
  });

  return payload;
}
