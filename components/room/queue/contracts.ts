import type { QueueMode } from "@/lib/queue/model";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomError } from "@/lib/spacetime";

export type SourceLoadInput = {
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
};

export type QueueAddInput = SourceLoadInput & {
  artist?: string;
  channelName?: string;
  durationSeconds?: number;
  isPinned?: boolean;
  isPlayNext?: boolean;
  isUnavailable?: boolean;
  allowDuplicate?: boolean;
  playlistId?: string;
  playlistTitle?: string;
  thumbnailUrl?: string;
};

export type QueuePanelProps = {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  connectionStatus?: string;
  id?: string;
  items: RoomQueueItem[];
  mode?: "watch" | "listen";
  onAddQueueItem?(input: QueueAddInput): void;
  onClearQueue?(): void;
  onLoadSource?(input: SourceLoadInput): void;
  onMoveQueueItem?(queueItemId: string, position: number): void;
  onPlayQueueItem?(queueItemId: string): void;
  onQueueItemPriorityChange?(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onQueueModeChange?(mode: QueueMode): void;
  onRemoveQueueItem?(queueItemId: string): void;
  presentation?: "default" | "hub";
  queueMode?: QueueMode;
  roomErrors?: LiveRoomError[];
  roomId: string;
};

export type QueueNotification = {
  id: string;
  message: string;
  tone: "error" | "info" | "success" | "warning";
};
