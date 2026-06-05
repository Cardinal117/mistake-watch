export type QueueItemStatus = "queued" | "playing" | "played" | "removed";

export type QueueModelItem = {
  isUnavailable?: boolean;
  queueItemId: string;
  position: number;
  status: QueueItemStatus;
};

export type QueueMode =
  | "autoplayRelated"
  | "loop"
  | "normal"
  | "shuffle"
  | "smartShuffle";

export type SmartShuffleItem = QueueModelItem & {
  artist?: string | null;
  channelName?: string | null;
  isPinned?: boolean;
  isPlayNext?: boolean;
  playlistId?: string | null;
  playlistTitle?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
  videoId?: string | null;
};

export function normalizeQueuePosition(position: number, maxLength: number) {
  if (!Number.isFinite(position)) {
    return maxLength;
  }

  return Math.min(Math.max(0, Math.trunc(position)), maxLength);
}

export function nextQueuePosition(items: QueueModelItem[]) {
  const activePositions = items
    .filter((item) => item.status === "queued" || item.status === "playing")
    .map((item) => item.position);

  return activePositions.length > 0 ? Math.max(...activePositions) + 1 : 0;
}

export function playNextQueuePosition(items: SmartShuffleItem[]) {
  const lockedPositions = items
    .filter(
      (item) =>
        item.status === "queued" &&
        !item.isUnavailable &&
        (item.isPinned || item.isPlayNext),
    )
    .map((item) => item.position);

  return lockedPositions.length > 0 ? Math.max(...lockedPositions) + 1 : 0;
}

export function reorderQueuedItems(
  items: QueueModelItem[],
  queueItemId: string,
  targetPosition: number,
) {
  const queuedItems = items
    .filter((item) => item.status === "queued")
    .sort((a, b) => a.position - b.position);
  const movingItem = queuedItems.find(
    (item) => item.queueItemId === queueItemId,
  );

  if (!movingItem) {
    return queuedItems.map((item, index) => ({
      ...item,
      position: index,
    }));
  }

  const withoutMoving = queuedItems.filter(
    (item) => item.queueItemId !== queueItemId,
  );
  const insertAt = normalizeQueuePosition(targetPosition, withoutMoving.length);

  withoutMoving.splice(insertAt, 0, movingItem);

  return withoutMoving.map((item, index) => ({
    ...item,
    position: index,
  }));
}

export function markQueueItemPlaying(
  items: QueueModelItem[],
  queueItemId: string,
) {
  return items.map((item) => {
    if (item.queueItemId === queueItemId) {
      return {
        ...item,
        status: "playing" as const,
      };
    }

    if (item.status === "playing") {
      return {
        ...item,
        status: "played" as const,
      };
    }

    return item;
  });
}

export function getNextQueuedItemId(items: QueueModelItem[]) {
  return [...items]
    .filter((item) => item.status === "queued" && !item.isUnavailable)
    .sort((a, b) => a.position - b.position)[0]?.queueItemId;
}

export function getNextQueueItemIdForMode(
  items: QueueModelItem[],
  mode: QueueMode,
) {
  const queuedItemId = getNextQueuedItemId(items);

  if (queuedItemId || mode !== "loop") {
    return queuedItemId;
  }

  return [...items]
    .filter((item) => item.status === "played" && !item.isUnavailable)
    .sort((a, b) => a.position - b.position)[0]?.queueItemId;
}

export function shuffleUpcomingQueue<T extends QueueModelItem>(items: T[]) {
  return deterministicShuffle(
    items
      .filter((item) => item.status === "queued" && !item.isUnavailable)
      .sort((a, b) => a.position - b.position),
  ).map((item, index) => ({
    ...item,
    position: index,
  }));
}

export function smartShuffleQueue<T extends SmartShuffleItem>(
  items: T[],
  history: T[] = [],
) {
  const upcoming = items
    .filter((item) => item.status === "queued" && !item.isUnavailable)
    .sort((a, b) => a.position - b.position);
  const locked = upcoming.filter((item) => item.isPinned || item.isPlayNext);
  const pool = upcoming.filter((item) => !item.isPinned && !item.isPlayNext);
  const result = [...locked];
  let previousItem = result.at(-1) ?? history.at(-1) ?? null;

  while (pool.length > 0) {
    const ranked = pool
      .map((candidate) => ({
        candidate,
        score: scoreSmartShuffleCandidate(candidate, previousItem, history),
      }))
      .sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }

        return stableItemKey(a.candidate).localeCompare(
          stableItemKey(b.candidate),
        );
      });
    const selectionPool = ranked.slice(0, Math.min(3, ranked.length));
    const selected =
      selectionPool[
        stableHash(`${previousItem?.queueItemId ?? "start"}:${pool.length}`) %
          selectionPool.length
      ].candidate;
    const selectedIndex = pool.findIndex(
      (item) => item.queueItemId === selected.queueItemId,
    );

    result.push(selected);
    pool.splice(selectedIndex, 1);
    previousItem = selected;
  }

  return result.map((item, index) => ({
    ...item,
    position: index,
  }));
}

export function scoreSmartShuffleCandidate(
  candidate: SmartShuffleItem,
  previousItem: SmartShuffleItem | null,
  history: SmartShuffleItem[] = [],
) {
  let score = stableHash(stableItemKey(candidate)) % 7;

  if (!previousItem) {
    return score;
  }

  if (sameNormalizedValue(candidate.artist, previousItem.artist)) {
    score += 40;
  }

  if (sameNormalizedValue(candidate.channelName, previousItem.channelName)) {
    score += 30;
  }

  if (sameNormalizedValue(candidate.playlistId, previousItem.playlistId)) {
    score += 12;
  }

  if (sameNormalizedValue(candidate.title, previousItem.title)) {
    score += 20;
  } else if (similarTitle(candidate.title, previousItem.title)) {
    score += 10;
  }

  const recent = history.slice(-5);

  if (
    recent.some(
      (item) =>
        item.videoId === candidate.videoId ||
        sameNormalizedValue(item.title, candidate.title),
    )
  ) {
    score += 18;
  }

  return score;
}

function deterministicShuffle<T extends QueueModelItem>(items: T[]) {
  return [...items].sort((a, b) => {
    const aHash = stableHash(stableItemKey(a));
    const bHash = stableHash(stableItemKey(b));

    return aHash - bHash;
  });
}

function sameNormalizedValue(
  first: string | null | undefined,
  second: string | null | undefined,
) {
  const normalizedFirst = normalizeComparable(first);
  const normalizedSecond = normalizeComparable(second);

  return Boolean(
    normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond,
  );
}

function similarTitle(
  first: string | null | undefined,
  second: string | null | undefined,
) {
  const normalizedFirst = normalizeComparable(first);
  const normalizedSecond = normalizeComparable(second);

  if (!normalizedFirst || !normalizedSecond) {
    return false;
  }

  const firstWords = new Set(normalizedFirst.split(" ").filter(Boolean));
  const secondWords = normalizedSecond.split(" ").filter(Boolean);
  const shared = secondWords.filter((word) => firstWords.has(word)).length;

  return shared >= 3;
}

function normalizeComparable(value: string | null | undefined) {
  return value
    ?.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableItemKey(item: Partial<SmartShuffleItem>) {
  return (
    item.videoId ??
    item.queueItemId ??
    item.title ??
    item.sourceUrl ??
    `${item.position ?? 0}`
  );
}

function stableHash(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}
