import type { RoomQueueItem } from "@/lib/rooms";

export type ListenDiscoveryTab =
  | "for-you"
  | "playlist"
  | "recommended"
  | "top-listened";

export type ListenDiscoverySource =
  | "provider"
  | "provider-limited"
  | "room-history"
  | "room-queue"
  | "unavailable";

export type ListenDiscoveryResult = {
  emptyMessage: string;
  items: RoomQueueItem[];
  source: ListenDiscoverySource;
  sourceLabel: string;
};

export type ListenDiscoveryShelfId =
  | "room-picks"
  | "because-listened"
  | "recently-played"
  | "room-playlists"
  | "most-listened";

export type ListenDiscoveryShelf = {
  id: ListenDiscoveryShelfId;
  items: RoomQueueItem[];
  message?: string;
  source: ListenDiscoverySource;
  sourceLabel: string;
  title: string;
};

export type ListenSessionInsight = {
  label: string;
  value: string;
};

export function buildListenDiscoveryShelves({
  currentItem,
  items,
  providerItems = [],
  providerRankedEmpty = false,
  providerUnavailable = false,
  roomName,
}: {
  currentItem: RoomQueueItem | null;
  items: RoomQueueItem[];
  providerItems?: RoomQueueItem[];
  providerRankedEmpty?: boolean;
  providerUnavailable?: boolean;
  roomName: string;
}): ListenDiscoveryShelf[] {
  const roomPicks = getForYouItems(items, currentItem);
  const roomRelated = getRecommendedFromRoom(items, currentItem);
  const providerRelated = uniqueByPlayableSource(providerItems).slice(0, 8);
  const contextualItems = providerRankedEmpty
    ? []
    : providerRelated.length > 0
      ? providerRelated
      : roomRelated;
  const recentlyPlayed = uniqueByPlayableSource(
    items.filter(
      (item) => item.status === "played" && item.id !== currentItem?.id,
    ),
  ).slice(0, 8);
  const playlistItems = getPlaylistLikeItems(items, currentItem);
  const mostListened = getTopListenedItems(items);
  const seedTitle = currentItem?.title?.trim();
  const safeRoomName = roomName.trim() || "this room";
  const candidates: ListenDiscoveryShelf[] = [
    {
      id: "room-picks",
      items: roomPicks,
      source: "room-queue",
      sourceLabel: "Queue based",
      title: "Room picks",
    },
    {
      id: "because-listened",
      items: contextualItems,
      message: providerUnavailable
        ? "Provider suggestions are unavailable, so these picks use room history."
        : undefined,
      source:
        providerRelated.length > 0
          ? "provider"
          : providerUnavailable
            ? "provider-limited"
            : "room-history",
      sourceLabel:
        providerRelated.length > 0
          ? "Mistake Watch ranking"
          : providerUnavailable
            ? "Provider limited - room history"
            : "Room history",
      title: seedTitle
        ? `Because you listened to ${seedTitle}`
        : "Recommended for this room",
    },
    {
      id: "recently-played",
      items: recentlyPlayed,
      source: "room-history",
      sourceLabel: "Room history",
      title: `Recently played in ${safeRoomName}`,
    },
    {
      id: "room-playlists",
      items: playlistItems,
      source: "room-history",
      sourceLabel: "Room playlist history",
      title: "From playlists in this room",
    },
    {
      id: "most-listened",
      items: mostListened,
      source: "room-history",
      sourceLabel: "Host room history",
      title: `Most listened in ${safeRoomName}`,
    },
  ];

  return suppressEarlierShelfRepeats(candidates).filter(
    (shelf) => shelf.items.length > 0,
  );
}

export function buildListenDiscoveryResult({
  activeTab,
  currentItem,
  items,
  providerItems = [],
  providerRankedEmpty = false,
  providerUnavailable = false,
}: {
  activeTab: ListenDiscoveryTab;
  currentItem: RoomQueueItem | null;
  items: RoomQueueItem[];
  providerItems?: RoomQueueItem[];
  providerRankedEmpty?: boolean;
  providerUnavailable?: boolean;
}): ListenDiscoveryResult {
  const playableProviderItems = uniqueByPlayableSource(providerItems);

  if (activeTab === "recommended" && providerRankedEmpty) {
    return {
      emptyMessage: "No new recommendations match this room yet.",
      items: [],
      source: "provider",
      sourceLabel: "Mistake Watch ranking",
    };
  }

  if (activeTab === "recommended" && playableProviderItems.length > 0) {
    return {
      emptyMessage: "Provider suggestions are unavailable right now.",
      items: playableProviderItems.slice(0, 8),
      source: "provider",
      sourceLabel: "YouTube search",
    };
  }

  switch (activeTab) {
    case "recommended": {
      const itemsFromRoom = getRecommendedFromRoom(items, currentItem);

      return {
        emptyMessage: providerUnavailable
          ? "Provider recommendations are unavailable. Add more room history to build local suggestions."
          : "Add more songs to build recommendations from this room.",
        items: itemsFromRoom,
        source: providerUnavailable ? "provider-limited" : "room-history",
        sourceLabel: providerUnavailable
          ? "Provider limited - room history"
          : "Room history",
      };
    }
    case "top-listened": {
      const topListened = getTopListenedItems(items);

      return {
        emptyMessage:
          "Most listened needs played room history. Later this will combine listening history from accounts in the room.",
        items: topListened,
        source: "room-history",
        sourceLabel: "Host room history",
      };
    }
    case "playlist": {
      const playlistItems = getPlaylistLikeItems(items, currentItem);

      return {
        emptyMessage:
          "Account playlists are not connected yet. Room playlist and history matches appear here for now.",
        items: playlistItems,
        source: playlistItems.length > 0 ? "room-history" : "unavailable",
        sourceLabel:
          playlistItems.length > 0
            ? "Room playlist/history"
            : "Accounts required",
      };
    }
    case "for-you":
    default:
      return {
        emptyMessage:
          "Add media to build room picks from the current queue and history.",
        items: getForYouItems(items, currentItem),
        source: "room-queue",
        sourceLabel: "Queue based",
      };
  }
}

