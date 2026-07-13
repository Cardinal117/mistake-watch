import { resolveMediaAssetDisplayState } from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";

import type {
  MediaLibraryAsset,
  MultipartCompletedPart,
  ResumableMediaUpload,
} from "../contracts";
import { formatBytes } from "../presentation";

export function uploadSingleFileToR2({
  file,
  onProgress,
  uploadUrl,
}: {
  file: File;
  onProgress(progress: number, detail?: string): void;
  uploadUrl?: string;
}) {
  if (!uploadUrl) {
    throw new Error(
      "Upload could not start because the signed URL is missing.",
    );
  }

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.min(100, (event.loaded / event.total) * 100);
        onProgress(
          progress,
          `Uploading ${file.name} (${formatBytes(event.loaded)} of ${formatBytes(
            event.total,
          )})`,
        );
      }
    };
    request.onerror = () =>
      reject(
        new Error(
          "Upload failed before the file reached storage. Check network access and R2 CORS.",
        ),
      );
    request.onabort = () =>
      reject(new Error("Upload was cancelled by the browser."));
    request.ontimeout = () =>
      reject(new Error("Upload timed out before storage responded."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100, `Uploaded ${file.name}`);
        resolve();
        return;
      }

      reject(
        new Error(
          request.status === 0
            ? "Upload failed before storage returned a response. Check R2 CORS and network access."
            : `Upload failed with storage status ${request.status}.`,
        ),
      );
    };
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type || "video/mp4");
    request.send(file);
  }).then(() => []);
}

export async function uploadMultipartFileToR2({
  existingParts = [],
  file,
  onProgress,
  partCount,
  partSizeBytes,
  uploadId,
}: {
  existingParts?: MultipartCompletedPart[];
  file: File;
  onProgress(progress: number, detail: string): void;
  partCount: number;
  partSizeBytes: number;
  uploadId: string;
}) {
  if (!partCount || !partSizeBytes) {
    throw new Error("Multipart upload metadata is missing.");
  }

  const completedParts: MultipartCompletedPart[] = [...existingParts];
  const completedPartNumbers = new Set(
    existingParts.map((part) => part.partNumber),
  );
  const completedBytesByPart = new Map<number, number>();
  const inFlightBytesByPart = new Map<number, number>();
  let nextPartNumber = 1;

  for (const part of existingParts) {
    const start = (part.partNumber - 1) * partSizeBytes;
    const end = Math.min(file.size, start + partSizeBytes);
    completedBytesByPart.set(part.partNumber, Math.max(0, end - start));
  }

  function emitProgress(detailPrefix = "Uploading parts") {
    const completedBytes = Array.from(completedBytesByPart.values()).reduce(
      (total, bytes) => total + bytes,
      0,
    );
    const inFlightBytes = Array.from(inFlightBytesByPart.values()).reduce(
      (total, bytes) => total + bytes,
      0,
    );
    const uploadedBytes = Math.min(file.size, completedBytes + inFlightBytes);
    const progress = Math.min(100, (uploadedBytes / file.size) * 100);

    onProgress(
      progress,
      `${detailPrefix} (${formatBytes(uploadedBytes)} of ${formatBytes(
        file.size,
      )})`,
    );
  }

  async function uploadNextPart() {
    while (nextPartNumber <= partCount) {
      const partNumber = nextPartNumber;
      nextPartNumber += 1;

      if (completedPartNumbers.has(partNumber)) {
        emitProgress(`Skipping completed part ${partNumber}/${partCount}`);
        continue;
      }

      const start = (partNumber - 1) * partSizeBytes;
      const end = Math.min(file.size, start + partSizeBytes);
      const partSize = end - start;
      const part = await uploadMultipartPartWithRetry({
        file,
        onProgress: (loadedBytes) => {
          inFlightBytesByPart.set(partNumber, loadedBytes);
          emitProgress(`Uploading part ${partNumber}/${partCount}`);
        },
        partNumber,
        start,
        end,
        uploadId,
      });

      inFlightBytesByPart.delete(partNumber);
      completedBytesByPart.set(partNumber, partSize);
      completedParts.push(part);
      completedPartNumbers.add(partNumber);
      emitProgress(`Uploaded part ${partNumber}/${partCount}`);
      await recordCompletedMultipartParts(uploadId, [part]);
    }
  }

  emitProgress(
    existingParts.length > 0
      ? `Resuming multipart upload for ${file.name}`
      : `Preparing multipart upload for ${file.name}`,
  );
  await Promise.all(
    Array.from({ length: Math.min(3, partCount) }, () => uploadNextPart()),
  );

  return completedParts.sort(
    (left, right) => left.partNumber - right.partNumber,
  );
}

