import { useMemo } from "react";
import type { RoomQueueItem } from "@/lib/rooms";

export function queuedIndices(items: RoomQueueItem[]) {
  return new Map(
    items
      .filter((item) => item.status === "queued")
      .map((item, index) => [item.id, index]),
  );
}

function matchingQueueItems(items: RoomQueueItem[], query: string) {
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    const searchable =
      `${item.title} ${item.artist ?? ""} ${item.channelName ?? ""}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function useMatchingQueueItems(items: RoomQueueItem[], query: string) {
  return useMemo(() => matchingQueueItems(items, query), [items, query]);
}
