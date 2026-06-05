import { parseYouTubePlaylist } from "@/lib/player/source";
import {
  classifyYouTubePlaylistItemStatus,
  classifyYouTubeVideoStatus,
  type YouTubeAvailability,
} from "./availability";
import { InFlightRequestCache, TtlCache } from "./cache";
import { parseYouTubeDuration } from "./metadata";

const YOUTUBE_PLAYLIST_ITEMS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlistItems";
const YOUTUBE_PLAYLISTS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlists";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const PLAYLIST_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_IMPORT_ITEMS = 250;

export type YouTubePlaylistItem = {
  availability: YouTubeAvailability;
  channelTitle: string | null;
  durationSeconds: number | null;
  isUnavailable: boolean;
  position: number;
  sourceUrl: string;
  thumbnailUrl: string | null;
  title: string;
  videoId: string;
};

export type YouTubePlaylistPreviewResponse = {
  items: YouTubePlaylistItem[];
  playlistId: string | null;
  playlistTitle: string | null;
  reason?: string;
  skippedUnavailable: number;
  status: "available" | "not-configured" | "unavailable";
  totalCount: number;
};

type YouTubePlaylistApiResponse = {
  items?: YouTubePlaylistApiItem[];
  nextPageToken?: string;
  pageInfo?: {
    totalResults?: number;
  };
};

type YouTubePlaylistApiItem = {
  snippet?: {
    channelTitle?: string;
    position?: number;
    resourceId?: {
      videoId?: string;
    };
    thumbnails?: Record<string, { url?: string }>;
    title?: string;
    videoOwnerChannelTitle?: string;
  };
  status?: {
    privacyStatus?: string;
  };
};

type YouTubeVideoAvailabilityApiResponse = {
  items?: Array<{
    contentDetails?: {
      duration?: string;
    };
    id?: string;
    status?: {
      embeddable?: boolean;
      privacyStatus?: string;
      uploadStatus?: string;
    };
  }>;
};

const playlistCache = new TtlCache<YouTubePlaylistPreviewResponse>(
  PLAYLIST_CACHE_TTL_MS,
);
const inFlightPlaylistRequests =
  new InFlightRequestCache<YouTubePlaylistPreviewResponse>();

export async function getYouTubePlaylistPreview(
  input: string,
): Promise<YouTubePlaylistPreviewResponse> {
  const parsed = parseYouTubePlaylist(input);

  if (!parsed) {
    return {
      items: [],
      playlistId: null,
      playlistTitle: null,
      reason: "Invalid YouTube playlist URL.",
      skippedUnavailable: 0,
      status: "unavailable",
      totalCount: 0,
    };
  }

  const cached = playlistCache.get(parsed.playlistId);

  if (cached.value) {
    return cached.value;
  }

  return inFlightPlaylistRequests.getOrCreate(parsed.playlistId, () =>
    fetchYouTubePlaylistPreview(parsed.playlistId),
  );
}

async function fetchYouTubePlaylistPreview(
  playlistId: string,
): Promise<YouTubePlaylistPreviewResponse> {
  const apiKey = getYouTubeApiKey();

  if (!apiKey) {
    return cachePlaylist(playlistId, {
      items: [],
      playlistId,
      playlistTitle: null,
      reason: "YouTube playlist import is not configured.",
      skippedUnavailable: 0,
      status: "not-configured",
      totalCount: 0,
    });
  }

  const items: YouTubePlaylistItem[] = [];
  let nextPageToken: string | undefined;
  let totalCount = 0;
  let skippedUnavailable = 0;

  try {
    const playlistTitle = await fetchPlaylistTitle(playlistId, apiKey);

    do {
      const requestUrl = new URL(YOUTUBE_PLAYLIST_ITEMS_ENDPOINT);
      requestUrl.searchParams.set("key", apiKey);
      requestUrl.searchParams.set("maxResults", "50");
      requestUrl.searchParams.set("part", "snippet,status");
      requestUrl.searchParams.set("playlistId", playlistId);

      if (nextPageToken) {
        requestUrl.searchParams.set("pageToken", nextPageToken);
      }

      const response = await fetch(requestUrl, {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 60 * 10,
        },
      });

      if (!response.ok) {
        return cachePlaylist(playlistId, {
          items,
          playlistId,
          playlistTitle: null,
          reason: "YouTube playlist data is temporarily unavailable.",
          skippedUnavailable,
          status: "unavailable",
          totalCount,
        });
      }

      const payload = (await response.json()) as YouTubePlaylistApiResponse;
      totalCount = payload.pageInfo?.totalResults ?? totalCount;
      nextPageToken = payload.nextPageToken;

      for (const item of payload.items ?? []) {
        const normalized = normalizePlaylistItem(item);

        if (!normalized) {
          skippedUnavailable += 1;
          continue;
        }

        items.push(normalized);
      }
    } while (nextPageToken && items.length < MAX_IMPORT_ITEMS);

    const enrichedItems = await enrichPlaylistItemsWithVideoStatus(
      items,
      apiKey,
    );
    skippedUnavailable = enrichedItems.filter(
      (item) => item.isUnavailable,
    ).length;

    return cachePlaylist(playlistId, {
      items: enrichedItems,
      playlistId,
      playlistTitle,
      skippedUnavailable,
      status: "available",
      totalCount: totalCount || enrichedItems.length + skippedUnavailable,
    });
  } catch {
    return cachePlaylist(playlistId, {
      items,
      playlistId,
      playlistTitle: null,
      reason: "YouTube playlist lookup failed.",
      skippedUnavailable,
      status: "unavailable",
      totalCount,
    });
  }
}

