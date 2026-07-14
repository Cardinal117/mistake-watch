import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

import type { MediaSourceMatch } from "../contracts";
import { toMediaFolder } from "../folders/service";
import { toLibraryAsset, toMediaLibraryAccess } from "../shared";
import { getUploadedCatalogueAccess } from "../uploaded-catalogue-access";

export async function listReadyMediaAssets() {
  const admin = createSupabaseAdminClient();
  const account = await getAccountSummary();
  const catalogueAccess = await getUploadedCatalogueAccess(account);

  if (!catalogueAccess.allowed) {
    return {
      access: toMediaLibraryAccess(catalogueAccess),
      assets: [],
      folders: [],
    };
  }

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
          .order("created_at", { ascending: false })
          .limit(160),
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
    access: toMediaLibraryAccess(catalogueAccess),
    assets: assets.map((asset) =>
      toLibraryAsset(asset, matchesByAssetId.get(asset.id) ?? []),
    ),
    folders: visibleFolders.map(toMediaFolder),
  };
}
