import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";

import {
  CloudConvertError,
  createCloudConvertMediaJob,
  getCloudConvertJob,
  markCloudConvertAssetFailed,
  recordCloudConvertEvent,
  syncCloudConvertJob,
} from "../cloudconvert";
import { MediaAssetError } from "../contracts";
import {
  getOwnerMediaAssetById,
  requireOwnerSummary,
  toLibraryAsset,
} from "../shared";
import { markUploadFailed } from "../uploads/session";

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

  if (
    asset.processing_job_id &&
    (asset.processing_status === "queued" ||
      asset.processing_status === "processing")
  ) {
    return toLibraryAsset(asset, []);
  }

  if (!asset.source_object_key) {
    throw new MediaAssetError("Media source object is missing.", 409);
  }

  const retryingFailedProcessing = asset.processing_status === "failed";

  if (
    asset.processing_strategy !== "needs_approval" &&
    !retryingFailedProcessing
  ) {
    throw new MediaAssetError(
      "This media asset is not waiting for approval or retry.",
      409,
    );
  }

  const { data: approvedAsset, error: approvalError } = await admin
    .from("media_assets")
    .update({
      owner_approved_at: new Date().toISOString(),
      owner_approval_required: false,
      processing_error_message: null,
      processing_job_id: null,
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
    message: retryingFailedProcessing
      ? "Owner retried CloudConvert processing."
      : "Owner approved CloudConvert processing.",
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

export async function getMediaAssetProcessingStatus(input: {
  assetId: string;
}) {
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

export async function startCloudConvertProcessing(input: {
  asset: Tables<"media_assets">;
  sourceObjectKey: string;
  uploadId?: string;
}) {
  const admin = createSupabaseAdminClient();

  if (
    input.asset.status === "ready" ||
    input.asset.processing_status === "ready" ||
    input.asset.processing_status === "not_required"
  ) {
    return toLibraryAsset(input.asset, []);
  }

  if (
    input.asset.processing_job_id &&
    (input.asset.processing_status === "queued" ||
      input.asset.processing_status === "processing")
  ) {
    return toLibraryAsset(input.asset, []);
  }

  const { data: lockedAsset, error: lockError } = await admin
    .from("media_assets")
    .update({
      processing_error_message: null,
      processing_started_at: new Date().toISOString(),
      processing_status: "processing",
      processing_strategy: "convert",
      status: "processing",
    })
    .eq("id", input.asset.id)
    .eq("processing_status", "queued")
    .is("processing_job_id", null)
    .select()
    .maybeSingle();

  if (lockError) {
    throw lockError;
  }

  if (!lockedAsset) {
    const currentAsset = await getOwnerMediaAssetById({
      admin,
      assetId: input.asset.id,
      ownerUserId: input.asset.owner_user_id,
    });

    if (currentAsset) {
      return toLibraryAsset(currentAsset, []);
    }

    throw new MediaAssetError("Media asset was not found.", 404);
  }

  try {
    const processingJob = await createCloudConvertMediaJob({
      asset: lockedAsset,
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
      .eq("id", lockedAsset.id)
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

    await markCloudConvertAssetFailed(lockedAsset, message).catch(
      () => undefined,
    );

    if (error instanceof CloudConvertError) {
      throw new MediaAssetError(error.message, error.status);
    }

    throw error;
  }
}
