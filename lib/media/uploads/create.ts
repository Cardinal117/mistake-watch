import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";

import { MediaAssetError, type CreateUploadInput } from "../contracts";
import { resolveOwnerFolderId } from "../folders/service";
import {
  abortR2MultipartUpload,
  createPresignedR2PutUrl,
  createR2MultipartUpload,
  createR2ObjectKey,
  getMediaUploadMaxBytes,
  multipartUploadPartSizeBytes,
  multipartUploadThresholdBytes,
  validateR2UploadInput,
} from "../r2";
import { requireOwnerSummary } from "../shared";

export async function createMediaUpload(input: CreateUploadInput) {
  const owner = await requireOwnerSummary();
  const validation = validateR2UploadInput(input);

  if (!validation.ok) {
    throw new MediaAssetError(validation.message, 400);
  }

  const folderId = await resolveOwnerFolderId({
    folderId: input.folderId,
    folderName: input.folderName,
    ownerUserId: owner.id,
  });
  const objectKey = createR2ObjectKey({
    fileName: input.fileName,
    ownerUserId: owner.id,
  });
  const uploadMode =
    input.fileSizeBytes >= multipartUploadThresholdBytes
      ? "multipart"
      : "single";
  const partSizeBytes =
    uploadMode === "multipart" ? multipartUploadPartSizeBytes : null;
  const partCount = partSizeBytes
    ? Math.ceil(input.fileSizeBytes / partSizeBytes)
    : null;
  const multipartUploadId =
    uploadMode === "multipart"
      ? await createR2MultipartUpload({
          contentType: input.mimeType,
          objectKey,
        }).catch((error) => {
          throw new MediaAssetError(
            error instanceof Error
              ? `R2 multipart upload could not start: ${error.message}`
              : "R2 multipart upload could not start.",
            502,
          );
        })
      : null;
  const uploadUrl =
    uploadMode === "single"
      ? createPresignedR2PutUrl({
          contentType: input.mimeType,
          objectKey,
        })
      : null;
  const sessionExpiresAt =
    uploadMode === "multipart"
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const resumableUntil = uploadMode === "multipart" ? sessionExpiresAt : null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_upload_sessions")
    .insert({
      completed_parts: [],
      expires_at: sessionExpiresAt,
      file_size_bytes: input.fileSizeBytes,
      mime_type: input.mimeType,
      multipart_upload_id: multipartUploadId,
      object_key: objectKey,
      original_filename: input.fileName.slice(0, 240),
      owner_user_id: owner.id,
      part_count: partCount,
      part_size_bytes: partSizeBytes,
      resumable_until: resumableUntil,
      status: "pending",
      upload_mode: uploadMode,
    })
    .select()
    .single();

  if (error) {
    if (multipartUploadId) {
      await abortR2MultipartUpload({
        multipartUploadId,
        objectKey,
      }).catch(() => undefined);
    }
    throw error;
  }

  return {
    expiresAt: sessionExpiresAt,
    fileSizeBytes: input.fileSizeBytes,
    folderId,
    maxFileSizeBytes: getMediaUploadMaxBytes(),
    partCount,
    partSizeBytes,
    uploadId: data.id,
    uploadMode,
    uploadUrl,
  };
}
