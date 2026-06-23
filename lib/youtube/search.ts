import {
  UNKNOWN_YOUTUBE_AVAILABILITY,
  type YouTubeAvailability,
} from "./availability";
import { InFlightRequestCache, TtlCache } from "./cache";
import {
  normalizeYouTubeVideo,
  type YouTubeVideoMetadata,
} from "./metadata";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_SEARCH_RESULTS = 10;
const MIN_SEARCH_QUERY_LENGTH = 3;

export type YouTubeSearchItem = {
  availability: YouTubeAvailability;
  channelTitle: string | null;
  durationSeconds: number | null;
  source: "youtube";
  thumbnailUrl: string | null;
  title: string;
  url: string;
  youtubeVideoId: string;
};

export type YouTubeSearchResponse = {
  items: YouTubeSearchItem[];
  nextPageToken: string | null;
  quotaCostEstimate: number;
  reason?: string;
  status: "available" | "not-configured" | "unavailable";
};

type YouTubeSearchApiResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
  nextPageToken?: string;
};

type YouTubeVideosApiResponse = {
  items?: Array<Parameters<typeof normalizeYouTubeVideo>[0]>;
};

const searchCache = new TtlCache<YouTubeSearchResponse>(SEARCH_CACHE_TTL_MS);
const inFlightSearchRequests = new InFlightRequestCache<YouTubeSearchResponse>();

export async function searchYouTubeVideos({
  pageToken,
  query,
}: {
  pageToken?: string | null;
  query: string;
}): Promise<YouTubeSearchResponse> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return {
      items: [],
      nextPageToken: null,
      quotaCostEstimate: 0,
      reason: "Type at least 3 characters to search YouTube.",
      status: "unavailable",
    };
  }

  const cacheKey = `${normalizedQuery}:${pageToken?.trim() ?? ""}`;
  const cached = searchCache.get(cacheKey);

  if (cached.value) {
    return cached.value;
  }

  return inFlightSearchRequests.getOrCreate(cacheKey, () =>
    fetchYouTubeSearch({
      cacheKey,
      pageToken,
      query: normalizedQuery,
    }),
  );
}

async function fetchYouTubeSearch({
  cacheKey,
  pageToken,
  query,
}: {
  cacheKey: string;
  pageToken?: string | null;
  query: string;
}) {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    return cacheSearch(cacheKey, {
      items: [],
      nextPageToken: null,
      quotaCostEstimate: 0,
      reason: "YouTube search is not configured.",
      status: "not-configured",
    });
  }

  try {
    const searchPayload = await fetchSearchIds({ apiKey, pageToken, query });
    const ids = uniqueStrings(
      searchPayload.items
        ?.map((item) => item.id?.videoId)
        .filter((videoId): videoId is string => Boolean(videoId)) ?? [],
    ).slice(0, MAX_SEARCH_RESULTS);

    if (ids.length === 0) {
      return cacheSearch(cacheKey, {
        items: [],
        nextPageToken: searchPayload.nextPageToken ?? null,
        quotaCostEstimate: 100,
        reason: "No YouTube videos matched that search.",
        status: "available",
      });
    }

    const metadata = await fetchVideoMetadata(apiKey, ids);
    const metadataById = new Map(
      metadata.map((item) => [item.videoId, item] as const),
    );

    return cacheSearch(cacheKey, {
      items: ids
        .map((id) => metadataById.get(id))
        .filter((item): item is YouTubeVideoMetadata => Boolean(item))
        .map(normalizeSearchItem),
      nextPageToken: searchPayload.nextPageToken ?? null,
      quotaCostEstimate: 101,
      status: "available",
    });
  } catch {
    return cacheSearch(cacheKey, {
      items: [],
      nextPageToken: null,
      quotaCostEstimate: 0,
      reason: "YouTube search is temporarily unavailable.",
      status: "unavailable",
    });
  }
}

async function fetchSearchIds({
  apiKey,
  pageToken,
  query,
}: {
  apiKey: string;
  pageToken?: string | null;
  query: string;
}) {
  const requestUrl = new URL(YOUTUBE_SEARCH_ENDPOINT);
  requestUrl.searchParams.set("key", apiKey);
  requestUrl.searchParams.set("maxResults", String(MAX_SEARCH_RESULTS));
  requestUrl.searchParams.set("part", "id");
  requestUrl.searchParams.set("q", query);
  requestUrl.searchParams.set("safeSearch", "none");
  requestUrl.searchParams.set("type", "video");

  if (pageToken?.trim()) {
    requestUrl.searchParams.set("pageToken", pageToken.trim());
  }

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 10 * 60,
    },
  });

  if (!response.ok) {
    throw new Error("YouTube search failed.");
  }

  return response.json() as Promise<YouTubeSearchApiResponse>;
}

async function fetchVideoMetadata(apiKey: string, ids: string[]) {
  const requestUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);
  requestUrl.searchParams.set("id", ids.join(","));
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
      revalidate: 10 * 60,
    },
  });

  if (!response.ok) {
    throw new Error("YouTube video metadata failed.");
  }

  const payload = (await response.json()) as YouTubeVideosApiResponse;

  return payload.items?.map((item) => normalizeYouTubeVideo(item)) ?? [];
}

function normalizeSearchItem(item: YouTubeVideoMetadata): YouTubeSearchItem {
  return {
    availability: item.availability ?? UNKNOWN_YOUTUBE_AVAILABILITY,
    channelTitle: decodeText(item.channelTitle),
    durationSeconds: item.durationSeconds,
    source: "youtube",
    thumbnailUrl: item.thumbnailUrl,
    title: decodeText(item.title) ?? "Untitled YouTube video",
    url: `https://www.youtube.com/watch?v=${item.videoId}`,
    youtubeVideoId: item.videoId,
  };
}

function normalizeSearchQuery(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function decodeText(input?: string | null) {
  if (!input) {
    return null;
  }

  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function cacheSearch(key: string, response: YouTubeSearchResponse) {
  return searchCache.set(key, response);
}

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
}
