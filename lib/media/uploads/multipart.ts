import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";

import { MediaAssetError, type MultipartUploadPart } from "../contracts";
import { createPresignedR2UploadPartUrl } from "../r2";
import {
  assertMultipartSession,
  assertMultipartSessionRecoverable,
  calculateCompletedBytes,
  getOwnerUploadSession,
  mergeCompletedParts,
  normalizeMultipartParts,
  readCompletedParts,
} from "./session";

export async function createMediaUploadPartUrls(input: {
  partNumbers: number[];
  uploadId: string;
}) {
  const session = await getOwnerUploadSession(input.uploadId);

  assertMultipartSession(session);
  assertMultipartSessionRecoverable(session);

  const requestedParts = Array.from(new Set(input.partNumbers))
    .filter((partNumber) => Number.isInteger(partNumber))
    .sort((left, right) => left - right);

  if (requestedParts.length === 0 || requestedParts.length > 24) {
    throw new MediaAssetError("Request between 1 and 24 upload parts.", 400);
  }

  for (const partNumber of requestedParts) {
    if (partNumber < 1 || partNumber > (session.part_count ?? 0)) {
      throw new MediaAssetError("Upload part number is out of range.", 400);
    }
  }

  return {
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    partSizeBytes: session.part_size_bytes,
    parts: requestedParts.map((partNumber) => ({
      partNumber,
      uploadUrl: createPresignedR2UploadPartUrl({
        multipartUploadId: session.multipart_upload_id!,
        objectKey: session.object_key,
        partNumber,
      }),
    })),
  };
}

export async function recordMediaUploadParts(input: {
  parts: MultipartUploadPart[];
  uploadId: string;
}) {
  const session = await getOwnerUploadSession(input.uploadId);

  assertMultipartSession(session);
  assertMultipartSessionRecoverable(session);

  const completedParts = mergeCompletedParts(
    normalizeMultipartParts(input.parts, session.part_count ?? 0),
    readCompletedParts(session.completed_parts),
  );
  const bytesUploaded = calculateCompletedBytes({
    completedParts,
    fileSizeBytes: session.file_size_bytes,
    partSizeBytes: session.part_size_bytes!,
  });
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("media_upload_sessions")
    .update({
      bytes_uploaded: bytesUploaded,
      completed_parts: completedParts,
      status: "uploading",
    })
    .eq("id", session.id);

  if (error) {
    throw error;
  }

  return {
    bytesUploaded,
    completedParts,
    progress: Math.min(95, (bytesUploaded / session.file_size_bytes) * 95),
  };
}
