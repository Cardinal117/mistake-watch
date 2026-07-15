import type { RecommendationMediaIdentity } from "./media-identity";

export type DurablePreference = RecommendationMediaIdentity & {
  liked: boolean;
  revision: number;
};

export type PreferenceAssetAccess = {
  id: string;
  ownerUserId: string;
  status: string;
  visibility: string;
};

export function filterDurablePreferencesForAccess({
  accountUserId,
  assets,
  catalogueScope,
  preferences,
}: {
  accountUserId: string | null;
  assets: PreferenceAssetAccess[];
  catalogueScope: "allowlisted" | "none" | "owner";
  preferences: DurablePreference[];
}) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return preferences.filter((preference) => {
    if (preference.sourceType === "youtube") {
      return true;
    }

    if (preference.sourceType !== "uploaded" || catalogueScope === "none") {
      return false;
    }

    const asset = assetById.get(preference.mediaId);

    return Boolean(
      asset &&
      asset.status === "ready" &&
      (asset.visibility === "public" ||
        (catalogueScope === "owner" && asset.ownerUserId === accountUserId)),
    );
  });
}
