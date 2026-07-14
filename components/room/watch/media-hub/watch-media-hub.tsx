"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  resolveMediaAssetDisplayState,
  resolveRecoverableUploadDisplayState,
  resolveUploadProgressDisplayState,
} from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";
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
import {
  approveAssetProcessing,
  captureAndUploadPoster,
  deleteAsset,
  filterUploadedLibraryItems,
  mediaAssetToHubItem,
  moveAssetToFolder,
  sortUploadedLibraryItems,
  updateAssetVisibility,
  updateFolderSort,
} from "./media-hub-helpers";
import {
  inspectUploadFile,
  readUploadDuration,
} from "../uploads/media-inspection";
import {
  markUploadSessionFailed,
  pollMediaProcessing,
  requestUploadFileSelection,
  uploadMultipartFileToR2,
  uploadSingleFileToR2,
  validateResumeFile,
} from "../uploads/upload-transport";
import {
  createClientId,
  deriveUploadTitle,
  isLiveMediaHubItem,
} from "../presentation";
import { useMediaLibrary } from "./use-media-library";
import { getWatchDiscoverySections } from "./discovery-sections";
import { WatchMediaHubView } from "./watch-media-hub-view";
import { useOwnerUploadManager } from "../uploads/use-owner-upload-manager";

type WatchMediaHubDiscoveryProps = {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  isOwner: boolean;
  items: ReturnType<typeof import("../presentation").getQueueItems>;
  onAddQueueItem?(input: QueueItemInput): void;
  onLoadSource?(input: LoadSourceInput): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  roomId: string;
};

