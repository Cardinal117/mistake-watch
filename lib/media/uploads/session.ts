import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";

import {
  MediaAssetError,
  type MultipartUploadPart,
  type ResumableMediaUploadSession,
} from "../contracts";
import { requireOwnerSummary } from "../shared";

export async function getOwnerUploadSession(
  uploadId: string,
  ownerUserId?: string,
) {
  const owner = ownerUserId ? null : await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data: session, error } = await admin
    .from("media_upload_sessions")
    .select()
    .eq("id", uploadId)
    .eq("owner_user_id", ownerUserId ?? owner!.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!session) {
    throw new MediaAssetError("Upload session was not found.", 404);
  }

  return session;
}

export function assertUploadSessionActive(
  session: Awaited<ReturnType<typeof getOwnerUploadSession>>,
  options: { allowRecoverableFailed?: boolean } = {},
) {
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new MediaAssetError(
      "Upload session expired. Start a new upload.",
      410,
    );
  }

  if (
    session.status === "aborted" ||
    (session.status === "failed" && !options.allowRecoverableFailed) ||
    session.status === "ready"
  ) {
    throw new MediaAssetError("Upload session is no longer active.", 409);
  }
}

export function assertMultipartSessionRecoverable(
  session: Awaited<ReturnType<typeof getOwnerUploadSession>>,
) {
  const resumableUntil = session.resumable_until ?? session.expires_at;

  if (!resumableUntil || new Date(resumableUntil).getTime() < Date.now()) {
    throw new MediaAssetError(
      "Upload recovery window expired. Start a new upload.",
      410,
    );
  }

  if (session.status === "aborted" || session.status === "ready") {
    throw new MediaAssetError("Upload session is no longer resumable.", 409);
  }
}

export function assertMultipartSession(
  session: Awaited<ReturnType<typeof getOwnerUploadSession>>,
) {
  if (
    session.upload_mode !== "multipart" ||
    !session.multipart_upload_id ||
    !session.part_size_bytes ||
    !session.part_count
  ) {
    throw new MediaAssetError("Upload session is not multipart.", 400);
  }
}

export function toResumableUploadSession(
  session: Tables<"media_upload_sessions">,
): ResumableMediaUploadSession {
  const completedParts = readCompletedParts(session.completed_parts);
  const bytesUploaded =
    session.bytes_uploaded ||
    (session.part_size_bytes
      ? calculateCompletedBytes({
          completedParts,
          fileSizeBytes: session.file_size_bytes,
          partSizeBytes: session.part_size_bytes,
        })
      : 0);
  const resumableUntil = session.resumable_until ?? session.expires_at;
  const expired =
    !resumableUntil || new Date(resumableUntil).getTime() < Date.now();
  const status = expired
    ? "expired"
    : session.status === "failed"
      ? "failed"
      : session.status === "uploading" || session.status === "completing"
        ? "uploading"
        : "paused";

  return {
    bytesUploaded,
    completedParts,
    createdAt: session.created_at,
    errorMessage: session.error_message,
    fileName: session.original_filename,
    fileSizeBytes: session.file_size_bytes,
    id: session.id,
    mimeType: session.mime_type,
    partCount: session.part_count ?? 0,
    partSizeBytes: session.part_size_bytes ?? 0,
    progress:
      session.file_size_bytes > 0
        ? Math.min(95, (bytesUploaded / session.file_size_bytes) * 95)
        : 0,
    resumable:
      !expired && session.status !== "aborted" && session.status !== "ready",
    resumableUntil,
    status,
  };
}

export async function markUploadFailed(uploadId: string, message: string) {
  const admin = createSupabaseAdminClient();

  await admin
    .from("media_upload_sessions")
    .update({
      error_message: message.slice(0, 1000),
      status: "failed",
    })
    .eq("id", uploadId);
}

export function readCompletedParts(value: unknown): MultipartUploadPart[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((part) => {
      if (
        part &&
        typeof part === "object" &&
        "etag" in part &&
        "partNumber" in part &&
        typeof part.etag === "string" &&
        typeof part.partNumber === "number"
      ) {
        return {
          etag: normalizeEtag(part.etag),
          partNumber: part.partNumber,
        };
      }

      return null;
    })
    .filter((part): part is MultipartUploadPart => Boolean(part));
}

export function normalizeMultipartParts(
  parts: MultipartUploadPart[],
  partCount: number,
) {
  return parts.map((part) => {
    if (!Number.isInteger(part.partNumber)) {
      throw new MediaAssetError("Upload part number is invalid.", 400);
    }

    if (part.partNumber < 1 || part.partNumber > partCount) {
      throw new MediaAssetError("Upload part number is out of range.", 400);
    }

    const etag = normalizeEtag(part.etag);

    if (!etag) {
      throw new MediaAssetError("Upload part ETag is missing.", 400);
    }

    return {
      etag,
      partNumber: part.partNumber,
    };
  });
}

export function mergeCompletedParts(
  incoming: MultipartUploadPart[],
  existing: MultipartUploadPart[],
) {
  const byPartNumber = new Map<number, MultipartUploadPart>();

  for (const part of existing) {
    byPartNumber.set(part.partNumber, part);
  }

  for (const part of incoming) {
    byPartNumber.set(part.partNumber, part);
  }

  return Array.from(byPartNumber.values()).sort(
    (left, right) => left.partNumber - right.partNumber,
  );
}

export function calculateCompletedBytes(input: {
  completedParts: MultipartUploadPart[];
  fileSizeBytes: number;
  partSizeBytes: number;
}) {
  return input.completedParts.reduce((total, part) => {
    const start = (part.partNumber - 1) * input.partSizeBytes;
    const remaining = Math.max(0, input.fileSizeBytes - start);

    return total + Math.min(input.partSizeBytes, remaining);
  }, 0);
}

function normalizeEtag(etag: string) {
  return etag.trim();
}
