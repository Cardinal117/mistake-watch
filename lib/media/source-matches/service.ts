import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

import type { MediaLibraryAsset } from "../contracts";
import { toLibraryAsset } from "../shared";
import {
  canExposeSourceMatchedAsset,
  getSourceMatchVisibilityFilter,
  redactSourceMatchedAssetForResponse,
} from "../source-match-access";

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

  const account = await getAccountSummary();
  const visibilityFilter = getSourceMatchVisibilityFilter(account);
  let assetsQuery = admin
    .from("media_assets")
    .select()
    .eq("status", "ready")
    .in("id", assetIds);

  if (visibilityFilter.kind === "owner") {
    assetsQuery = assetsQuery.or(
      `visibility.eq.public,owner_user_id.eq.${visibilityFilter.ownerUserId}`,
    );
  } else {
    assetsQuery = assetsQuery.eq("visibility", "public");
  }

  const { data: assets, error: assetsError } = await assetsQuery;

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

      if (!canExposeSourceMatchedAsset(asset, account)) {
        return null;
      }

      return redactSourceMatchedAssetForResponse(
        toLibraryAsset(asset, [
          {
            sourceId: match.source_id,
            sourceType: match.source_type,
            status: match.status,
          },
        ]),
      );
    })
    .filter((asset): asset is MediaLibraryAsset => Boolean(asset));
}
