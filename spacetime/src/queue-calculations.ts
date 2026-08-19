export type QueueCalculationItem = {
  is_pinned: boolean;
  is_play_next: boolean;
  played_sequence?: number;
  position: number;
  queue_item_id: string;
  status: string;
};

export type QueueAdvancePatch = {
  is_play_next?: boolean;
  played_sequence?: number;
  position?: number;
  queue_item_id: string;
  status?: string;
};

export function sortQueueItems<T extends QueueCalculationItem>(
  items: readonly T[],
) {
  return [...items].sort((a, b) => a.position - b.position);
}

export function selectActiveQueueItems<T extends QueueCalculationItem>(
  items: readonly T[],
) {
  return sortQueueItems(
    items.filter(
      (item) => item.status === "queued" || item.status === "playing",
    ),
  );
}

export function selectQueuedQueueItems<T extends QueueCalculationItem>(
  items: readonly T[],
) {
  return selectActiveQueueItems(items).filter(
    (item) => item.status === "queued",
  );
}

export function calculateNextQueuePosition(
  items: readonly QueueCalculationItem[],
) {
  return items.length > 0
    ? Math.max(...items.map((item) => item.position)) + 1
    : 0;
}

export function calculateNextPlayedSequence(
  items: readonly QueueCalculationItem[],
) {
  const playedSequences = items.map((item) => item.played_sequence ?? 0);
  return playedSequences.length > 0 ? Math.max(...playedSequences) + 1 : 1;
}

export function calculatePlayNextQueuePosition(
  items: readonly QueueCalculationItem[],
  excludeQueueItemId?: string,
) {
  const lockedPositions = items
    .filter(
      (item) =>
        item.queue_item_id !== excludeQueueItemId &&
        (item.is_pinned || item.is_play_next),
    )
    .map((item) => item.position);
  return lockedPositions.length > 0 ? Math.max(...lockedPositions) + 1 : 0;
}

export function calculateQueueAdvancePatches<T extends QueueCalculationItem>(
  items: readonly T[],
  nextQueueItemId: string,
  nextPlayedSequence: number,
  preserveCurrentAsNext = false,
): QueueAdvancePatch[] {
  const nextQueueItem = items.find(
    (item) => item.queue_item_id === nextQueueItemId,
  );

  if (!nextQueueItem) {
    return [];
  }

  const currentQueueItem = items.find(
    (item) =>
      item.queue_item_id !== nextQueueItemId && item.status === "playing",
  );
  const patches: QueueAdvancePatch[] = [];

  if (
    preserveCurrentAsNext &&
    nextQueueItem.status === "played" &&
    currentQueueItem
  ) {
    for (const item of items) {
      if (item.status === "queued") {
        patches.push({
          position: item.position + 1,
          queue_item_id: item.queue_item_id,
        });
      }
    }

    patches.push({
      is_play_next: false,
      played_sequence: 0,
      position: 0,
      queue_item_id: currentQueueItem.queue_item_id,
      status: "queued",
    });
  } else if (currentQueueItem) {
    patches.push({
      played_sequence: nextPlayedSequence,
      queue_item_id: currentQueueItem.queue_item_id,
      status: "played",
    });
  }

  patches.push({
    is_play_next: false,
    played_sequence: 0,
    queue_item_id: nextQueueItem.queue_item_id,
    status: "playing",
  });

  return patches;
}
