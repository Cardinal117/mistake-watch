"use client";

import type {
  YouTubeRecommendationKind,
  YouTubeRecommendationResponse,
} from "./recommendations";

const recommendationCache = new Map<string, YouTubeRecommendationResponse>();
const pendingRecommendationRequests = new Map<
  string,
  Promise<YouTubeRecommendationResponse>
>();

export function fetchYouTubeRecommendations({
  kind,
  query,
}: {
  kind: YouTubeRecommendationKind;
  query?: string | null;
}) {
  const key = `${kind}:${query?.trim() ?? ""}`;
  const cached = recommendationCache.get(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingRecommendationRequests.get(key);

  if (pending) {
    return pending;
  }

  const params = new URLSearchParams({
    kind,
  });

  if (query?.trim()) {
    params.set("query", query.trim());
  }

  const request = fetch(`/api/youtube/recommendations?${params.toString()}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("recommendation request failed");
      }

      return response.json() as Promise<YouTubeRecommendationResponse>;
    })
    .then((payload) => {
      recommendationCache.set(key, payload);

      return payload;
    })
    .catch(() => {
      const fallback: YouTubeRecommendationResponse = {
        items: [],
        reason: "YouTube recommendations unavailable.",
        source: "unavailable",
        status: "unavailable",
      };

      recommendationCache.set(key, fallback);

      return fallback;
    })
    .finally(() => {
      pendingRecommendationRequests.delete(key);
    });

  pendingRecommendationRequests.set(key, request);

  return request;
}
