"use client";

import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomError, LiveRoomState } from "@/lib/spacetime";
import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";

export type ListenModeLayoutProps = {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
};
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
export type PlaylistPreview = YouTubePlaylistPreviewResponse;
export type PlaylistPreviewItem = YouTubePlaylistItem;
export type ListenNotification = {
  id: string;
  message: string;
  tone: "error" | "info" | "success" | "warning";
};
export type ListenTheme = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};
export type ListenTvSettings = {
  dimness: number;
  hideUiOnIdle: boolean;
  uiBrightness: number;
};
export const MIN_LISTEN_DRAWER_HEIGHT = 34;
export const MAX_LISTEN_DRAWER_HEIGHT = 88;
export const COMPACT_QUEUE_ROW_HEIGHT = 128;
export const DENSE_QUEUE_ROW_HEIGHT = 80;
export const DEFAULT_LISTEN_TV_SETTINGS: ListenTvSettings = {
  dimness: 28,
  hideUiOnIdle: false,
  uiBrightness: 92,
};
export const roomErrorToneBySeverity = {
  error: "error",
  info: "info",
  warning: "warning",
} satisfies Record<LiveRoomError["severity"], ListenNotification["tone"]>;
export function playlistItemKey(item: PlaylistPreviewItem) {
  return `${item.videoId}:${item.position}`;
}
export const DEFAULT_LISTEN_DRAWER_HEIGHT = 56;
export const DEFAULT_LISTEN_VOLUME = 100;