async function fetchPlaylistTitle(playlistId: string, apiKey: string) {
  const requestUrl = new URL(YOUTUBE_PLAYLISTS_ENDPOINT);
  requestUrl.searchParams.set("id", playlistId);
  requestUrl.searchParams.set("key", apiKey);
  requestUrl.searchParams.set("part", "snippet");

  try {
    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 10,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      items?: Array<{ snippet?: { title?: string } }>;
    };

    return payload.items?.[0]?.snippet?.title ?? null;
  } catch {
    return null;
  }
}

function normalizePlaylistItem(
  item: YouTubePlaylistApiItem,
): YouTubePlaylistItem | null {
  const videoId = item.snippet?.resourceId?.videoId;
  const title = item.snippet?.title?.trim();
  const availability = classifyYouTubePlaylistItemStatus({
    privacyStatus: item.status?.privacyStatus,
    title,
    videoId,
  });

  if (!videoId) {
    return null;
  }

  const thumbnails = item.snippet?.thumbnails;
  const safeTitle =
    title && title !== "Deleted video" && title !== "Private video"
      ? title
      : "Unavailable YouTube video";

  return {
    availability,
    channelTitle:
      item.snippet?.videoOwnerChannelTitle ??
      item.snippet?.channelTitle ??
      null,
    durationSeconds: null,
    isUnavailable: !availability.playable,
    position: item.snippet?.position ?? 0,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl:
      thumbnails?.maxres?.url ??
      thumbnails?.standard?.url ??
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    title: safeTitle,
    videoId,
  };
}

async function enrichPlaylistItemsWithVideoStatus(
  items: YouTubePlaylistItem[],
  apiKey: string,
) {
  const nextItems = [...items];

  for (let index = 0; index < nextItems.length; index += 50) {
    const batch = nextItems.slice(index, index + 50);
    const requestUrl = new URL(YOUTUBE_VIDEOS_ENDPOINT);

    requestUrl.searchParams.set("id", batch.map((item) => item.videoId).join(","));
    requestUrl.searchParams.set("key", apiKey);
    requestUrl.searchParams.set("part", "contentDetails,status");

    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 60 * 10,
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload =
        (await response.json()) as YouTubeVideoAvailabilityApiResponse;
      const videosById = new Map(
        (payload.items ?? []).map((item) => [item.id, item]),
      );

      batch.forEach((item, batchIndex) => {
        const video = videosById.get(item.videoId);

        if (!video) {
          const availability: YouTubeAvailability = {
            playable: false,
            reason: "This YouTube video was not found or is not public.",
            source: "metadata",
            status: "removed-private",
          };

          nextItems[index + batchIndex] = {
            ...item,
            availability,
            isUnavailable: true,
          };
          return;
        }

        const metadataAvailability = classifyYouTubeVideoStatus(
          video.status ?? {},
        );
        const availability =
          item.availability.playable === false
            ? item.availability
            : metadataAvailability;

        nextItems[index + batchIndex] = {
          ...item,
          availability,
          durationSeconds:
            parseYouTubeDuration(video.contentDetails?.duration) ??
            item.durationSeconds,
          isUnavailable: !availability.playable,
        };
      });
    } catch {
      continue;
    }
  }

  return nextItems;
}

function cachePlaylist(
  playlistId: string,
  response: YouTubePlaylistPreviewResponse,
) {
  return playlistCache.set(playlistId, response);
}

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
}
