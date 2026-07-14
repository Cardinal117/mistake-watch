import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";

import { MediaAssetError } from "../contracts";
import { abortR2MultipartUpload, listR2MultipartUploadParts } from "../r2";
import { requireOwnerSummary } from "../shared";
import {
  assertMultipartSession,
  assertMultipartSessionRecoverable,
  calculateCompletedBytes,
  getOwnerUploadSession,
  markUploadFailed,
  mergeCompletedParts,
  normalizeMultipartParts,
  readCompletedParts,
  toResumableUploadSession,
} from "./session";

export async function abortMediaUpload(input: { uploadId: string }) {
  const session = await getOwnerUploadSession(input.uploadId);

  if (session.upload_mode === "multipart" && session.multipart_upload_id) {
    await abortR2MultipartUpload({
      multipartUploadId: session.multipart_upload_id,
      objectKey: session.object_key,
    });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("media_upload_sessions")
    .update({ status: "aborted" })
    .eq("id", session.id);

  if (error) {
    throw error;
  }

  return { ok: true };
}

export async function failMediaUpload(input: {
  message: string;
  uploadId: string;
}) {
  const session = await getOwnerUploadSession(input.uploadId);

  if (session.status === "ready" || session.status === "aborted") {
    throw new MediaAssetError("Upload session is no longer active.", 409);
  }

  await markUploadFailed(session.id, input.message);

  return {
    session: toResumableUploadSession({
      ...session,
      error_message: input.message.slice(0, 1000),
      status: "failed",
    }),
  };
}

export async function listResumableMediaUploads() {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await admin
    .from("media_upload_sessions")
    .select()
    .eq("owner_user_id", owner.id)
    .eq("upload_mode", "multipart")
    .is("media_asset_id", null)
    .in("status", ["pending", "uploading", "failed", "completing"])
    .gte("created_at", sevenDaysAgo)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return {
    sessions: data.map(toResumableUploadSession),
  };
}

export async function resumeMediaUpload(input: { uploadId: string }) {
  const session = await getOwnerUploadSession(input.uploadId);

  assertMultipartSession(session);
  assertMultipartSessionRecoverable(session);

  if (session.status === "ready" || session.status === "aborted") {
    throw new MediaAssetError("Upload session is no longer resumable.", 409);
  }

  const r2Parts = await listR2MultipartUploadParts({
    multipartUploadId: session.multipart_upload_id!,
    objectKey: session.object_key,
  }).catch((error) => {
    throw new MediaAssetError(
      error instanceof Error
        ? `Upload resume could not inspect R2 parts: ${error.message}`
        : "Upload resume could not inspect R2 parts.",
      502,
    );
  });
  const completedParts = mergeCompletedParts(
    normalizeMultipartParts(
      r2Parts.map((part) => ({
        etag: part.etag,
        partNumber: part.partNumber,
      })),
      session.part_count ?? 0,
    ),
    readCompletedParts(session.completed_parts),
  );
  const bytesUploaded = calculateCompletedBytes({
    completedParts,
    fileSizeBytes: session.file_size_bytes,
    partSizeBytes: session.part_size_bytes!,
  });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_upload_sessions")
    .update({
      bytes_uploaded: bytesUploaded,
      completed_parts: completedParts,
      error_message: null,
      status: "uploading",
    })
    .eq("id", session.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    session: toResumableUploadSession(data),
  };
}

export async function cleanupExpiredMultipartUploads() {
  const admin = createSupabaseAdminClient();
  const { data: sessions, error } = await admin
    .from("media_upload_sessions")
    .select()
    .eq("upload_mode", "multipart")
    .not("multipart_upload_id", "is", null)
    .is("media_asset_id", null)
    .in("status", ["pending", "uploading", "failed", "completing"])
    .order("updated_at", { ascending: true })
    .limit(100);

  if (error) {
    throw error;
  }

  let cleaned = 0;
  const failures: Array<{ message: string; uploadId: string }> = [];
  const expiredSessions = sessions.filter((session) => {
    const recoverableUntil = session.resumable_until ?? session.expires_at;

    return new Date(recoverableUntil).getTime() < Date.now();
  });

  for (const session of expiredSessions.slice(0, 25)) {
    try {
      if (session.multipart_upload_id) {
        await abortR2MultipartUpload({
          multipartUploadId: session.multipart_upload_id,
          objectKey: session.object_key,
        }).catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "R2 multipart upload could not be aborted.";

          if (!message.includes("404")) {
            throw error;
          }
        });
      }

      const { error: updateError } = await admin
        .from("media_upload_sessions")
        .update({
          error_message: "Expired multipart upload was cleaned up.",
          status: "expired",
        })
        .eq("id", session.id);

      if (updateError) {
        throw updateError;
      }

      cleaned += 1;
    } catch (error) {
      failures.push({
        message:
          error instanceof Error ? error.message : "Multipart cleanup failed.",
        uploadId: session.id,
      });
    }
  }

  return {
    cleaned,
    failures,
    scanned: sessions.length,
  };
}
