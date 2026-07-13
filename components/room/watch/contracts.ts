import type { RefObject } from "react";

import type { AccountSummary } from "@/lib/account/types";
import type { SignalDisplayState } from "@/lib/status/display-state";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";

export type WatchModeLayoutProps = {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
  stageRef: RefObject<HTMLDivElement | null>;
};

export type WatchSurfaceId = "audience" | "queue";

export type MediaLibraryAsset = {
  createdAt: string;
  durationSeconds: number | null;
  fileSizeBytes: number;
  folderId: string | null;
  id: string;
  isLive: boolean;
  mediaKind: string;
  mimeType: string;
  posterStatus: string;
  processingDecisionReason: string | null;
  processingEstimatedCredits: number | null;
  processingErrorMessage: string | null;
  processingJobId: string | null;
  processingRequiresApproval: boolean;
  processingStatus: string;
  processingStrategy: string;
  publicUrl: string;
  sourceMatches: Array<{
    sourceId: string;
    sourceType: string;
    status: string;
  }>;
  status: string;
  thumbnailObjectKey: string | null;
  thumbnailUrl: string | null;
  title: string;
  visibility: string;
  waveformPeaksUrl: string | null;
  waveformStatus: string;
};

export type MediaLibraryAccess = {
  allowed: boolean;
  canAccessUploadedCatalogue: boolean;
  message: string;
  reason:
    | "active_allowlist"
    | "active_owner"
    | "disabled_account"
    | "guest"
    | "not_allowlisted"
    | "revoked_allowlist";
  scope: "allowlisted" | "none" | "owner";
};

export type MediaFolder = {
  createdAt: string;
  defaultSortDirection: MediaFolderSortDirection;
  defaultSortKey: MediaFolderSortKey;
  description: string | null;
  folderType: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
};

export type MediaFolderSortDirection = "asc" | "desc";
export type MediaFolderSortKey = "created_at" | "duration_seconds" | "name";

export type ClientMediaInspection = {
  audioCodecs: string[];
  container: string | null;
  isBrowserSafe: boolean;
  notes: string[];
  videoCodecs: string[];
};

export type WatchMediaHubItem = Omit<
  RoomQueueItem,
  "status"
> & {
  addedAt?: string;
  folderId?: string | null;
  isLive?: boolean;
  processingEstimatedCredits?: number | null;
  processingRequiresApproval?: boolean;
  processingStatus?: string;
  processingStrategy?: string;
  status: "library" | "now" | "played" | "queued";
  visibility?: string;
};

export type WatchMediaHubTab = "discover" | "uploads";
export type UploadedLibraryViewMode = "grid" | "list";

export type MultipartCompletedPart = {
  etag: string;
  partNumber: number;
};

export type ResumableMediaUpload = {
  bytesUploaded: number;
  completedParts: MultipartCompletedPart[];
  createdAt: string;
  errorMessage: string | null;
  fileName: string;
  fileSizeBytes: number;
  id: string;
  mimeType: string;
  partCount: number;
  partSizeBytes: number;
  progress: number;
  resumable: boolean;
  resumableUntil: string | null;
  status: "expired" | "failed" | "paused" | "uploading";
};

export type BatchUploadItemStatus =
  | "active"
  | "blocked"
  | "cancelled"
  | "failed"
  | "ready"
  | "waiting";

export type BatchUploadItem = {
  assetId?: string;
  displayState: SignalDisplayState;
  error?: string;
  file: File;
  fileName: string;
  fileSizeBytes: number;
  folderId: string | null;
  id: string;
  status: BatchUploadItemStatus;
};

export type QueueItemInput = {
  artist?: string;
  channelName?: string;
  durationSeconds?: number;
  isPlayNext?: boolean;
  playlistId?: string;
  playlistTitle?: string;
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
  thumbnailUrl?: string;
};

export type LoadSourceInput = {
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
};
