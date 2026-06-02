import { parseYouTubePlaylist } from "@/lib/player/source";
import { InFlightRequestCache, TtlCache } from "./cache";

const YOUTUBE_PLAYLIST_ITEMS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlistItems";
const YOUTUBE_PLAYLISTS_ENDPOINT =
  "https://www.googleapis.com/youtube/v3/playlists";
const PLAYLIST_CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_IMPORT_ITEMS = 250;

export type YouTubePlaylistItem = {
  channelTitle: string | null;
  durationSeconds: number | null;
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

    return cachePlaylist(playlistId, {
      items,
      playlistId,
      playlistTitle,
      skippedUnavailable,
      status: "available",
      totalCount: totalCount || items.length + skippedUnavailable,
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

  if (
    !videoId ||
    !title ||
    title === "Deleted video" ||
    title === "Private video" ||
    item.status?.privacyStatus === "private"
  ) {
    return null;
  }

  const thumbnails = item.snippet?.thumbnails;

  return {
    channelTitle:
      item.snippet?.videoOwnerChannelTitle ??
      item.snippet?.channelTitle ??
      null,
    durationSeconds: null,
    position: item.snippet?.position ?? 0,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl:
      thumbnails?.maxres?.url ??
      thumbnails?.standard?.url ??
      thumbnails?.high?.url ??
      thumbnails?.medium?.url ??
      thumbnails?.default?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    title,
    videoId,
  };
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
