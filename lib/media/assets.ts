import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { Json } from "@/lib/supabase/database.types";

import {
  CloudConvertError,
  createCloudConvertMediaJob,
  getCloudConvertJob,
  markCloudConvertAssetFailed,
  recordCloudConvertEvent,
  syncCloudConvertJob,
} from "./cloudconvert";
import {
  decideMediaProcessing,
  type ClientMediaInspection,
} from "./processing-decision";
import {
  abortR2MultipartUpload,
  assertR2ObjectExists,
  completeR2MultipartUpload,
  createPresignedR2PutUrl,
  createPresignedR2UploadPartUrl,
  createR2MultipartUpload,
  createR2ObjectKey,
  createR2PosterObjectKey,
  deleteR2Object,
  deriveMediaTitle,
  getMediaUploadMaxBytes,
  getR2Config,
  getR2PublicUrl,
  multipartUploadPartSizeBytes,
  multipartUploadThresholdBytes,
  validateR2UploadInput,
} from "./r2";

export type MediaLibraryAsset = {
  createdAt: string;
  durationSeconds: number | null;
  fileSizeBytes: number;
  folderId: string | null;
  id: string;
  isLive: boolean;
  mediaKind: string;
  mimeType: string;
  posterStatus: string;
  processingDecisionReason: string | null;
  processingEstimatedCredits: number | null;
  processingErrorMessage: string | null;
  processingJobId: string | null;
  processingRequiresApproval: boolean;
  processingStatus: string;
  processingStrategy: string;
  publicUrl: string;
  sourceMatches: MediaSourceMatch[];
  status: string;
  thumbnailObjectKey: string | null;
  thumbnailUrl: string | null;
  title: string;
  visibility: string;
  waveformPeaksUrl: string | null;
  waveformStatus: string;
};

export type MediaFolder = {
  createdAt: string;
  defaultSortDirection: MediaFolderSortDirection;
  defaultSortKey: MediaFolderSortKey;
  description: string | null;
  folderType: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
};

export type MediaFolderSortDirection = "asc" | "desc";
export type MediaFolderSortKey = "created_at" | "duration_seconds" | "name";
export type MediaVisibility = "owner_only" | "public";

export type MediaSourceMatch = {
  sourceId: string;
  sourceType: string;
  status: string;
};

export type CreateUploadInput = {
  folderId?: string | null;
  folderName?: string | null;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export type MultipartUploadPart = {
  etag: string;
  partNumber: number;
};

export async function createMediaUpload(input: CreateUploadInput) {
  const owner = await requireOwnerSummary();

  const validation = validateR2UploadInput(input);

  if (!validation.ok) {
    throw new MediaAssetError(validation.message, 400);
  }

  const config = getR2Config();
  const folderId = await resolveOwnerFolderId({
    folderId: input.folderId,
    folderName: input.folderName,
    ownerUserId: owner.id,
  });
  const objectKey = createR2ObjectKey({
    fileName: input.fileName,
    ownerUserId: owner.id,
  });
  const publicUrl = getR2PublicUrl(objectKey, config);
  const uploadMode =
    input.fileSizeBytes >= multipartUploadThresholdBytes ? "multipart" : "single";
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
  const resumableUntil =
    uploadMode === "multipart"
      ? sessionExpiresAt
      : null;
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
    objectKey,
    partCount,
    partSizeBytes,
    publicUrl,
    uploadId: data.id,
    uploadMode,
    uploadUrl,
  };
}

