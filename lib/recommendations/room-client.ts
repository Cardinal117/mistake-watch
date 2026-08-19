"use client";

import type { RoomQueueItem } from "@/lib/rooms";
import {
  recommendationMediaIdentity,
  recommendationMediaKey,
  type RecommendationMediaIdentity,
} from "./media-identity";
import type {
  RoomRecommendationRequest,
  RoomRecommendationResponse,
} from "./room-contracts";

export type ClientMediaPreference = RecommendationMediaIdentity & {
  liked: boolean;
  mediaKey: string;
  revision: number;
};

export function queueItemRecommendationIdentity(
  item: RoomQueueItem | null | undefined,
) {
  if (!item?.sourceUrl || !item.sourceType) {
    return null;
  }

  return recommendationMediaIdentity({
    queueItemId: item.id,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
  });
}

export function buildRoomRecommendationRequest({
  candidates,
  currentItem,
  items,
  preferenceRevision = 0,
  roomId,
}: {
  candidates: RoomQueueItem[];
  currentItem: RoomQueueItem | null;
  items: RoomQueueItem[];
  preferenceRevision?: number;
  roomId: string;
}): RoomRecommendationRequest {
  const currentIdentity = queueItemRecommendationIdentity(currentItem);
  const candidateRows = candidates.flatMap((item) => {
    const identity = queueItemRecommendationIdentity(item);

    return identity
      ? [
          {
            ...identity,
            artist: item.artist,
            candidateId: item.id,
            channelName: item.channelName,
            isAvailable: !item.isUnavailable,
            playlistId: item.playlistId,
            title: item.title,
          },
        ]
      : [];
  });

  return {
    candidates: candidateRows,
    currentMedia: currentIdentity
      ? {
          ...currentIdentity,
          artist: currentItem?.artist,
          channelName: currentItem?.channelName,
          playlistId: currentItem?.playlistId,
        }
      : undefined,
    limit: 8,
    queuedMedia: identitiesForStatus(items, "queued"),
    recentHistory: identitiesForStatus(items, "played").slice(-160),
    revision: recommendationRevision({
      candidates: candidateRows,
      currentIdentity,
      items,
      preferenceRevision,
    }),
    roomId,
  };
}

export async function fetchRoomRecommendations(
  request: RoomRecommendationRequest,
) {
  try {
    const response = await fetch("/api/recommendations/room", {
      body: JSON.stringify(request),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json()) as RoomRecommendationResponse;

    return response.ok
      ? payload
      : {
          cache: "miss" as const,
          items: [],
          reason: payload.reason ?? "Recommendations are unavailable.",
          source: "fallback" as const,
          status: "unavailable" as const,
        };
  } catch {
    return {
      cache: "miss" as const,
      items: [],
      reason: "Recommendations are temporarily unavailable.",
      source: "fallback" as const,
      status: "unavailable" as const,
    };
  }
}

export async function fetchRoomMediaPreferences(roomId: string) {
  const response = await fetch(
    `/api/recommendations/preferences?roomId=${encodeURIComponent(roomId)}`,
    { cache: "no-store" },
  );
  const payload = (await response.json()) as {
    items?: ClientMediaPreference[];
  };

  if (!response.ok) {
    throw new PreferenceReadError(
      "Preferences are unavailable.",
      response.status,
      preferenceRetryAfterMs(response.headers.get("Retry-After")),
    );
  }

  return payload.items ?? [];
}

export class PreferenceReadError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null,
  ) {
    super(message);
    this.name = "PreferenceReadError";
  }
}

export function preferenceRetryAfterMs(value: string | null, now = Date.now()) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  const retryMs = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(value) - now;

  return Number.isFinite(retryMs) && retryMs > 0
    ? Math.min(60_000, Math.max(1_000, Math.ceil(retryMs)))
    : null;
}

export function preferenceRateLimitCooldownMs(
  retryAfterMs: number | null,
  failureCount: number,
) {
  if (retryAfterMs !== null) {
    return Math.min(60_000, Math.max(1_000, retryAfterMs));
  }

  const exponent = Math.max(0, Math.min(4, failureCount - 1));
  return Math.min(60_000, 5_000 * 2 ** exponent);
}

export async function updateRoomMediaPreference(input: {
  actionId: string;
  expectedRevision: number;
  liked: boolean;
  mediaId: string;
  roomId: string;
  sourceType: RecommendationMediaIdentity["sourceType"];
}) {
  const response = await fetch("/api/recommendations/preferences", {
    body: JSON.stringify(input),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const payload = (await response.json()) as {
    item?: ClientMediaPreference;
    reason?: string;
  };

  if (!response.ok || !payload.item) {
    throw new PreferenceMutationError(
      payload.reason ?? "Preference could not be updated.",
      response.status,
      payload.item,
    );
  }

  return payload.item;
}

export class PreferenceMutationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly current?: ClientMediaPreference,
  ) {
    super(message);
  }
}

function identitiesForStatus(
  items: RoomQueueItem[],
  status: RoomQueueItem["status"],
) {
  return items.flatMap((item) => {
    const identity =
      item.status === status ? queueItemRecommendationIdentity(item) : null;
    return identity ? [identity] : [];
  });
}

function recommendationRevision({
  candidates,
  currentIdentity,
  items,
  preferenceRevision,
}: {
  candidates: RoomRecommendationRequest["candidates"];
  currentIdentity: RecommendationMediaIdentity | null;
  items: RoomQueueItem[];
  preferenceRevision: number;
}) {
  const value = [
    currentIdentity ? recommendationMediaKey(currentIdentity) : "idle",
    ...items.map(
      (item) =>
        `${item.id}:${item.status}:${item.playedSequence ?? 0}:${
          item.isUnavailable ? 1 : 0
        }`,
    ),
    ...candidates.map((candidate) => recommendationMediaKey(candidate)),
    `preferences:${preferenceRevision}`,
  ].join("|");
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return `v1-${(hash >>> 0).toString(36)}`;
}
