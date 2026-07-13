"use client";

import type { Dispatch, SetStateAction } from "react";
import { FolderPlus, Upload } from "lucide-react";

import { MediaProcessingStatus } from "../../media-processing-status";
import {
  resolveMediaAssetDisplayState,
  resolveUploadProgressDisplayState,
} from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";
import { cx } from "@/lib/ui";
import type {
  BatchUploadItem,
  LoadSourceInput,
  MediaFolder,
  MediaLibraryAccess,
  MediaLibraryAsset,
  QueueItemInput,
  ResumableMediaUpload,
  UploadedLibraryViewMode,
  WatchMediaHubItem,
  WatchMediaHubTab,
} from "../contracts";
import { UploadedMediaLibrary } from "../library/uploaded-media-library";
import { BatchUploadQueue, ResumableUploadList } from "../uploads/upload-queue";
import {
  approveAssetProcessing,
  deleteAsset,
  moveAssetToFolder,
  updateAssetVisibility,
  updateFolderSort,
} from "./media-hub-helpers";
import {
  WatchMediaHubSection,
  type WatchMediaHubSectionConfig,
} from "./watch-media-hub-section";
import { pollMediaProcessing } from "../uploads/upload-transport";

type WatchMediaHubViewProps = {
  activeHubTab: WatchMediaHubTab;
  approveAllBlockedBatchUploads(): Promise<void>;
  approveBatchUploadConversion(itemId: string): void;
  assetError: string | null;
  batchPaused: boolean;
  batchUploads: BatchUploadItem[];
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  cancelBatchUpload(itemId: string): void;
  cancelUpload(session: ResumableMediaUpload): Promise<void>;
  cancelWaitingBatchUploads(): void;
  clearCompletedBatchUploads(): void;
  createFolder(): Promise<void>;
  discoverySections: WatchMediaHubSectionConfig[];
  dragActive: boolean;
  folderCreateStatus: {
    detail: string;
    tone: "error" | "info" | "success";
  } | null;
  folders: MediaFolder[];
  handleFiles(files: FileList | File[]): void;
  isOwner: boolean;
  libraryAccess: MediaLibraryAccess | null;
  libraryItems: WatchMediaHubItem[];
  newFolderName: string;
  onAddQueueItem?(input: QueueItemInput): void;
  onLoadSource?(input: LoadSourceInput): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  recoverableProgress: Record<string, SignalDisplayState>;
  resumableUploads: ResumableMediaUpload[];
  resumeUpload(session: ResumableMediaUpload): Promise<void>;
  retryBatchUpload(itemId: string): void;
  roomId: string;
  selectedFolderId: string;
  setActiveHubTab: Dispatch<SetStateAction<WatchMediaHubTab>>;
  setAssets: Dispatch<SetStateAction<MediaLibraryAsset[]>>;
  setBatchUploadPaused(paused: boolean): void;
  setDragActive: Dispatch<SetStateAction<boolean>>;
  setFolders: Dispatch<SetStateAction<MediaFolder[]>>;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  setSelectedFolderId: Dispatch<SetStateAction<string>>;
  setUploadedSearchQuery: Dispatch<SetStateAction<string>>;
  setUploadedViewMode: Dispatch<SetStateAction<UploadedLibraryViewMode>>;
  setUploadFolderId: Dispatch<SetStateAction<string>>;
  setUploadStatus: Dispatch<SetStateAction<SignalDisplayState | null>>;
  sortedLibraryItems: WatchMediaHubItem[];
  uploadedSearchQuery: string;
  uploadedViewMode: UploadedLibraryViewMode;
  uploadFolderId: string;
  uploadStatus: SignalDisplayState | null;
};

