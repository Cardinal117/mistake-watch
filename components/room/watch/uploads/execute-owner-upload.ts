import type { Dispatch, SetStateAction } from "react";

import {
  resolveMediaAssetDisplayState,
  resolveUploadProgressDisplayState,
} from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";
import type { MediaLibraryAsset } from "../contracts";
import { captureAndUploadPoster } from "../media-hub/media-hub-helpers";
import { deriveUploadTitle } from "../presentation";
import { inspectUploadFile, readUploadDuration } from "./media-inspection";
import {
  markUploadSessionFailed,
  pollMediaProcessing,
  uploadMultipartFileToR2,
  uploadSingleFileToR2,
} from "./upload-transport";

export async function executeOwnerUploadFile(input: {
  refreshResumableUploads(): Promise<void>;
  setAssets: Dispatch<SetStateAction<MediaLibraryAsset[]>>;
  file: File;
  folderId: string | null;
  onAssetReady?(asset: MediaLibraryAsset): void;
  onStatus(state: SignalDisplayState): void;
}) {
  const {
    file,
    folderId,
    onAssetReady,
    onStatus,
    refreshResumableUploads,
    setAssets,
  } = input;

  onStatus(
    resolveUploadProgressDisplayState({
      detail: `Preparing ${file.name}`,
      label: "Preparing upload",
      phase: "loading",
    }),
  );

  const [clientInspection, durationSeconds] = await Promise.all([
    inspectUploadFile(file),
    readUploadDuration(file),
  ]);
  const createResponse = await fetch("/api/media/uploads", {
    body: JSON.stringify({
      fileName: file.name,
      fileSizeBytes: file.size,
      folderId,
      folderName: null,
      mimeType: file.type || "application/octet-stream",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const createPayload = (await createResponse.json()) as {
    error?: string;
    folderId?: string | null;
    partCount?: number | null;
    partSizeBytes?: number | null;
    uploadId?: string;
    uploadMode?: "multipart" | "single";
    uploadUrl?: string;
  };

  if (!createResponse.ok || !createPayload.uploadId) {
    throw new Error(createPayload.error ?? "Upload could not be prepared.");
  }

  const completedParts =
    createPayload.uploadMode === "multipart"
      ? await uploadMultipartFileToR2({
          file,
          onProgress: (progress, detail) => {
            onStatus(
              resolveUploadProgressDisplayState({
                detail,
                label: "Uploading",
                phase: "uploading",
                progressPercent: progress,
              }),
            );
          },
          partCount: createPayload.partCount ?? 0,
          partSizeBytes: createPayload.partSizeBytes ?? 0,
          uploadId: createPayload.uploadId,
        }).catch(async (error) => {
          await markUploadSessionFailed(
            createPayload.uploadId!,
            error instanceof Error ? error.message : "Multipart upload failed.",
          ).catch(() => undefined);
          await refreshResumableUploads().catch(() => undefined);
          throw error;
        })
      : await uploadSingleFileToR2({
          file,
          onProgress: (progress, detail) => {
            onStatus(
              resolveUploadProgressDisplayState({
                detail: detail ?? `Uploading ${file.name}`,
                label: "Uploading",
                phase: "uploading",
                progressPercent: progress,
              }),
            );
          },
          uploadUrl: createPayload.uploadUrl,
        });

  onStatus(
    resolveUploadProgressDisplayState({
      detail:
        createPayload.uploadMode === "multipart"
          ? "Finalizing multipart upload"
          : "Inspecting uploaded source",
      label:
        createPayload.uploadMode === "multipart"
          ? "Finalizing upload"
          : "Inspecting media",
      phase: "processing",
    }),
  );

  const completeResponse = await fetch(
    `/api/media/uploads/${createPayload.uploadId}/complete`,
    {
      body: JSON.stringify({
        clientInspection,
        durationSeconds,
        folderId: createPayload.folderId ?? null,
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
    throw new Error(completePayload.error ?? "Upload could not be completed.");
  }

  const completedAsset = completePayload.asset;
  setAssets((current) => [completedAsset, ...current]);
  await refreshResumableUploads().catch(() => undefined);

  if (
    completedAsset.status === "ready" ||
    completedAsset.processingStatus === "not_required"
  ) {
    onStatus(resolveMediaAssetDisplayState(completedAsset));
    onAssetReady?.(completedAsset);
    if (completedAsset.posterStatus !== "ready") {
      void captureAndUploadPoster(completedAsset, (asset) => {
        setAssets((current) =>
          current.map((item) => (item.id === asset.id ? asset : item)),
        );
      });
    }
    return completedAsset;
  }

  if (
    completedAsset.processingStatus === "approval_required" ||
    completedAsset.processingRequiresApproval
  ) {
    onStatus(resolveMediaAssetDisplayState(completedAsset));
    return completedAsset;
  }

  onStatus(resolveMediaAssetDisplayState(completedAsset));
  const readyAsset = await pollMediaProcessing(completedAsset.id, onStatus);
  setAssets((current) =>
    current.map((item) => (item.id === readyAsset.id ? readyAsset : item)),
  );
  onStatus(resolveMediaAssetDisplayState(readyAsset));
  onAssetReady?.(readyAsset);
  if (readyAsset.posterStatus !== "ready") {
    void captureAndUploadPoster(readyAsset, (asset) => {
      setAssets((current) =>
        current.map((item) => (item.id === asset.id ? asset : item)),
      );
    });
  }

  return readyAsset;
}