export function WatchMediaHubDiscovery({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  isOwner,
  items,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  roomId,
}: WatchMediaHubDiscoveryProps) {
  const {
    assetError,
    assetLoading,
    assets,
    folders,
    libraryAccess,
    setAssets,
    setFolders,
  } = useMediaLibrary();
  const [activeHubTab, setActiveHubTab] =
    useState<WatchMediaHubTab>("discover");
  const [dragActive, setDragActive] = useState(false);
  const [folderCreateStatus, setFolderCreateStatus] = useState<{
    detail: string;
    tone: "error" | "info" | "success";
  } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [uploadFolderId, setUploadFolderId] = useState<string>("");
  const [uploadedSearchQuery, setUploadedSearchQuery] = useState("");
  const [uploadedViewMode, setUploadedViewMode] =
    useState<UploadedLibraryViewMode>("grid");
  const {
    approveAllBlockedBatchUploads,
    approveBatchUploadConversion,
    batchPaused,
    batchUploads,
    cancelBatchUpload,
    cancelUpload,
    cancelWaitingBatchUploads,
    clearCompletedBatchUploads,
    handleFiles,
    recoverableProgress,
    resumableUploads,
    resumeUpload,
    retryBatchUpload,
    setBatchUploadPaused,
    setUploadStatus,
    uploadStatus,
  } = useOwnerUploadManager({
    isOwner,
    setActiveHubTab,
    setAssets,
    uploadFolderId,
  });
  const { historyItems, liveItems, nonLiveActiveItems, queuedItems } =
    useMemo(() => {
      const activeItems = items.filter((item) => item.status !== "played");

      return {
        historyItems: items
          .filter((item) => item.status === "played")
          .slice()
          .reverse(),
        liveItems: activeItems.filter(isLiveMediaHubItem),
        nonLiveActiveItems: activeItems.filter(
          (item) => !isLiveMediaHubItem(item),
        ),
        queuedItems: items.filter((item) => item.status === "queued"),
      };
    }, [items]);
  const libraryItems = useMemo(() => assets.map(mediaAssetToHubItem), [assets]);

  async function createFolder() {
    const name = newFolderName.trim();

    if (!name) {
      setFolderCreateStatus({
        detail: "Folder name is required.",
        tone: "error",
      });
      return;
    }

    setFolderCreateStatus({
      detail: "Creating folder",
      tone: "info",
    });

    try {
      const response = await fetch("/api/media/folders", {
        body: JSON.stringify({ folderType: "series", name }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        folder?: MediaFolder;
      };

      if (!response.ok || !payload.folder) {
        throw new Error(payload.error ?? "Folder could not be created.");
      }

      setFolders((current) => [...current, payload.folder!]);
      setSelectedFolderId(payload.folder.id);
      setUploadFolderId(payload.folder.id);
      setNewFolderName("");
      setFolderCreateStatus({
        detail: `${payload.folder.name} created.`,
        tone: "success",
      });
    } catch (error) {
      setFolderCreateStatus({
        detail:
          error instanceof Error
            ? error.message
            : "Folder could not be created.",
        tone: "error",
      });
    }
  }
  const discoverySections = useMemo(
    () =>
      getWatchDiscoverySections({
        historyItems,
        liveItems,
        nonLiveActiveItems,
        queuedItems,
      }),
    [historyItems, liveItems, nonLiveActiveItems, queuedItems],
  );
  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const sortedLibraryItems = useMemo(() => {
    const visibleLibraryItems =
      selectedFolderId === "all"
        ? libraryItems
        : selectedFolderId === "unsorted"
          ? libraryItems.filter((item) => !item.folderId)
          : selectedFolderId === "live"
            ? libraryItems.filter(isLiveMediaHubItem)
            : libraryItems.filter((item) => item.folderId === selectedFolderId);
    const searchedLibraryItems = filterUploadedLibraryItems({
      folders,
      items: visibleLibraryItems,
      query: uploadedSearchQuery,
    });

    return sortUploadedLibraryItems(
      searchedLibraryItems,
      selectedFolder ?? null,
    );
  }, [
    folders,
    libraryItems,
    selectedFolder,
    selectedFolderId,
    uploadedSearchQuery,
  ]);

  return (
    <WatchMediaHubView
      activeHubTab={activeHubTab}
      approveAllBlockedBatchUploads={approveAllBlockedBatchUploads}
      approveBatchUploadConversion={approveBatchUploadConversion}
      assetError={assetError}
      batchPaused={batchPaused}
      batchUploads={batchUploads}
      canAddQueue={canAddQueue}
      canLoadSource={canLoadSource}
      canManageQueue={canManageQueue}
      cancelBatchUpload={cancelBatchUpload}
      cancelUpload={cancelUpload}
      cancelWaitingBatchUploads={cancelWaitingBatchUploads}
      clearCompletedBatchUploads={clearCompletedBatchUploads}
      createFolder={createFolder}
      discoverySections={discoverySections}
      dragActive={dragActive}
      folderCreateStatus={folderCreateStatus}
      folders={folders}
      handleFiles={handleFiles}
      isOwner={isOwner}
      libraryAccess={libraryAccess}
      libraryItems={libraryItems}
      newFolderName={newFolderName}
      onAddQueueItem={onAddQueueItem}
      onLoadSource={onLoadSource}
      onPlayNext={onPlayNext}
      onPlayQueueItem={onPlayQueueItem}
      recoverableProgress={recoverableProgress}
      resumableUploads={resumableUploads}
      resumeUpload={resumeUpload}
      retryBatchUpload={retryBatchUpload}
      roomId={roomId}
      selectedFolderId={selectedFolderId}
      setActiveHubTab={setActiveHubTab}
      setAssets={setAssets}
      setBatchUploadPaused={setBatchUploadPaused}
      setDragActive={setDragActive}
      setFolders={setFolders}
      setNewFolderName={setNewFolderName}
      setSelectedFolderId={setSelectedFolderId}
      setUploadedSearchQuery={setUploadedSearchQuery}
      setUploadedViewMode={setUploadedViewMode}
      setUploadFolderId={setUploadFolderId}
      setUploadStatus={setUploadStatus}
      sortedLibraryItems={sortedLibraryItems}
      uploadedSearchQuery={uploadedSearchQuery}
      uploadedViewMode={uploadedViewMode}
      uploadFolderId={uploadFolderId}
      uploadStatus={uploadStatus}
    />
  );
}
