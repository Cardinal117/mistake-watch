import type { RoomQueueItem } from "@/lib/rooms";

export type ListenDiscoverySourceCommand = {
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
};

export type ListenDiscoveryQueueCommand = ListenDiscoverySourceCommand & {
  allowDuplicate: true;
  artist?: string;
  channelName?: string;
  durationSeconds?: number;
  isPlayNext: boolean;
  isUnavailable?: boolean;
  playlistId?: string;
  playlistTitle?: string;
  thumbnailUrl?: string;
};

export type ListenDiscoveryBrowseAction<ShelfId extends string = string> =
  | { shelfId: ShelfId; type: "open" }
  | { type: "close" };

export function queueItemToDiscoverySourceCommand(
  item: RoomQueueItem,
): ListenDiscoverySourceCommand {
  return {
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
  };
}

export function queueItemToDiscoveryQueueCommand(
  item: RoomQueueItem,
  options: { isPlayNext?: boolean } = {},
): ListenDiscoveryQueueCommand {
  return {
    allowDuplicate: true,
    artist: item.artist,
    channelName: item.channelName,
    durationSeconds: item.durationSeconds,
    isPlayNext: options.isPlayNext ?? false,
    isUnavailable: item.isUnavailable,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
    thumbnailUrl: item.thumbnailUrl,
  };
}

export function reduceListenDiscoveryBrowseState<ShelfId extends string>(
  state: ShelfId | null,
  action: ListenDiscoveryBrowseAction<ShelfId>,
): ShelfId | null {
  if (action.type === "close") {
    return null;
  }

  return action.shelfId || state;
}
