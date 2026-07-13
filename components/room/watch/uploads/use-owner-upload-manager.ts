"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  resolveMediaAssetDisplayState,
  resolveRecoverableUploadDisplayState,
  resolveUploadProgressDisplayState,
} from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";
import type {
  BatchUploadItem,
  MediaLibraryAsset,
  ResumableMediaUpload,
  WatchMediaHubTab,
} from "../contracts";
import {
  approveAssetProcessing,
  captureAndUploadPoster,
} from "../media-hub/media-hub-helpers";
import { createClientId, deriveUploadTitle } from "../presentation";
import { executeOwnerUploadFile } from "./execute-owner-upload";
import { inspectUploadFile, readUploadDuration } from "./media-inspection";
import {
  markUploadSessionFailed,
  pollMediaProcessing,
  requestUploadFileSelection,
  uploadMultipartFileToR2,
  validateResumeFile,
} from "./upload-transport";

type OwnerUploadManagerOptions = {
  isOwner: boolean;
  setActiveHubTab: Dispatch<SetStateAction<WatchMediaHubTab>>;
  setAssets: Dispatch<SetStateAction<MediaLibraryAsset[]>>;
  uploadFolderId: string;
};

export function useOwnerUploadManager({
  isOwner,
  setActiveHubTab,
  setAssets,
  uploadFolderId,
}: OwnerUploadManagerOptions) {
  const [resumableUploads, setResumableUploads] = useState<
    ResumableMediaUpload[]
  >([]);
  const [recoverableProgress, setRecoverableProgress] = useState<
    Record<string, SignalDisplayState>
  >({});
  const [batchUploads, setBatchUploads] = useState<BatchUploadItem[]>([]);
  const [batchPaused, setBatchPaused] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<SignalDisplayState | null>(
    null,
  );
  const batchUploadsRef = useRef<BatchUploadItem[]>([]);
  const batchProcessingRef = useRef(false);
  const batchPausedRef = useRef(false);
  async function refreshResumableUploads() {
    if (!isOwner) {
      setResumableUploads([]);
      return;
    }

    const response = await fetch("/api/media/uploads/resumable", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      error?: string;
      sessions?: ResumableMediaUpload[];
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Recoverable uploads could not load.");
    }

    setResumableUploads(payload.sessions ?? []);
  }

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    let cancelled = false;

    async function loadResumableUploads() {
      try {
        const response = await fetch("/api/media/uploads/resumable", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          sessions?: ResumableMediaUpload[];
        };

        if (!cancelled && response.ok) {
          setResumableUploads(payload.sessions ?? []);
        }
      } catch {
        // Recovery rows are helpful, but should not block the media hub.
      }
    }

    void loadResumableUploads();

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  function updateBatchUploads(
    updater: (current: BatchUploadItem[]) => BatchUploadItem[],
  ) {
    setBatchUploads((current) => {
      const next = updater(current);
      batchUploadsRef.current = next;
      return next;
    });
  }

  function updateBatchUploadItem(
    itemId: string,
    updater: (item: BatchUploadItem) => BatchUploadItem,
  ) {
    updateBatchUploads((current) =>
      current.map((item) => (item.id === itemId ? updater(item) : item)),
    );
  }

  function enqueueBatchFiles(files: File[]) {
    if (!isOwner) {
      setUploadStatus(
        resolveUploadProgressDisplayState({
          detail: "Only the owner account can upload first-party media.",
          label: "Upload blocked",
          phase: "blocked",
        }),
      );
      return;
    }

    if (!files.length) {
      return;
    }

    const folderId = uploadFolderId || null;
    const queuedItems = files.map((file) => ({
      displayState: resolveUploadProgressDisplayState({
        detail: `${file.name} is waiting for its turn.`,
        label: "Waiting",
        phase: "queued",
      }),
      file,
      fileName: file.name,
      fileSizeBytes: file.size,
      folderId,
      id: createClientId("upload"),
      status: "waiting" as const,
    }));
    const nextItems = [...batchUploadsRef.current, ...queuedItems];
    batchUploadsRef.current = nextItems;
    setBatchUploads(nextItems);
    setUploadStatus(null);
    setActiveHubTab("uploads");
    window.setTimeout(runBatchUploadQueue, 0);
  }

  async function runBatchUploadQueue() {
    if (batchPausedRef.current || batchProcessingRef.current) {
      return;
    }

    const nextItem = batchUploadsRef.current.find(
      (item) => item.status === "waiting",
    );

    if (!nextItem) {
      return;
    }

    batchProcessingRef.current = true;
    updateBatchUploadItem(nextItem.id, (item) => ({
      ...item,
      displayState: resolveUploadProgressDisplayState({
        detail: `Preparing ${item.fileName}`,
        label: "Preparing upload",
        phase: "loading",
      }),
      status: "active",
    }));

    try {
      const completedAsset = await executeOwnerUploadFile({
        refreshResumableUploads,
        setAssets,
        file: nextItem.file,
        folderId: nextItem.folderId,
        onAssetReady: (asset) => {
          updateBatchUploadItem(nextItem.id, (item) => ({
            ...item,
            assetId: asset.id,
          }));
        },
        onStatus: (state) => {
          updateBatchUploadItem(nextItem.id, (item) => ({
            ...item,
            displayState: state,
          }));
        },
      });
      const displayState = resolveMediaAssetDisplayState(completedAsset);
      updateBatchUploadItem(nextItem.id, (item) => ({
        ...item,
        assetId: completedAsset.id,
        displayState,
        status: displayState.state === "blocked" ? "blocked" : "ready",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload could not complete.";
      updateBatchUploadItem(nextItem.id, (item) => ({
        ...item,
        displayState: resolveUploadProgressDisplayState({
          detail: message,
          phase: "failed",
          progressPercent: item.displayState.progressPercent,
        }),
        error: message,
        status: "failed",
      }));
      await refreshResumableUploads().catch(() => undefined);
    } finally {
      batchProcessingRef.current = false;
      window.setTimeout(runBatchUploadQueue, 0);
    }
  }

  function retryBatchUpload(itemId: string) {
    updateBatchUploadItem(itemId, (item) => ({
      ...item,
      displayState: resolveUploadProgressDisplayState({
        detail: `${item.fileName} is waiting for retry.`,
        label: "Waiting",
        phase: "queued",
      }),
      error: undefined,
      status: "waiting",
    }));
    window.setTimeout(runBatchUploadQueue, 0);
  }

  function setBatchUploadPaused(paused: boolean) {
    batchPausedRef.current = paused;
    setBatchPaused(paused);

    if (!paused) {
      window.setTimeout(runBatchUploadQueue, 0);
    }
  }

  async function approveBatchUploadConversion(itemId: string) {
    const item = batchUploadsRef.current.find((entry) => entry.id === itemId);

    if (!item?.assetId) {
      updateBatchUploadItem(itemId, (entry) => ({
        ...entry,
        displayState: resolveUploadProgressDisplayState({
          detail: "This item has no media asset to approve yet.",
          phase: "failed",
        }),
        status: "failed",
      }));
      return;
    }

    updateBatchUploadItem(itemId, (entry) => ({
      ...entry,
      displayState: resolveUploadProgressDisplayState({
        detail: "Starting approved CloudConvert processing.",
        label: "Starting conversion",
        phase: "queued",
      }),
      status: "active",
    }));

    try {
      const approvedAsset = await approveAssetProcessing(item.assetId);
      setAssets((current) =>
        current.map((asset) =>
          asset.id === approvedAsset.id ? approvedAsset : asset,
        ),
      );
      updateBatchUploadItem(itemId, (entry) => ({
        ...entry,
        displayState: resolveMediaAssetDisplayState(approvedAsset),
      }));
      const readyAsset = await pollMediaProcessing(
        approvedAsset.id,
        (status) => {
          updateBatchUploadItem(itemId, (entry) => ({
            ...entry,
            displayState: status,
          }));
        },
      );
      setAssets((current) =>
        current.map((asset) =>
          asset.id === readyAsset.id ? readyAsset : asset,
        ),
      );
      updateBatchUploadItem(itemId, (entry) => ({
        ...entry,
        displayState: resolveMediaAssetDisplayState(readyAsset),
        status: "ready",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Approved conversion could not start.";
      updateBatchUploadItem(itemId, (entry) => ({
        ...entry,
        displayState: resolveUploadProgressDisplayState({
          detail: message,
          phase: "failed",
        }),
        error: message,
        status: "failed",
      }));
    }
  }

  async function approveAllBlockedBatchUploads() {
    for (const item of batchUploadsRef.current) {
      if (item.status === "blocked") {
        await approveBatchUploadConversion(item.id);
      }
    }
  }

  function cancelBatchUpload(itemId: string) {
    updateBatchUploadItem(itemId, (item) => {
      if (item.status === "active") {
        return {
          ...item,
          displayState: resolveUploadProgressDisplayState({
            detail:
              "Active browser transfers cannot be safely cancelled here. It will finish or fail normally.",
            label: "Active upload",
            phase: "uploading",
            progressPercent: item.displayState.progressPercent,
          }),
        };
      }

      return {
        ...item,
        displayState: resolveUploadProgressDisplayState({
          detail: `${item.fileName} was removed from the batch queue.`,
          label: "Cancelled",
          phase: "ready",
        }),
        status: "cancelled",
      };
    });
  }

  function clearCompletedBatchUploads() {
    updateBatchUploads((current) =>
      current.filter(
        (item) => item.status !== "ready" && item.status !== "cancelled",
      ),
    );
  }

  function cancelWaitingBatchUploads() {
    updateBatchUploads((current) =>
      current.map((item) =>
        item.status === "waiting" || item.status === "failed"
          ? {
              ...item,
              displayState: resolveUploadProgressDisplayState({
                detail: `${item.fileName} was removed from the batch queue.`,
                label: "Cancelled",
                phase: "ready",
              }),
              status: "cancelled",
            }
          : item,
      ),
    );
  }

  async function resumeUpload(session: ResumableMediaUpload) {
    if (!session.resumable) {
      setRecoverableProgress((current) => ({
        ...current,
        [session.id]: resolveRecoverableUploadDisplayState({
          ...session,
          resumable: false,
        }),
      }));
      return;
    }

    try {
      setRecoverableProgress((current) => ({
        ...current,
        [session.id]: resolveUploadProgressDisplayState({
          detail: "Choose the same local file to resume.",
          label: "Select file",
          phase: "blocked",
          progressPercent: session.progress,
        }),
      }));
      const file = await requestUploadFileSelection(session);

      validateResumeFile(session, file);

      const [clientInspection, durationSeconds] = await Promise.all([
        inspectUploadFile(file),
        readUploadDuration(file),
      ]);
      const retryResponse = await fetch(
        `/api/media/uploads/${session.id}/retry`,
        {
          method: "POST",
        },
      );
      const retryPayload = (await retryResponse.json()) as {
        error?: string;
        session?: ResumableMediaUpload;
      };

      if (!retryResponse.ok || !retryPayload.session) {
        throw new Error(retryPayload.error ?? "Upload could not be resumed.");
      }

      const resumedSession = retryPayload.session;
      setRecoverableProgress((current) => ({
        ...current,
        [resumedSession.id]: resolveUploadProgressDisplayState({
          detail: `Resuming ${resumedSession.fileName}`,
          label: "Resuming upload",
          phase: "uploading",
          progressPercent: resumedSession.progress,
        }),
      }));
      const completedParts = await uploadMultipartFileToR2({
        existingParts: resumedSession.completedParts,
        file,
        onProgress: (progress, detail) => {
          setRecoverableProgress((current) => ({
            ...current,
            [resumedSession.id]: resolveUploadProgressDisplayState({
              detail,
              label: "Uploading",
              phase: "uploading",
              progressPercent: progress,
            }),
          }));
        },
        partCount: resumedSession.partCount,
        partSizeBytes: resumedSession.partSizeBytes,
        uploadId: resumedSession.id,
      }).catch(async (error) => {
        await markUploadSessionFailed(
          resumedSession.id,
          error instanceof Error ? error.message : "Multipart upload failed.",
        ).catch(() => undefined);
        await refreshResumableUploads().catch(() => undefined);
        throw error;
      });

      setRecoverableProgress((current) => ({
        ...current,
        [resumedSession.id]: resolveUploadProgressDisplayState({
          detail: "Finalizing resumed multipart upload",
          label: "Finalizing upload",
          phase: "processing",
        }),
      }));

      const completeResponse = await fetch(
        `/api/media/uploads/${resumedSession.id}/complete`,
        {
          body: JSON.stringify({
            clientInspection,
            durationSeconds,
            folderId: uploadFolderId || null,
            multipartParts: completedParts,
            title: deriveUploadTitle(file.name),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const completePayload = (await completeResponse.json()) as {
        asset?: MediaLibraryAsset;
        error?: string;
      };

      if (!completeResponse.ok || !completePayload.asset) {
        throw new Error(
          completePayload.error ?? "Upload could not be completed.",
        );
      }

      const completedAsset = completePayload.asset;
      setAssets((current) => [completedAsset, ...current]);
      await refreshResumableUploads().catch(() => undefined);

      if (
        completedAsset.status === "ready" ||
        completedAsset.processingStatus === "not_required"
      ) {
        setRecoverableProgress((current) => ({
          ...current,
          [resumedSession.id]: resolveMediaAssetDisplayState(completedAsset),
        }));
        window.setTimeout(() => {
          setRecoverableProgress((current) => {
            const next = { ...current };
            delete next[resumedSession.id];
            return next;
          });
        }, 1600);
        if (completedAsset.posterStatus !== "ready") {
          void captureAndUploadPoster(completedAsset, (asset) => {
            setAssets((current) =>
              current.map((item) => (item.id === asset.id ? asset : item)),
            );
          });
        }
        return;
      }

      if (
        completedAsset.processingStatus === "approval_required" ||
        completedAsset.processingRequiresApproval
      ) {
        setRecoverableProgress((current) => ({
          ...current,
          [resumedSession.id]: resolveMediaAssetDisplayState(completedAsset),
        }));
        window.setTimeout(() => {
          setRecoverableProgress((current) => {
            const next = { ...current };
            delete next[resumedSession.id];
            return next;
          });
        }, 1600);
        return;
      }

      setRecoverableProgress((current) => ({
        ...current,
        [resumedSession.id]: resolveMediaAssetDisplayState(completedAsset),
      }));
      const readyAsset = await pollMediaProcessing(
        completedAsset.id,
        (status) => {
          setRecoverableProgress((current) => ({
            ...current,
            [resumedSession.id]: status,
          }));
        },
      );
      setAssets((current) =>
        current.map((item) => (item.id === readyAsset.id ? readyAsset : item)),
      );
      setRecoverableProgress((current) => ({
        ...current,
        [resumedSession.id]: resolveMediaAssetDisplayState(readyAsset),
      }));
      window.setTimeout(() => {
        setRecoverableProgress((current) => {
          const next = { ...current };
          delete next[resumedSession.id];
          return next;
        });
      }, 1600);
    } catch (error) {
      setRecoverableProgress((current) => ({
        ...current,
        [session.id]: resolveUploadProgressDisplayState({
          detail:
            error instanceof Error
              ? error.message
              : "Upload could not be resumed.",
          phase: "failed",
          progressPercent:
            current[session.id]?.progressPercent ?? session.progress,
        }),
      }));
    }
  }

  async function cancelUpload(session: ResumableMediaUpload) {
    const confirmed = window.confirm(
      `Cancel "${session.fileName}" and clean up the incomplete R2 upload?`,
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/media/uploads/${session.id}/abort`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setUploadStatus(
        resolveUploadProgressDisplayState({
          detail: payload.error ?? "Upload could not be cancelled.",
          label: "Cancel failed",
          phase: "failed",
          progressPercent: session.progress,
        }),
      );
      return;
    }

    setResumableUploads((current) =>
      current.filter((item) => item.id !== session.id),
    );
    setRecoverableProgress((current) => {
      const next = { ...current };
      delete next[session.id];
      return next;
    });
    setUploadStatus(
      resolveUploadProgressDisplayState({
        detail: `${session.fileName} was cancelled and cleanup was requested.`,
        label: "Upload cancelled",
        phase: "ready",
      }),
    );
  }

  function handleFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith("video/") ||
        /\.(avi|m4v|mkv|mov|mp4|webm)$/i.test(file.name),
    );

    enqueueBatchFiles(selectedFiles);
  }

  return {
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
  };
}