export function buildListenSessionInsights(
  items: RoomQueueItem[],
): ListenSessionInsight[] {
  const playable = items.filter((item) => !item.isUnavailable);
  const queued = playable.filter((item) => item.status === "queued");
  const played = playable.filter((item) => item.status === "played");
  const contributors = new Set(
    playable.map((item) => item.addedBy.trim()).filter(Boolean),
  );
  const dominantArtist = mostCommon(
    playable
      .map((item) => item.artist ?? item.channelName)
      .filter((value): value is string => Boolean(value?.trim())),
  );

  return [
    {
      label: "Session",
      value:
        playable.length > 0
          ? `${queued.length} upcoming / ${played.length} played`
          : "Awaiting media",
    },
    {
      label: "Pattern",
      value: dominantArtist ? `Leaning ${dominantArtist}` : "Not enough signal",
    },
    {
      label: "Contributors",
      value:
        contributors.size > 0
          ? `${contributors.size} active`
          : "No queue additions",
    },
  ];
}

function getForYouItems(
  items: RoomQueueItem[],
  currentItem: RoomQueueItem | null,
) {
  return uniqueByPlayableSource([
    ...items.filter((item) => item.status === "queued" && item.isPlayNext),
    ...items.filter((item) => item.status === "queued" && item.isPinned),
    ...items.filter((item) => item.status === "queued"),
    ...items.filter(
      (item) => item.status === "played" && item.id !== currentItem?.id,
    ),
  ]).slice(0, 8);
}

function getRecommendedFromRoom(
  items: RoomQueueItem[],
  currentItem: RoomQueueItem | null,
) {
  if (!currentItem) {
    return getForYouItems(items, null);
  }

  const related = items.filter(
    (item) =>
      item.id !== currentItem.id &&
      (sameValue(item.artist, currentItem.artist) ||
        sameValue(item.channelName, currentItem.channelName) ||
        sameValue(item.playlistId, currentItem.playlistId)),
  );

  return uniqueByPlayableSource([
    ...related.filter((item) => item.status === "queued"),
    ...related.filter((item) => item.status === "played"),
    ...getForYouItems(items, currentItem),
  ]).slice(0, 8);
}

function getTopListenedItems(items: RoomQueueItem[]) {
  const scored = new Map<
    string,
    {
      item: RoomQueueItem;
      score: number;
    }
  >();

  for (const item of items) {
    if (item.isUnavailable) {
      continue;
    }

    const key = item.videoId ?? item.sourceUrl ?? item.title;
    const current = scored.get(key);
    const score = item.status === "played" ? 3 : item.status === "now" ? 2 : 1;

    if (!current || score > current.score) {
      scored.set(key, {
        item,
        score,
      });
    } else {
      current.score += score;
    }
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
    .slice(0, 8);
}

function getPlaylistLikeItems(
  items: RoomQueueItem[],
  currentItem: RoomQueueItem | null,
) {
  const currentPlaylistId = currentItem?.playlistId;
  const playlistItems = currentPlaylistId
    ? items.filter((item) => item.playlistId === currentPlaylistId)
    : items.filter((item) => item.playlistId);

  return uniqueByPlayableSource(playlistItems).slice(0, 8);
}

function uniqueByPlayableSource(items: RoomQueueItem[]) {
  const seen = new Set<string>();
  const result: RoomQueueItem[] = [];

  for (const item of items) {
    if (item.isUnavailable) {
      continue;
    }

    const key = item.videoId ?? item.sourceUrl ?? item.id;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function suppressEarlierShelfRepeats(shelves: ListenDiscoveryShelf[]) {
  const shown = new Set<string>();

  return shelves.map((shelf) => {
    const uniqueItems = uniqueByPlayableSource(shelf.items);
    const alternatives = uniqueItems.filter(
      (item) => !shown.has(getPlayableSourceKey(item)),
    );
    const visibleItems = alternatives.length > 0 ? alternatives : uniqueItems;

    for (const item of visibleItems) {
      shown.add(getPlayableSourceKey(item));
    }

    return {
      ...shelf,
      items: visibleItems.slice(0, 8),
    };
  });
}

function getPlayableSourceKey(item: RoomQueueItem) {
  return item.videoId ?? item.sourceUrl ?? item.id;
}

function sameValue(first?: string | null, second?: string | null) {
  const normalizedFirst = normalize(first);
  const normalizedSecond = normalize(second);

  return Boolean(
    normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond,
  );
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
