import type { UploadedCatalogueAccess } from "./uploaded-catalogue-access";

export type MediaLibraryAsset = {
  contentUrl: string | null;
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
  sourceMatches: MediaSourceMatch[];
  status: string;
  thumbnailUrl: string | null;
  title: string;
  visibility: string;
  waveformPeaksUrl: string | null;
  waveformStatus: string;
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

export type MediaLibraryAccess = UploadedCatalogueAccess & {
  canAccessUploadedCatalogue: boolean;
};

export type MediaFolderSortDirection = "asc" | "desc";
export type MediaFolderSortKey = "created_at" | "duration_seconds" | "name";
export type MediaVisibility = "owner_only" | "public";

export type MediaSourceMatch = {
  sourceId: string;
  sourceType: string;
  status: string;
};

export type CreateUploadInput = {
  folderId?: string | null;
  folderName?: string | null;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export type MultipartUploadPart = {
  etag: string;
  partNumber: number;
};

export type ResumableMediaUploadSession = {
  bytesUploaded: number;
  completedParts: MultipartUploadPart[];
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

export class MediaAssetError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "MediaAssetError";
    this.status = status;
  }
}
