import type { RoomQueueItem } from "@/lib/rooms";
import {
  isDiscoverSuppressed,
  type DiscoverFeedback,
  type DiscoverItem,
} from "./discover-contracts";

export type PersonalTrack = RoomQueueItem & {
  completedPlayCount?: number;
  liked?: boolean;
  lastCompletedAt?: string | null;
};

export function discoverItemToTrack(item: DiscoverItem): PersonalTrack {
  return {
    ...item,
    id: `personal:${item.mediaId}`,
    videoId: item.mediaId,
    sourceUrl: `https://www.youtube.com/watch?v=${item.mediaId}`,
    addedBy: "Personal library",
    status: "played",
    duration: "",
  };
}

export function personalShelves(
  items: DiscoverItem[],
  feedback: DiscoverFeedback[],
  now = Date.now(),
) {
  const blocked = new Set(
    feedback.filter((f) => isDiscoverSuppressed(f, now)).map((f) => f.mediaId),
  );
  const eligible = items.filter((item) => !blocked.has(item.mediaId));
  const regulars = [...eligible].sort(
    (a, b) =>
      Number(b.liked) - Number(a.liked) ||
      b.completedPlayCount - a.completedPlayCount ||
      a.mediaId.localeCompare(b.mediaId),
  );
  const rediscover = eligible
    .filter(
      (item) =>
        item.completedPlayCount > 0 &&
        item.lastCompletedAt &&
        Date.parse(item.lastCompletedAt) < now - 7 * 86400000,
    )
    .sort(
      (a, b) =>
        Date.parse(a.lastCompletedAt!) - Date.parse(b.lastCompletedAt!) ||
        b.completedPlayCount - a.completedPlayCount,
    );
  return {
    regulars: regulars.map(discoverItemToTrack),
    rediscover: rediscover.map(discoverItemToTrack),
    blocked,
  };
}

export function queuedPersonalTrack(
  item: RoomQueueItem,
  queue: RoomQueueItem[],
) {
  return queue.find(
    (q) =>
      q.status !== "played" &&
      (item.videoId && q.videoId
        ? item.videoId === q.videoId
        : item.sourceUrl === q.sourceUrl),
  );
}