export async function createMediaUploadPartUrls(input: {
  partNumbers: number[];
  uploadId: string;
}) {
  const session = await getOwnerUploadSession(input.uploadId);

  assertMultipartSession(session);
  assertUploadSessionActive(session);

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
  assertUploadSessionActive(session);

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

  assertUploadSessionActive(session);

  if (session.upload_mode === "multipart") {
    assertMultipartSession(session);

    const completedParts = mergeCompletedParts(
      normalizeMultipartParts(input.multipartParts ?? [], session.part_count ?? 0),
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
  const title = normalizeTitle(input.title) ?? deriveMediaTitle(session.original_filename);
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
  const admin = createSupabaseAdminClient();
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
      inspection_result: normalizeJsonPayload(processingDecision.inspectionResult),
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
    await markUploadFailed(session.id, assetError.message);
    throw assetError;
  }

  const { error: updateError } = await admin
    .from("media_upload_sessions")
    .update({
      media_asset_id: asset.id,
      status:
        processingDecision.strategy === "direct_ready"
          ? "ready"
          : "processing",
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

export async function approveMediaAssetProcessing(input: { assetId: string }) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select()
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!asset) {
    throw new MediaAssetError("Media asset was not found.", 404);
  }

  if (asset.status === "ready" || asset.processing_status === "ready") {
    return toLibraryAsset(asset, []);
  }

  if (!asset.source_object_key) {
    throw new MediaAssetError("Media source object is missing.", 409);
  }

  if (asset.processing_strategy !== "needs_approval") {
    throw new MediaAssetError("This media asset is not waiting for approval.", 409);
  }

  const { data: approvedAsset, error: approvalError } = await admin
    .from("media_assets")
    .update({
      owner_approved_at: new Date().toISOString(),
      owner_approval_required: false,
      processing_error_message: null,
      processing_started_at: new Date().toISOString(),
      processing_status: "queued",
      processing_strategy: "convert",
      status: "processing",
    })
    .eq("id", asset.id)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (approvalError) {
    throw approvalError;
  }

  await recordCloudConvertEvent({
    assetId: approvedAsset.id,
    message: "Owner approved CloudConvert processing.",
    payload: {
      estimatedCredits: approvedAsset.estimated_credits,
      sourceFileSizeBytes: approvedAsset.source_file_size_bytes,
    },
    status: "approved",
  });

  return startCloudConvertProcessing({
    asset: approvedAsset,
    sourceObjectKey: asset.source_object_key,
  });
}

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

export async function listReadyMediaAssets() {
  const admin = createSupabaseAdminClient();
  const account = await getAccountSummary();
  const isOwner =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active";
  const [
    { data: assets, error: assetsError },
    { data: folders, error: foldersError },
  ] = await Promise.all([
    isOwner
      ? admin
          .from("media_assets")
          .select()
          .or(`visibility.eq.public,owner_user_id.eq.${account.id}`)
          .order("created_at", { ascending: false })
          .limit(160)
      : admin
          .from("media_assets")
          .select()
          .eq("status", "ready")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(120),
    admin
      .from("media_folders")
      .select()
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (assetsError) {
    throw assetsError;
  }

  if (foldersError) {
    throw foldersError;
  }

  const assetIds = assets.map((asset) => asset.id);
  const matchesByAssetId = new Map<string, MediaSourceMatch[]>();

  if (assetIds.length > 0) {
    const { data: matches, error: matchesError } = await admin
      .from("media_source_matches")
      .select()
      .eq("status", "ready")
      .in("media_asset_id", assetIds);

    if (matchesError) {
      throw matchesError;
    }

    for (const match of matches) {
      const current = matchesByAssetId.get(match.media_asset_id) ?? [];
      current.push({
        sourceId: match.source_id,
        sourceType: match.source_type,
        status: match.status,
      });
      matchesByAssetId.set(match.media_asset_id, current);
    }
  }

  const publicFolderIds = new Set(
    assets
      .map((asset) => asset.folder_id)
      .filter((folderId): folderId is string => Boolean(folderId)),
  );
  const visibleFolders =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active"
      ? folders.filter((folder) => folder.owner_user_id === account.id)
      : folders.filter((folder) => publicFolderIds.has(folder.id));

  return {
    assets: assets.map((asset) =>
      toLibraryAsset(asset, matchesByAssetId.get(asset.id) ?? []),
    ),
    folders: visibleFolders.map(toMediaFolder),
  };
}

export async function findReadyMediaMatch(input: {
  sourceId: string;
  sourceType: "direct" | "hls" | "youtube";
}) {
  const matches = await findReadyMediaMatches([input]);

  return matches[0] ?? null;
}

export async function findReadyMediaMatches(
  inputs: Array<{
    sourceId: string;
    sourceType: "direct" | "hls" | "youtube";
  }>,
) {
  const uniqueInputs = Array.from(
    new Map(
      inputs
        .filter((input) => input.sourceId.trim())
        .map((input) => [`${input.sourceType}:${input.sourceId}`, input]),
    ).values(),
  ).slice(0, 200);

  if (uniqueInputs.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data: matches, error: matchesError } = await admin
    .from("media_source_matches")
    .select()
    .eq("status", "ready")
    .in(
      "source_id",
      uniqueInputs.map((input) => input.sourceId),
    );

  if (matchesError) {
    throw matchesError;
  }

  const requestedKeys = new Set(
    uniqueInputs.map((input) => `${input.sourceType}:${input.sourceId}`),
  );
  const filteredMatches = matches.filter((match) =>
    requestedKeys.has(`${match.source_type}:${match.source_id}`),
  );
  const assetIds = Array.from(
    new Set(filteredMatches.map((match) => match.media_asset_id)),
  );

  if (assetIds.length === 0) {
    return [];
  }

  const { data: assets, error: assetsError } = await admin
    .from("media_assets")
    .select()
    .eq("status", "ready")
    .in("id", assetIds);

  if (assetsError) {
    throw assetsError;
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return filteredMatches
    .map((match) => {
      const asset = assetsById.get(match.media_asset_id);

      if (!asset) {
        return null;
      }

      return toLibraryAsset(asset, [
        {
          sourceId: match.source_id,
          sourceType: match.source_type,
          status: match.status,
        },
      ]);
    })
    .filter((asset): asset is MediaLibraryAsset => Boolean(asset));
}

export async function createMediaFolder(input: {
  folderType?: string;
  name: string;
}) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const name = normalizeFolderName(input.name);
  const slug = await createAvailableFolderSlug(name, owner.id);
  const { data, error } = await admin
    .from("media_folders")
    .insert({
      folder_type: normalizeFolderType(input.folderType),
      name,
      owner_user_id: owner.id,
      slug,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toMediaFolder(data);
}

export async function updateMediaFolderSort(input: {
  folderId: string;
  sortDirection: string;
  sortKey: string;
}) {
  const owner = await requireOwnerSummary();
  const sortKey = normalizeFolderSortKey(input.sortKey);
  const sortDirection = normalizeFolderSortDirection(input.sortDirection);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .update({
      default_sort_direction: sortDirection,
      default_sort_key: sortKey,
    })
    .eq("id", input.folderId)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toMediaFolder(data);
}

export async function listMediaFolders() {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .select()
    .eq("owner_user_id", owner.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(toMediaFolder);
}

export async function moveMediaAssetToFolder(input: {
  assetId: string;
  folderId: string | null;
}) {
  const owner = await requireOwnerSummary();
  const folderId = input.folderId
    ? await assertOwnerFolder(input.folderId, owner.id)
    : null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .update({ folder_id: folderId })
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toLibraryAsset(data, []);
}

export async function updateMediaAssetVisibility(input: {
  assetId: string;
  visibility: string;
}) {
  const owner = await requireOwnerSummary();
  const visibility = normalizeMediaVisibility(input.visibility);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .update({ visibility })
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toLibraryAsset(data, []);
}

export async function deleteMediaAsset(input: { assetId: string }) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select("id, owner_user_id, r2_object_key, source_object_key, processed_object_key, thumbnail_object_key")
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!asset) {
    throw new MediaAssetError("Media asset was not found.", 404);
  }

  const objectKeys = Array.from(
    new Set(
      [
        asset.r2_object_key,
        asset.source_object_key,
        asset.processed_object_key,
        asset.thumbnail_object_key,
      ].filter((objectKey): objectKey is string => Boolean(objectKey)),
    ),
  );

  for (const objectKey of objectKeys) {
    await deleteR2Object(objectKey);
  }

  const { error: deleteError } = await admin
    .from("media_assets")
    .delete()
    .eq("id", asset.id)
    .eq("owner_user_id", owner.id);

  if (deleteError) {
    throw deleteError;
  }
}

export async function getMediaAssetProcessingStatus(input: { assetId: string }) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select()
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!asset) {
    throw new MediaAssetError("Media asset was not found.", 404);
  }

  let currentAsset = asset;

  if (
    asset.processing_provider === "cloudconvert" &&
    asset.processing_job_id &&
    asset.processing_status !== "ready" &&
    asset.processing_status !== "failed"
  ) {
    currentAsset = await syncCloudConvertJob({
      asset,
      job: await getCloudConvertJob(asset.processing_job_id),
    });
  }

  const { data: events, error: eventsError } = await admin
    .from("media_processing_events")
    .select()
    .eq("media_asset_id", currentAsset.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (eventsError) {
    throw eventsError;
  }

  return {
    asset: toLibraryAsset(currentAsset, []),
    events: (events ?? []).map((event) => ({
      createdAt: event.created_at,
      message: event.message,
      status: event.status,
      taskName: event.task_name,
      taskOperation: event.task_operation,
    })),
  };
}

export async function createMediaPosterUpload(input: { assetId: string }) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select()
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!asset) {
    throw new MediaAssetError("Media asset was not found.", 404);
  }

  const objectKey = createR2PosterObjectKey({
    assetId: asset.id,
    ownerUserId: owner.id,
  });
  const uploadUrl = createPresignedR2PutUrl({
    contentType: "image/jpeg",
    objectKey,
  });
  const publicUrl = getR2PublicUrl(objectKey);

  await admin
    .from("media_assets")
    .update({ poster_status: "pending" })
    .eq("id", asset.id)
    .eq("owner_user_id", owner.id);

  return {
    objectKey,
    publicUrl,
    uploadUrl,
  };
}

export async function completeMediaPoster(input: {
  assetId: string;
  objectKey: string;
}) {
  const owner = await requireOwnerSummary();
  const config = getR2Config();

  await assertR2ObjectExists({
    objectKey: input.objectKey,
  });

  const admin = createSupabaseAdminClient();
  const publicUrl = getR2PublicUrl(input.objectKey, config);
  const { data, error } = await admin
    .from("media_assets")
    .update({
      poster_status: "ready",
      thumbnail_object_key: input.objectKey,
      thumbnail_url: publicUrl,
    })
    .eq("id", input.assetId)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toLibraryAsset(data, []);
}

export class MediaAssetError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "MediaAssetError";
    this.status = status;
  }
}

