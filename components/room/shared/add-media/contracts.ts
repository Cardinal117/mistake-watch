import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import type { QueueAddInput } from "../../queue/contracts";

export type PlaylistPreview = YouTubePlaylistPreviewResponse;
export type PlaylistPreviewItem = YouTubePlaylistItem;
export type PlaylistItemKey = `${string}:${number}`;
export type DuplicatePreference = "allow" | "warn";
export type PendingDuplicateAdd =
  | { kind: "single"; item: QueueAddInput }
  | {
      items: PlaylistPreviewItem[];
      kind: "playlist";
      playlistId?: string | null;
      playlistTitle?: string | null;
      skippedUnavailable: number;
    };

export function playlistItemKey(item: PlaylistPreviewItem): PlaylistItemKey {
  return `${item.videoId}:${item.position}`;
}

export function playlistItemKeys(items: PlaylistPreviewItem[]) {
  return new Set(
    items
      .filter((item) => !item.isUnavailable)
      .map((item) => playlistItemKey(item)),
  );
}

export function playlistItemsForSelection(
  items: PlaylistPreviewItem[],
  selectedKeys: ReadonlySet<PlaylistItemKey>,
) {
  return items.filter((item) => selectedKeys.has(playlistItemKey(item)));
}

export function arePlaylistItemsSelected(
  items: PlaylistPreviewItem[],
  selectedKeys: ReadonlySet<PlaylistItemKey>,
) {
  return (
    items.length > 0 &&
    items.every((item) => selectedKeys.has(playlistItemKey(item)))
  );
}

export function updatePlaylistItemSelection(
  selectedKeys: ReadonlySet<PlaylistItemKey>,
  items: PlaylistPreviewItem[],
  selected: boolean,
) {
  const next = new Set(selectedKeys);

  for (const item of items) {
    const rowKey = playlistItemKey(item);
    if (selected) next.add(rowKey);
    else next.delete(rowKey);
  }

  return next;
}
