import type { RoomQueueItem } from "../rooms/types";
import { parseYouTubeVideoId } from "../player/source";

export function queueSourceKey(
  item: Pick<RoomQueueItem, "sourceType" | "sourceUrl" | "videoId">,
): string | null {
  if (item.sourceType === "youtube") {
    const id = item.videoId || parseYouTubeVideoId(item.sourceUrl ?? "");
    return id ? `youtube:${id}` : null;
  }
  return item.sourceType && item.sourceUrl
    ? `${item.sourceType}:${item.sourceUrl}`
    : null;
}

export function activeQueueSourceCounts(
  items: readonly RoomQueueItem[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const occurrences = new Set<string>();
  for (const item of items) {
    if (item.status === "played" || occurrences.has(item.id)) continue;
    occurrences.add(item.id);
    const key = queueSourceKey(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
