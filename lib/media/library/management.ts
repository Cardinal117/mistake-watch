import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";

import { MediaAssetError, type MediaVisibility } from "../contracts";
import { assertOwnerFolder } from "../folders/service";
import {
  assertR2ObjectExists,
  createPresignedR2PutUrl,
  createR2PosterObjectKey,
  deleteR2Object,
  getR2Config,
  getR2PublicUrl,
} from "../r2";
import { requireOwnerSummary, toLibraryAsset } from "../shared";

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
    .select(
      "id, owner_user_id, r2_object_key, source_object_key, processed_object_key, thumbnail_object_key",
    )
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

function normalizeMediaVisibility(visibility: string): MediaVisibility {
  if (visibility === "owner_only" || visibility === "public") {
    return visibility;
  }

  throw new MediaAssetError("Unsupported media visibility.", 400);
}
