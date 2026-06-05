import { normalizeYouTubeVideo, type YouTubeVideoMetadata } from "./metadata";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

export type YouTubeRecommendationKind = "recommended";

export type YouTubeRecommendationResponse = {
  items: YouTubeVideoMetadata[];
  reason?: string;
  source: "youtube" | "unavailable";
  status: "available" | "not-configured" | "unavailable";
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<Parameters<typeof normalizeYouTubeVideo>[0]>;
};

export async function getYouTubeRecommendations({
  kind,
  query,
}: {
  kind: YouTubeRecommendationKind;
  query?: string | null;
}): Promise<YouTubeRecommendationResponse> {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    return {
      items: [],
      reason: "YouTube recommendations are not configured.",
      source: "unavailable",
      status: "not-configured",
    };
  }

  try {
    const ids = await fetchRecommendedIds(apiKey, query);

    if (ids.length === 0) {
      return {
        items: [],
        reason: "No provider recommendation query is available yet.",
        source: "unavailable",
        status: "unavailable",
      };
    }

    const items = await fetchVideoMetadata(apiKey, ids);

    return {
      items: items.filter((item) => item.availability.playable),
      source: "youtube",
      status: "available",
    };
  } catch {
    return {
      items: [],
      reason: "YouTube recommendations are temporarily unavailable.",
      source: "unavailable",
      status: "unavailable",
    };
  }
}

async function fetchRecommendedIds(apiKey: string, query?: string | null) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return [];
  }

  const requestUrl = new URL(YOUTUBE_SEARCH_ENDPOINT);
  requestUrl.searchParams.set("key", apiKey);
  requestUrl.searchParams.set("maxResults", "8");
  requestUrl.searchParams.set("part", "id");
  requestUrl.searchParams.set("q", normalizedQuery);
  requestUrl.searchParams.set("safeSearch", "none");
  requestUrl.searchParams.set("type", "video");
  requestUrl.searchParams.set("videoCategoryId", "10");

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error("YouTube search failed.");
  }

  const payload = (await response.json()) as YouTubeSearchResponse;

  return uniqueStrings(
    payload.items
      ?.map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId)) ?? [],
  );
}

async function fetchVideoMetadata(apiKey: string, videoIds: string[]) {
  const requestUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);
  requestUrl.searchParams.set("id", videoIds.join(","));
  requestUrl.searchParams.set("key", apiKey);
  requestUrl.searchParams.set(
    "part",
    "snippet,contentDetails,statistics,status",
  );

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error("YouTube video metadata failed.");
  }

  const payload = (await response.json()) as YouTubeVideosResponse;

  return payload.items?.map((item) => normalizeYouTubeVideo(item)) ?? [];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
}
