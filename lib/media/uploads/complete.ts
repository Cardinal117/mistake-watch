import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { Json } from "@/lib/supabase/database.types";

import { recordCloudConvertEvent } from "../cloudconvert";
import { MediaAssetError, type MultipartUploadPart } from "../contracts";
import { assertOwnerFolder } from "../folders/service";
import {
  decideMediaProcessing,
  type ClientMediaInspection,
} from "../processing-decision";
import { startCloudConvertProcessing } from "../processing/service";
import {
  assertR2ObjectExists,
  completeR2MultipartUpload,
  deriveMediaTitle,
  getR2Config,
  getR2PublicUrl,
} from "../r2";
import {
  getOwnerMediaAssetById,
  requireOwnerSummary,
  toLibraryAsset,
} from "../shared";
import {
  assertMultipartSession,
  assertUploadSessionActive,
  getOwnerUploadSession,
  markUploadFailed,
  mergeCompletedParts,
  normalizeMultipartParts,
  readCompletedParts,
} from "./session";

export async function completeMediaUpload(input: {
  clientInspection?: ClientMediaInspection | Record<string, unknown> | null;
  durationSeconds?: number | null;
  folderId?: string | null;
  multipartParts?: MultipartUploadPart[];
  title?: string;
  uploadId: string;
}) {
  const owner = await requireOwnerSummary();
  const session = await getOwnerUploadSession(input.uploadId, owner.id);
  const admin = createSupabaseAdminClient();

  if (session.media_asset_id) {
    const existingAsset = await getOwnerMediaAssetById({
      admin,
      assetId: session.media_asset_id,
      ownerUserId: owner.id,
    });

    if (existingAsset) {
      await markUploadSessionAttachedToAsset({
        admin,
        asset: existingAsset,
        uploadId: session.id,
      });

      return toLibraryAsset(existingAsset, []);
    }
  }

  assertUploadSessionActive(session, { allowRecoverableFailed: true });

  const existingSourceAsset = await findOwnerMediaAssetBySourceObjectKey({
    admin,
    ownerUserId: owner.id,
    sourceObjectKey: session.object_key,
  });

  if (existingSourceAsset) {
    await markUploadSessionAttachedToAsset({
      admin,
      asset: existingSourceAsset,
      uploadId: session.id,
    });

    await recordCloudConvertEvent({
      assetId: existingSourceAsset.id,
      message: "Upload completion reused existing media asset.",
      payload: {
        sourceObjectKey: session.object_key,
        uploadId: session.id,
      },
      status: "upload_reused",
    });

    return toLibraryAsset(existingSourceAsset, []);
  }

  if (session.upload_mode === "multipart") {
    assertMultipartSession(session);

    const completedParts = mergeCompletedParts(
      normalizeMultipartParts(
        input.multipartParts ?? [],
        session.part_count ?? 0,
      ),
      readCompletedParts(session.completed_parts),
    );

    if (completedParts.length !== session.part_count) {
      throw new MediaAssetError("Upload has not finished all parts.", 409);
    }

    await createSupabaseAdminClient()
      .from("media_upload_sessions")
      .update({
        bytes_uploaded: session.file_size_bytes,
        completed_parts: completedParts,
        status: "completing",
      })
      .eq("id", session.id);

    await completeR2MultipartUpload({
      multipartUploadId: session.multipart_upload_id!,
      objectKey: session.object_key,
      parts: completedParts,
    });
  }

  await assertR2ObjectExists({
    contentLength: session.file_size_bytes,
    objectKey: session.object_key,
  });

  const config = getR2Config();
  const title =
    normalizeTitle(input.title) ?? deriveMediaTitle(session.original_filename);
  const publicUrl = getR2PublicUrl(session.object_key, config);
  const durationSeconds = normalizeDuration(input.durationSeconds);
  const processingDecision = decideMediaProcessing({
    clientInspection: input.clientInspection as ClientMediaInspection | null,
    durationSeconds,
    fileName: session.original_filename,
    fileSizeBytes: session.file_size_bytes,
    mimeType: session.mime_type,
  });
  const folderId = input.folderId
    ? await assertOwnerFolder(input.folderId, owner.id)
    : null;
  const { data: asset, error: assetError } = await admin
    .from("media_assets")
    .insert({
      duration_seconds: durationSeconds,
      file_size_bytes: session.file_size_bytes,
      folder_id: folderId,
      media_kind: "video",
      mime_type: session.mime_type,
      owner_user_id: owner.id,
      poster_status: "pending",
      estimated_credits: processingDecision.estimatedCredits,
      inspection_result: normalizeJsonPayload(
        processingDecision.inspectionResult,
      ),
      owner_approval_required: processingDecision.requiresApproval,
      processing_error_message:
        processingDecision.strategy === "needs_approval"
          ? processingDecision.reason
          : null,
      processing_provider:
        processingDecision.strategy === "direct_ready" ? null : "cloudconvert",
      processing_started_at:
        processingDecision.strategy === "convert"
          ? new Date().toISOString()
          : null,
      processing_status:
        processingDecision.strategy === "direct_ready"
          ? "not_required"
          : processingDecision.strategy === "needs_approval"
            ? "approval_required"
            : "queued",
      processing_strategy: processingDecision.strategy,
      public_url: publicUrl,
      r2_bucket: config.bucket,
      r2_object_key: session.object_key,
      source_file_size_bytes: session.file_size_bytes,
      source_mime_type: session.mime_type,
      source_object_key: session.object_key,
      source_type: "r2_object",
      status:
        processingDecision.strategy === "direct_ready" ? "ready" : "processing",
      title,
      waveform_status: "missing",
    })
    .select()
    .single();

  if (assetError) {
    const existingAsset = await findOwnerMediaAssetBySourceObjectKey({
      admin,
      ownerUserId: owner.id,
      sourceObjectKey: session.object_key,
    });

    if (existingAsset) {
      await markUploadSessionAttachedToAsset({
        admin,
        asset: existingAsset,
        uploadId: session.id,
      });

      await recordCloudConvertEvent({
        assetId: existingAsset.id,
        message:
          "Upload completion reused existing media asset after duplicate insert protection.",
        payload: {
          insertError: assetError.message,
          sourceObjectKey: session.object_key,
          uploadId: session.id,
        },
        status: "upload_reused",
      });

      return toLibraryAsset(existingAsset, []);
    }

    await markUploadFailed(session.id, assetError.message);
    throw assetError;
  }

  const { error: updateError } = await admin
    .from("media_upload_sessions")
    .update({
      media_asset_id: asset.id,
      status:
        processingDecision.strategy === "direct_ready" ? "ready" : "processing",
    })
    .eq("id", session.id);

  if (updateError) {
    throw updateError;
  }

  await recordCloudConvertEvent({
    assetId: asset.id,
    message: processingDecision.reason,
    payload: processingDecision.inspectionResult,
    status: processingDecision.strategy,
  });

  if (processingDecision.strategy === "direct_ready") {
    return toLibraryAsset(asset, []);
  }

  if (processingDecision.strategy === "needs_approval") {
    return toLibraryAsset(asset, []);
  }

  return startCloudConvertProcessing({
    asset,
    sourceObjectKey: session.object_key,
    uploadId: session.id,
  });
}

async function findOwnerMediaAssetBySourceObjectKey(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  ownerUserId: string;
  sourceObjectKey: string;
}) {
  const { data, error } = await input.admin
    .from("media_assets")
    .select()
    .eq("owner_user_id", input.ownerUserId)
    .eq("source_object_key", input.sourceObjectKey)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function markUploadSessionAttachedToAsset(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  asset: Tables<"media_assets">;
  uploadId: string;
}) {
  const { error } = await input.admin
    .from("media_upload_sessions")
    .update({
      error_message: null,
      media_asset_id: input.asset.id,
      status: input.asset.status === "ready" ? "ready" : "processing",
    })
    .eq("id", input.uploadId);

  if (error) {
    throw error;
  }
}

function normalizeJsonPayload(payload: unknown): Json {
  return JSON.parse(JSON.stringify(payload)) as Json;
}

function normalizeTitle(title: string | undefined) {
  const normalized = title?.trim().replace(/\s+/g, " ").slice(0, 160);

  return normalized || null;
}

function normalizeDuration(durationSeconds: number | null | undefined) {
  if (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds >= 0
  ) {
    return Math.floor(durationSeconds);
  }

  return null;
}
