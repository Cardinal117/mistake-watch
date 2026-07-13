export type QueueDerivedItem = {
  id: string;
  playedSequence?: number;
  status: "now" | "played" | "queued";
};

export type DerivedQueueState<T extends QueueDerivedItem> = {
  currentItem: T | null;
  playedItems: T[];
  playedItemsBySequence: T[];
  queuedIndexById: Map<string, number>;
  queuedItems: T[];
  upcomingItems: T[];
};

export function deriveQueueState<T extends QueueDerivedItem>(
  items: readonly T[],
): DerivedQueueState<T> {
  let currentItem: T | null = null;
  const playedItems: T[] = [];
  const queuedItems: T[] = [];
  const upcomingItems: T[] = [];
  const queuedIndexById = new Map<string, number>();

  for (const item of items) {
    if (item.status === "played") {
      playedItems.push(item);
      continue;
    }

    upcomingItems.push(item);

    if (item.status === "now") {
      currentItem ??= item;
      continue;
    }

    queuedIndexById.set(item.id, queuedItems.length);
    queuedItems.push(item);
  }

  const playedItemsBySequence = [...playedItems].sort(
    (first, second) =>
      (first.playedSequence ?? 0) - (second.playedSequence ?? 0),
  );

  return {
    currentItem,
    playedItems,
    playedItemsBySequence,
    queuedIndexById,
    queuedItems,
    upcomingItems,
  };
}