export function WatchMediaHubView({
  activeHubTab,
  approveAllBlockedBatchUploads,
  approveBatchUploadConversion,
  assetError,
  batchPaused,
  batchUploads,
  canAddQueue,
  canLoadSource,
  canManageQueue,
  cancelBatchUpload,
  cancelUpload,
  cancelWaitingBatchUploads,
  clearCompletedBatchUploads,
  createFolder,
  discoverySections,
  dragActive,
  folderCreateStatus,
  folders,
  handleFiles,
  isOwner,
  libraryAccess,
  libraryItems,
  newFolderName,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  recoverableProgress,
  resumableUploads,
  resumeUpload,
  retryBatchUpload,
  roomId,
  selectedFolderId,
  setActiveHubTab,
  setAssets,
  setBatchUploadPaused,
  setDragActive,
  setFolders,
  setNewFolderName,
  setSelectedFolderId,
  setUploadedSearchQuery,
  setUploadedViewMode,
  setUploadFolderId,
  setUploadStatus,
  sortedLibraryItems,
  uploadedSearchQuery,
  uploadedViewMode,
  uploadFolderId,
  uploadStatus,
}: WatchMediaHubViewProps) {
  return (
    <div className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-md border border-white/10 bg-background/8 p-3 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.025)] [scrollbar-width:thin]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="technical-label text-primary-fixed-dim">Media</p>
          <h3 className="mt-1 text-body-lg font-semibold text-on-surface">
            Watch media hub
          </h3>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/10 bg-background/20 text-label-sm">
          <button
            className={cx(
              "px-3 py-2 font-semibold transition",
              activeHubTab === "discover"
                ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            onClick={() => setActiveHubTab("discover")}
            type="button"
          >
            Discovery
          </button>
          <button
            className={cx(
              "px-3 py-2 font-semibold transition",
              activeHubTab === "uploads"
                ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            onClick={() => setActiveHubTab("uploads")}
            type="button"
          >
            Uploaded
          </button>
        </div>
      </div>

      {activeHubTab === "uploads" ? (
        <>
          {isOwner ? (
            <section className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="grid gap-1 text-label-sm text-on-surface-variant">
                  Upload into folder
                  <select
                    className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-on-surface outline-none focus:border-primary-fixed-dim/60"
                    onChange={(event) => setUploadFolderId(event.target.value)}
                    value={uploadFolderId}
                  >
                    <option value="">Unsorted</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-1 text-label-sm text-on-surface-variant">
                  <span>New folder</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-on-surface outline-none focus:border-primary-fixed-dim/60"
                      onChange={(event) => setNewFolderName(event.target.value)}
                      placeholder="Minecraft playthrough"
                      value={newFolderName}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/40 bg-primary-fixed-dim/12 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/18 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!newFolderName.trim()}
                      onClick={createFolder}
                      type="button"
                    >
                      <FolderPlus className="h-4 w-4" aria-hidden />
                      Create
                    </button>
                  </div>
                  {folderCreateStatus ? (
                    <span
                      className={cx(
                        "text-[11px]",
                        folderCreateStatus.tone === "error"
                          ? "text-error"
                          : folderCreateStatus.tone === "success"
                            ? "text-primary-fixed-dim"
                            : "text-on-surface-variant",
                      )}
                    >
                      {folderCreateStatus.detail}
                    </span>
                  ) : null}
                </div>
              </div>
              <label
                className={cx(
                  "group grid cursor-pointer gap-3 rounded-md border border-dashed p-4 text-left transition md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center",
                  dragActive
                    ? "border-primary-fixed-dim/80 bg-primary-fixed-dim/14 shadow-[inset_0_0_28px_rgb(0_219_233_/_0.12)]"
                    : "border-primary-fixed-dim/35 bg-primary-fixed-dim/7 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.055)] hover:border-primary-fixed-dim/60 hover:bg-primary-fixed-dim/10",
                )}
                htmlFor="watch-media-upload"
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  handleFiles(event.dataTransfer.files);
                }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md border border-primary-fixed-dim/35 bg-background/22 text-primary-fixed-dim shadow-[0_0_20px_rgb(0_219_233_/_0.12)]">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <span className="grid gap-1">
                  <span className="technical-label text-primary-fixed-dim">
                    Owner upload and CloudConvert
                  </span>
                  <span className="text-body-md font-semibold text-on-surface">
                    Drop videos here
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    Batch uploads run one file at a time, then CloudConvert
                    handles files that need browser-safe MP4 output.
                  </span>
                </span>
                <span className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/40 bg-primary-fixed-dim/12 px-3 text-label-sm font-semibold text-primary-fixed-dim transition group-hover:bg-primary-fixed-dim/18">
                  <Upload className="h-4 w-4" aria-hidden />
                  Choose videos
                </span>
                <input
                  accept="video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v"
                  className="hidden"
                  id="watch-media-upload"
                  onChange={(event) => {
                    if (event.currentTarget.files) {
                      handleFiles(event.currentTarget.files);
                    }
                    event.currentTarget.value = "";
                  }}
                  multiple
                  type="file"
                />
              </label>
            </section>
          ) : (
            <section className="grid gap-1">
              <p className="technical-label text-primary-fixed-dim">
                Uploaded media
              </p>
              <p className="text-label-sm text-on-surface-variant">
                Owner-uploaded R2 media appears here when it is ready. Upload
                and folder controls are owner-only.
              </p>
            </section>
          )}
          {isOwner && batchUploads.length > 0 ? (
            <BatchUploadQueue
              paused={batchPaused}
              items={batchUploads}
              onApproveAll={approveAllBlockedBatchUploads}
              onApproveItem={approveBatchUploadConversion}
              onCancelItem={cancelBatchUpload}
              onCancelWaiting={cancelWaitingBatchUploads}
              onClearCompleted={clearCompletedBatchUploads}
              onPauseChange={setBatchUploadPaused}
              onRetryItem={retryBatchUpload}
            />
          ) : null}
          {isOwner && resumableUploads.length > 0 ? (
            <ResumableUploadList
              onCancelUpload={(session) => void cancelUpload(session)}
              onResumeUpload={(session) => void resumeUpload(session)}
              progressByUploadId={recoverableProgress}
              sessions={resumableUploads}
            />
          ) : null}
        </>
      ) : null}
      {uploadStatus ? <MediaProcessingStatus state={uploadStatus} /> : null}
      {assetError ? (
        <p className="text-label-sm text-error">{assetError}</p>
      ) : null}
      {activeHubTab === "discover" ? (
        discoverySections.map((section) => (
          <WatchMediaHubSection
            canAddQueue={canAddQueue}
            canLoadSource={canLoadSource}
            canManageQueue={canManageQueue}
            key={section.label}
            onAddQueueItem={onAddQueueItem}
            onLoadSource={onLoadSource}
            onPlayNext={onPlayNext}
            onPlayQueueItem={onPlayQueueItem}
            roomId={roomId}
            section={section}
          />
        ))
      ) : (
        <UploadedMediaLibrary
          access={libraryAccess}
          assets={sortedLibraryItems}
          allAssets={libraryItems}
          canAddQueue={canAddQueue}
          canLoadSource={canLoadSource}
          canManageQueue={canManageQueue}
          folders={folders}
          isOwner={isOwner}
          onApproveProcessing={async (assetId) => {
            try {
              setUploadStatus(
                resolveUploadProgressDisplayState({
                  detail: "Starting approved CloudConvert processing.",
                  label: "Starting conversion",
                  phase: "queued",
                }),
              );
              const approvedAsset = await approveAssetProcessing(assetId);
              setAssets((current) =>
                current.map((item) =>
                  item.id === approvedAsset.id ? approvedAsset : item,
                ),
              );
              setUploadStatus(resolveMediaAssetDisplayState(approvedAsset));
              const readyAsset = await pollMediaProcessing(
                approvedAsset.id,
                (status) => {
                  setUploadStatus(status);
                },
              );
              setAssets((current) =>
                current.map((item) =>
                  item.id === readyAsset.id ? readyAsset : item,
                ),
              );
              setUploadStatus(resolveMediaAssetDisplayState(readyAsset));
            } catch (error) {
              setUploadStatus(
                resolveUploadProgressDisplayState({
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Approved conversion could not start.",
                  phase: "failed",
                }),
              );
            }
          }}
          onDeleteAsset={async (assetId) => {
            await deleteAsset(assetId);
            setAssets((current) =>
              current.filter((item) => item.id !== assetId),
            );
          }}
          onAddQueueItem={onAddQueueItem}
          onFolderChange={async (assetId, folderId) => {
            const asset = await moveAssetToFolder(assetId, folderId);
            setAssets((current) =>
              current.map((item) => (item.id === asset.id ? asset : item)),
            );
          }}
          onFolderSortChange={async (folderId, sortKey, sortDirection) => {
            const folder = await updateFolderSort(
              folderId,
              sortKey,
              sortDirection,
            );
            setFolders((current) =>
              current.map((item) => (item.id === folder.id ? folder : item)),
            );
          }}
          onLoadSource={onLoadSource}
          onPlayNext={onPlayNext}
          onPlayQueueItem={onPlayQueueItem}
          roomId={roomId}
          onVisibilityChange={async (assetId, visibility) => {
            const asset = await updateAssetVisibility(assetId, visibility);
            setAssets((current) =>
              current.map((item) => (item.id === asset.id ? asset : item)),
            );
          }}
          searchQuery={uploadedSearchQuery}
          selectedFolderId={selectedFolderId}
          setSelectedFolderId={setSelectedFolderId}
          setSearchQuery={setUploadedSearchQuery}
          setViewMode={setUploadedViewMode}
          viewMode={uploadedViewMode}
        />
      )}
    </div>
  );
}
