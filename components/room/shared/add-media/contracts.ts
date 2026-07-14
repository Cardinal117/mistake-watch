import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import type { QueueAddInput } from "../../queue/contracts";

export type PlaylistPreview = YouTubePlaylistPreviewResponse;
export type PlaylistPreviewItem = YouTubePlaylistItem;
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

export function playlistItemKey(item: PlaylistPreviewItem) {
  return `${item.videoId}:${item.position}`;
}
