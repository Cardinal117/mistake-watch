import { parseYouTubeVideoId } from "@/lib/player/source";
import {
  classifyYouTubeVideoStatus,
  type YouTubeAvailability,
  UNKNOWN_YOUTUBE_AVAILABILITY,
} from "./availability";
import { InFlightRequestCache, TtlCache } from "./cache";

const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export type YouTubeMetadataStatus =
  | "available"
  | "not-configured"
  | "not-found"
  | "unavailable";

export type YouTubeThumbnailSet = {
  default?: string;
  high?: string;
  maxres?: string;
  medium?: string;
  standard?: string;
};

export type YouTubeVideoMetadata = {
  availability: YouTubeAvailability;
  channelTitle: string | null;
  durationSeconds: number | null;
  likeCount: number | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  thumbnails: YouTubeThumbnailSet;
  title: string | null;
  videoId: string;
  viewCount: number | null;
};

export type YouTubeMetadataResponse = {
  availability: YouTubeAvailability;
  metadata: YouTubeVideoMetadata | null;
  reason?: string;
  status: YouTubeMetadataStatus;
};

type YouTubeApiThumbnail = {
  url?: string;
};

type YouTubeApiVideo = {
  id?: string;
  snippet?: {
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, YouTubeApiThumbnail>;
    title?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    likeCount?: string;
    viewCount?: string;
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
    uploadStatus?: string;
  };
};

type YouTubeApiResponse = {
  items?: YouTubeApiVideo[];
};

const metadataCache = new TtlCache<YouTubeMetadataResponse>(
  METADATA_CACHE_TTL_MS,
);
const inFlightMetadataRequests =
  new InFlightRequestCache<YouTubeMetadataResponse>();

export async function getYouTubeMetadata(
  input: string,
): Promise<YouTubeMetadataResponse> {
  const videoId = parseYouTubeVideoId(input);

  if (!videoId) {
    return {
      availability: {
        playable: false,
        reason: "Invalid YouTube video id.",
        source: "metadata",
        status: "removed-private",
      },
      metadata: null,
      reason: "Invalid YouTube video id.",
      status: "unavailable",
    };
  }

  const cached = metadataCache.get(videoId);

  if (cached.value) {
    return cached.value;
  }

  return inFlightMetadataRequests.getOrCreate(videoId, () =>
    fetchYouTubeMetadata(videoId),
  );
}

async function fetchYouTubeMetadata(
  videoId: string,
): Promise<YouTubeMetadataResponse> {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    return cacheMetadata(videoId, {
      metadata: null,
      reason: "YouTube metadata is not configured.",
      status: "not-configured",
      availability: UNKNOWN_YOUTUBE_AVAILABILITY,
    });
  }

  const requestUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);
  requestUrl.searchParams.set("id", videoId);
  requestUrl.searchParams.set("key", apiKey);
  requestUrl.searchParams.set(
    "part",
    "snippet,contentDetails,statistics,status",
  );

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 60,
      },
    });

    if (!response.ok) {
      return cacheMetadata(videoId, {
        metadata: null,
        reason: "YouTube metadata is temporarily unavailable.",
        status: "unavailable",
        availability: {
          playable: true,
          reason: "YouTube metadata is temporarily unavailable.",
          source: "metadata",
          status: "provider-unavailable",
        },
      });
    }

    const payload = (await response.json()) as YouTubeApiResponse;
    const item = payload.items?.[0];

    if (!item) {
      return cacheMetadata(videoId, {
        metadata: null,
        reason: "This YouTube video was not found or is not public.",
        status: "not-found",
        availability: {
          playable: false,
          reason: "This YouTube video was not found or is not public.",
          source: "metadata",
          status: "removed-private",
        },
      });
    }

    return cacheMetadata(videoId, {
      metadata: normalizeYouTubeVideo(item, videoId),
      status: "available",
      availability: classifyYouTubeVideoStatus(item.status ?? {}),
    });
  } catch {
    return cacheMetadata(videoId, {
      metadata: null,
      reason: "YouTube metadata lookup failed.",
      status: "unavailable",
      availability: {
        playable: true,
        reason: "YouTube metadata lookup failed.",
        source: "metadata",
        status: "provider-unavailable",
      },
    });
  }
}

export function normalizeYouTubeVideo(
  item: YouTubeApiVideo,
  fallbackVideoId = item.id ?? "",
): YouTubeVideoMetadata {
  const thumbnails = normalizeThumbnails(item.snippet?.thumbnails);

  return {
    availability: classifyYouTubeVideoStatus(item.status ?? {}),
    channelTitle: item.snippet?.channelTitle ?? null,
    durationSeconds: parseYouTubeDuration(item.contentDetails?.duration),
    likeCount: parseCount(item.statistics?.likeCount),
    publishedAt: item.snippet?.publishedAt ?? null,
    thumbnailUrl:
      thumbnails.maxres ??
      thumbnails.standard ??
      thumbnails.high ??
      thumbnails.medium ??
      thumbnails.default ??
      null,
    thumbnails,
    title: item.snippet?.title ?? null,
    videoId: item.id ?? fallbackVideoId,
    viewCount: parseCount(item.statistics?.viewCount),
  };
}

export function parseYouTubeDuration(input?: string | null) {
  if (!input) {
    return null;
  }

  const match = input.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );

  if (!match) {
    return null;
  }

  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;

  return (
    Number(days) * 86_400 +
    Number(hours) * 3_600 +
    Number(minutes) * 60 +
    Number(seconds)
  );
}

function normalizeThumbnails(
  thumbnails: Record<string, YouTubeApiThumbnail> | undefined,
): YouTubeThumbnailSet {
  return {
    default: thumbnails?.default?.url,
    high: thumbnails?.high?.url,
    maxres: thumbnails?.maxres?.url,
    medium: thumbnails?.medium?.url,
    standard: thumbnails?.standard?.url,
  };
}

function parseCount(input?: string) {
  if (!input) {
    return null;
  }

  const value = Number(input);

  return Number.isFinite(value) ? value : null;
}

function cacheMetadata(
  videoId: string,
  response: YouTubeMetadataResponse,
): YouTubeMetadataResponse {
  return metadataCache.set(videoId, response);
}

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
}