async function uploadMultipartPartWithRetry(input: {
  end: number;
  file: File;
  onProgress(loadedBytes: number): void;
  partNumber: number;
  start: number;
  uploadId: string;
}) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const uploadUrl = await createMultipartPartUrl(
        input.uploadId,
        input.partNumber,
      );

      return await uploadMultipartPart({
        ...input,
        uploadUrl,
      });
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 450 * attempt),
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Part ${input.partNumber} could not be uploaded.`);
}

async function createMultipartPartUrl(uploadId: string, partNumber: number) {
  const response = await fetch(`/api/media/uploads/${uploadId}/parts`, {
    body: JSON.stringify({ partNumbers: [partNumber] }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: string;
    parts?: Array<{
      partNumber: number;
      uploadUrl: string;
    }>;
  };

  if (!response.ok || !payload.parts?.[0]?.uploadUrl) {
    throw new Error(payload.error ?? "Upload part could not be prepared.");
  }

  return payload.parts[0].uploadUrl;
}

function uploadMultipartPart(input: {
  end: number;
  file: File;
  onProgress(loadedBytes: number): void;
  partNumber: number;
  start: number;
  uploadId: string;
  uploadUrl: string;
}) {
  return new Promise<MultipartCompletedPart>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const blob = input.file.slice(input.start, input.end);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress(event.loaded);
      }
    };
    request.onerror = () =>
      reject(
        new Error(
          `Part ${input.partNumber} failed before it reached storage. Check network access and R2 CORS.`,
        ),
      );
    request.onabort = () =>
      reject(new Error(`Part ${input.partNumber} upload was cancelled.`));
    request.ontimeout = () =>
      reject(new Error(`Part ${input.partNumber} upload timed out.`));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const etag = request.getResponseHeader("ETag");

        if (!etag) {
          reject(
            new Error(
              "R2 did not expose the upload part ETag. Check the bucket CORS ExposeHeaders setting.",
            ),
          );
          return;
        }

        resolve({
          etag,
          partNumber: input.partNumber,
        });
        return;
      }

      reject(
        new Error(
          request.status === 0
            ? `Part ${input.partNumber} failed before storage returned a response. Check R2 CORS and network access.`
            : `Part ${input.partNumber} failed with storage status ${request.status}.`,
        ),
      );
    };
    request.open("PUT", input.uploadUrl);
    request.send(blob);
  });
}

async function recordCompletedMultipartParts(
  uploadId: string,
  parts: MultipartCompletedPart[],
) {
  const response = await fetch(`/api/media/uploads/${uploadId}/parts`, {
    body: JSON.stringify({ parts }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error ?? "Upload progress could not be recorded.");
  }
}

export async function markUploadSessionFailed(
  uploadId: string,
  message: string,
) {
  await fetch(`/api/media/uploads/${uploadId}/fail`, {
    body: JSON.stringify({ message }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function requestUploadFileSelection(session: ResumableMediaUpload) {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement("input");
    let settled = false;

    function cleanup() {
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
    }

    function finish(file: File | null) {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (file) {
        resolve(file);
        return;
      }

      reject(new Error("No file was selected."));
    }

    function handleWindowFocus() {
      window.setTimeout(() => {
        if (!input.files?.length) {
          finish(null);
        }
      }, 250);
    }

    input.accept = session.mimeType
      ? `video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v,${session.mimeType}`
      : "video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v";
    input.type = "file";
    input.onchange = () => {
      finish(input.files?.[0] ?? null);
    };
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", handleWindowFocus);
    input.click();
  });
}

export function validateResumeFile(session: ResumableMediaUpload, file: File) {
  if (file.name !== session.fileName) {
    throw new Error("Select the same file name to resume this upload.");
  }

  if (file.size !== session.fileSizeBytes) {
    throw new Error("Selected file size does not match the resumable upload.");
  }

  if (session.mimeType && file.type && file.type !== session.mimeType) {
    throw new Error("Selected file type does not match the resumable upload.");
  }
}

export async function pollMediaProcessing(
  assetId: string,
  onStatus: (status: SignalDisplayState) => void,
) {
  const startedAt = Date.now();
  const timeoutMs = 45 * 60 * 1000;
  let attempts = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1;
    await new Promise((resolve) =>
      window.setTimeout(resolve, attempts < 3 ? 1500 : 4000),
    );

    const response = await fetch(`/api/media/assets/${assetId}/processing`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      asset?: MediaLibraryAsset;
      error?: string;
      events?: Array<{
        message: string | null;
        status: string;
        taskName: string | null;
        taskOperation: string | null;
      }>;
    };

    if (!response.ok || !payload.asset) {
      throw new Error(
        payload.error ?? "Processing status could not be loaded.",
      );
    }

    const latestEvent = payload.events?.[0];
    const status = payload.asset.processingStatus ?? payload.asset.status;

    if (payload.asset.status === "ready" || status === "ready") {
      onStatus(
        resolveMediaAssetDisplayState({
          ...payload.asset,
          latestEvent: "CloudConvert finished. Preparing library item.",
        }),
      );
      return payload.asset;
    }

    if (payload.asset.status === "failed" || status === "failed") {
      throw new Error(
        payload.asset.processingErrorMessage ??
          latestEvent?.message ??
          "CloudConvert could not process this video.",
      );
    }

    onStatus(
      resolveMediaAssetDisplayState({
        ...payload.asset,
        latestEvent: formatProcessingStatus(
          latestEvent,
          status ?? "processing",
        ),
      }),
    );
  }

  throw new Error(
    "Video processing is taking longer than expected. Check the uploaded item status later.",
  );
}

function formatProcessingStatus(
  event:
    | {
        message: string | null;
        status: string;
        taskName: string | null;
        taskOperation: string | null;
      }
    | undefined,
  status: string,
) {
  if (event?.message) {
    return event.message;
  }

  if (event?.taskOperation === "convert") {
    return "CloudConvert is creating a browser-safe MP4.";
  }

  if (event?.taskOperation === "thumbnail") {
    return "CloudConvert is creating the thumbnail.";
  }

  if (event?.taskOperation === "export/s3") {
    return "CloudConvert is exporting processed media to R2.";
  }

  return status === "queued"
    ? "CloudConvert job is queued."
    : "CloudConvert is processing the video.";
}

export function uploadBlobToR2(
  blob: Blob,
  uploadUrl: string,
  contentType: string,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.onerror = () =>
      reject(
        new Error(
          "Upload failed before the file reached storage. Check network access and R2 CORS.",
        ),
      );
    request.onabort = () =>
      reject(new Error("Upload was cancelled by the browser."));
    request.ontimeout = () =>
      reject(new Error("Upload timed out before storage responded."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(
        new Error(
          request.status === 0
            ? "Upload failed before storage returned a response. Check R2 CORS and network access."
            : `Upload failed with storage status ${request.status}.`,
        ),
      );
    };
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", contentType);
    request.send(blob);
  });
}
