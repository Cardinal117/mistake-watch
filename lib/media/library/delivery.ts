import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

import { MediaAssetError } from "../contracts";
import { canDeliverCatalogueAsset } from "../catalogue-delivery-policy";
import { getUploadedCatalogueAccess } from "../uploaded-catalogue-access";

export async function getCatalogueAssetDelivery(input: {
  assetId: string;
  kind: "content" | "poster";
}) {
  const account = await getAccountSummary();
  const access = await getUploadedCatalogueAccess(account);

  if (!access.allowed || account.status !== "signed-in") {
    throw new MediaAssetError("Uploaded catalogue access required.", 403);
  }

  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select(
      "id,owner_user_id,poster_status,processed_object_key,r2_object_key,status,thumbnail_object_key,visibility",
    )
    .eq("id", input.assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !asset ||
    !canDeliverCatalogueAsset({
      account,
      asset: {
        ownerUserId: asset.owner_user_id,
        posterReady: asset.poster_status === "ready",
        status: asset.status,
        visibility: asset.visibility,
      },
      catalogueAllowed: access.allowed,
      kind: input.kind,
    })
  ) {
    throw new MediaAssetError("Media asset was not found.", 404);
  }

  const objectKey =
    input.kind === "poster"
      ? asset.poster_status === "ready"
        ? asset.thumbnail_object_key
        : null
      : asset.status === "ready"
        ? (asset.processed_object_key ?? asset.r2_object_key)
        : null;

  if (!objectKey) {
    throw new MediaAssetError(
      input.kind === "poster"
        ? "Media poster is not available."
        : "Media content is not available.",
      404,
    );
  }

  return { objectKey };
}