async function getOwnerUploadSession(uploadId: string, ownerUserId?: string) {
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

function assertUploadSessionActive(
  session: Awaited<ReturnType<typeof getOwnerUploadSession>>,
) {
  if (new Date(session.expires_at).getTime() < Date.now()) {
    throw new MediaAssetError("Upload session expired. Start a new upload.", 410);
  }

  if (
    session.status === "aborted" ||
    session.status === "failed" ||
    session.status === "ready"
  ) {
    throw new MediaAssetError("Upload session is no longer active.", 409);
  }
}

function assertMultipartSession(
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

async function requireOwnerSummary() {
  const account = await getAccountSummary();

  if (
    account.status !== "signed-in" ||
    account.role !== "owner" ||
    account.accountStatus !== "active"
  ) {
    throw new MediaAssetError("Owner account required.", 403);
  }

  return account;
}

async function assertOwnerFolder(folderId: string, ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new MediaAssetError("Media folder was not found.", 404);
  }

  return data.id;
}

async function resolveOwnerFolderId(input: {
  folderId?: string | null;
  folderName?: string | null;
  ownerUserId: string;
}) {
  if (input.folderId) {
    return assertOwnerFolder(input.folderId, input.ownerUserId);
  }

  const folderName = normalizeOptionalFolderName(input.folderName);

  if (!folderName) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const slug = await createAvailableFolderSlug(folderName, input.ownerUserId);
  const { data, error } = await admin
    .from("media_folders")
    .insert({
      folder_type: "series",
      name: folderName,
      owner_user_id: input.ownerUserId,
      slug,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function createAvailableFolderSlug(name: string, ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  const baseSlug = slugifyFolderName(name);
  let slug = baseSlug;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const { data, error } = await admin
      .from("media_folders")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

async function markUploadFailed(uploadId: string, message: string) {
  const admin = createSupabaseAdminClient();

  await admin
    .from("media_upload_sessions")
    .update({
      error_message: message.slice(0, 1000),
      status: "failed",
    })
    .eq("id", uploadId);
}

async function startCloudConvertProcessing(input: {
  asset: Tables<"media_assets">;
  sourceObjectKey: string;
  uploadId?: string;
}) {
  const admin = createSupabaseAdminClient();

  try {
    const processingJob = await createCloudConvertMediaJob({
      asset: input.asset,
      sourceObjectKey: input.sourceObjectKey,
    });
    const { data: processingAsset, error: processingAssetError } = await admin
      .from("media_assets")
      .update({
        processed_object_key: processingJob.processedObjectKey,
        processing_job_id: processingJob.job.id ?? null,
        processing_status: "queued",
        processing_strategy: "convert",
        thumbnail_object_key: processingJob.posterObjectKey,
      })
      .eq("id", input.asset.id)
      .select()
      .single();

    if (processingAssetError) {
      throw processingAssetError;
    }

    return toLibraryAsset(processingAsset, []);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "CloudConvert processing could not start.";

    if (input.uploadId) {
      await markUploadFailed(input.uploadId, message);
    }

    await markCloudConvertAssetFailed(input.asset, message).catch(() => undefined);

    if (error instanceof CloudConvertError) {
      throw new MediaAssetError(error.message, error.status);
    }

    throw error;
  }
}

function normalizeJsonPayload(payload: unknown): Json {
  return JSON.parse(JSON.stringify(payload)) as Json;
}

function readCompletedParts(value: unknown): MultipartUploadPart[] {
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

function normalizeMultipartParts(
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

function mergeCompletedParts(
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

function calculateCompletedBytes(input: {
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

function toLibraryAsset(
  asset: Tables<"media_assets">,
  sourceMatches: MediaSourceMatch[],
): MediaLibraryAsset {
  return {
    createdAt: asset.created_at,
    durationSeconds: asset.duration_seconds,
    fileSizeBytes: asset.file_size_bytes,
    folderId: asset.folder_id,
    id: asset.id,
    isLive: asset.is_live,
    mediaKind: asset.media_kind,
    mimeType: asset.mime_type,
    posterStatus: asset.poster_status,
    processingDecisionReason: readProcessingDecisionReason(asset.inspection_result),
    processingEstimatedCredits: asset.estimated_credits,
    processingErrorMessage: asset.processing_error_message,
    processingJobId: asset.processing_job_id,
    processingRequiresApproval:
      asset.owner_approval_required && asset.owner_approved_at === null,
    processingStatus: asset.processing_status,
    processingStrategy: asset.processing_strategy,
    publicUrl: asset.public_url,
    sourceMatches,
    status: asset.status,
    thumbnailObjectKey: asset.thumbnail_object_key,
    thumbnailUrl: asset.thumbnail_url,
    title: asset.title,
    visibility: asset.visibility,
    waveformPeaksUrl: asset.waveform_peaks_url,
    waveformStatus: asset.waveform_status,
  };
}

function readProcessingDecisionReason(inspectionResult: Json) {
  if (
    inspectionResult &&
    typeof inspectionResult === "object" &&
    !Array.isArray(inspectionResult) &&
    "notes" in inspectionResult &&
    Array.isArray(inspectionResult.notes)
  ) {
    const [firstNote] = inspectionResult.notes;

    return typeof firstNote === "string" ? firstNote : null;
  }

  return null;
}

function toMediaFolder(folder: Tables<"media_folders">): MediaFolder {
  return {
    createdAt: folder.created_at,
    defaultSortDirection: normalizeFolderSortDirection(
      folder.default_sort_direction,
    ),
    defaultSortKey: normalizeFolderSortKey(folder.default_sort_key),
    description: folder.description,
    folderType: folder.folder_type,
    id: folder.id,
    name: folder.name,
    sortOrder: folder.sort_order,
    updatedAt: folder.updated_at,
  };
}

function normalizeFolderName(name: string) {
  const normalized = normalizeOptionalFolderName(name);

  if (!normalized) {
    throw new MediaAssetError("Folder name is required.", 400);
  }

  return normalized;
}

function normalizeOptionalFolderName(name: string | null | undefined) {
  const normalized = name?.trim().replace(/\s+/g, " ").slice(0, 120);

  return normalized || null;
}

function normalizeFolderType(folderType: string | undefined) {
  return folderType === "series" || folderType === "general"
    ? folderType
    : "collection";
}

function normalizeFolderSortKey(sortKey: string): MediaFolderSortKey {
  if (
    sortKey === "created_at" ||
    sortKey === "duration_seconds" ||
    sortKey === "name"
  ) {
    return sortKey;
  }

  throw new MediaAssetError("Unsupported folder sort key.", 400);
}

function normalizeFolderSortDirection(
  direction: string,
): MediaFolderSortDirection {
  if (direction === "asc" || direction === "desc") {
    return direction;
  }

  throw new MediaAssetError("Unsupported folder sort direction.", 400);
}

function normalizeMediaVisibility(visibility: string): MediaVisibility {
  if (visibility === "owner_only" || visibility === "public") {
    return visibility;
  }

  throw new MediaAssetError("Unsupported media visibility.", 400);
}

function slugifyFolderName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "media-folder"
  );
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
