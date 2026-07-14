import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { Json } from "@/lib/supabase/database.types";

import {
  MediaAssetError,
  type MediaLibraryAccess,
  type MediaLibraryAsset,
  type MediaSourceMatch,
} from "./contracts";
import type { UploadedCatalogueAccess } from "./uploaded-catalogue-access";

export async function requireOwnerSummary() {
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

export async function getOwnerMediaAssetById(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  assetId: string;
  ownerUserId: string;
}) {
  const { data, error } = await input.admin
    .from("media_assets")
    .select()
    .eq("id", input.assetId)
    .eq("owner_user_id", input.ownerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function toMediaLibraryAccess(
  access: UploadedCatalogueAccess,
): MediaLibraryAccess {
  return {
    ...access,
    canAccessUploadedCatalogue: access.allowed,
  };
}

export function toLibraryAsset(
  asset: Tables<"media_assets">,
  sourceMatches: MediaSourceMatch[],
): MediaLibraryAsset {
  return {
    contentUrl:
      asset.status === "ready"
        ? `/api/media/assets/${encodeURIComponent(asset.id)}/content`
        : null,
    createdAt: asset.created_at,
    durationSeconds: asset.duration_seconds,
    fileSizeBytes: asset.file_size_bytes,
    folderId: asset.folder_id,
    id: asset.id,
    isLive: asset.is_live,
    mediaKind: asset.media_kind,
    mimeType: asset.mime_type,
    posterStatus: asset.poster_status,
    processingDecisionReason: readProcessingDecisionReason(
      asset.inspection_result,
    ),
    processingEstimatedCredits: asset.estimated_credits,
    processingErrorMessage: asset.processing_error_message,
    processingJobId: asset.processing_job_id,
    processingRequiresApproval:
      asset.owner_approval_required && asset.owner_approved_at === null,
    processingStatus: asset.processing_status,
    processingStrategy: asset.processing_strategy,
    sourceMatches,
    status: asset.status,
    thumbnailUrl:
      asset.poster_status === "ready" && asset.thumbnail_object_key
        ? `/api/media/assets/${encodeURIComponent(asset.id)}/poster`
        : null,
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
