import "server-only";
import { readAccountPreferences } from "./account-preference-read";
import {
  durablePreferenceIsNewer,
  isExpiredAccountOverlay,
} from "./preference-freshness";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeRecommendationMediaIdentity,
  recommendationMediaKey,
  type RecommendationMediaIdentity,
} from "./media-identity";
import type { PreferenceMutationInput } from "./preference-contracts";
import {
  filterDurablePreferencesForAccess,
  type DurablePreference,
} from "./preference-policy";
import type { RecommendationRoomAccess } from "./room-authorization";
import {
  readRoomMediaPreferences,
  setRoomMediaPreference,
  type RoomMediaPreference,
} from "./room-preference-bridge";

export async function listAuthorizedPreferences(
  access: RecommendationRoomAccess,
) {
  const livePreferences = await readRoomMediaPreferences(access);
  const preferenceByKey = new Map(
    livePreferences.map((preference) => [
      recommendationMediaKey(preference),
      preference,
    ]),
  );

  if (access.accountUserId) {
    const admin = createSupabaseAdminClient();
    const data = await readAccountPreferences(admin, access.accountUserId);
    const durableKeys = new Set(
      data.map((row) => `${row.source_type}:${row.media_id}`),
    );
    for (const [key, live] of preferenceByKey) {
      if (
        (live.sourceType === "youtube" || live.sourceType === "uploaded") &&
        !durableKeys.has(key) &&
        isExpiredAccountOverlay(live.updatedAtMs, Date.now())
      ) {
        preferenceByKey.set(key, { ...live, liked: false });
      }
    }

    const durablePreferences: DurablePreference[] = (data ?? []).flatMap(
      (row) => {
        const identity = normalizeRecommendationMediaIdentity({
          mediaId: row.media_id,
          sourceType: row.source_type,
        });

        return identity
          ? [
              {
                ...identity,
                liked: row.preference_state === "liked",
                revision: 0,
                updatedAtMs: Date.parse(row.source_event_at),
              },
            ]
          : [];
      },
    );

    for (const preference of await filterAuthorizedDurablePreferences(
      access,
      durablePreferences,
    )) {
      const key = recommendationMediaKey(preference);
      const live = preferenceByKey.get(key);
      if (
        !live ||
        durablePreferenceIsNewer(preference.updatedAtMs, live.updatedAtMs)
      ) {
        preferenceByKey.set(key, {
          ...preference,
          revision: live?.revision ?? 0,
        });
      }
    }
  }

  return [...preferenceByKey.values()].map(toPreferenceResponse);
}

async function filterAuthorizedDurablePreferences(
  access: RecommendationRoomAccess,
  preferences: DurablePreference[],
) {
  const uploaded = preferences.filter(
    (preference) => preference.sourceType === "uploaded",
  );

  if (uploaded.length === 0 || access.catalogueScope === "none") {
    return filterDurablePreferencesForAccess({
      accountUserId: access.accountUserId,
      assets: [],
      catalogueScope: access.catalogueScope,
      preferences,
    });
  }

  const admin = createSupabaseAdminClient();
  const assets = [];
  for (let offset = 0; offset < uploaded.length; offset += 200) {
    const { data, error } = await admin
      .from("media_assets")
      .select("id,owner_user_id,status,visibility")
      .in(
        "id",
        uploaded
          .slice(offset, offset + 200)
          .map((preference) => preference.mediaId),
      );

    if (error) {
      throw error;
    }
    assets.push(...(data ?? []));
  }

  return filterDurablePreferencesForAccess({
    accountUserId: access.accountUserId,
    assets: assets.map((asset) => ({
      id: asset.id,
      ownerUserId: asset.owner_user_id,
      status: asset.status,
      visibility: asset.visibility,
    })),
    catalogueScope: access.catalogueScope,
    preferences,
  });
}

export async function updateAuthorizedPreference({
  access,
  input,
}: {
  access: RecommendationRoomAccess;
  input: PreferenceMutationInput;
}) {
  if (!(await canUsePreferenceIdentity(access, input))) {
    return {
      reason: "This media cannot be liked from this account.",
      status: 403,
    };
  }

  const recordNeutralWithoutCurrent = await shouldRecordDurableNeutral({
    access,
    input,
  });

  const preference = await setRoomMediaPreference({
    access,
    actionId: input.actionId,
    expectedRevision: input.expectedRevision,
    liked: input.liked,
    mediaId: input.mediaId,
    recordNeutralWithoutCurrent,
    reassertIntent: Boolean(access.accountUserId),
    sourceType: input.sourceType,
  });

  if (!preference) {
    if (!input.liked && input.expectedRevision === 0) {
      return {
        item: {
          liked: false,
          mediaId: input.mediaId,
          mediaKey: recommendationMediaKey(input),
          revision: 0,
          sourceType: input.sourceType,
        },
        status: 200,
      };
    }

    return { reason: "Preference state is no longer current.", status: 409 };
  }

  if (preference.conflicted || preference.liked !== input.liked) {
    return {
      item: toPreferenceResponse(preference),
      reason: "Preference state is no longer current.",
      status: 409,
    };
  }

  return { item: toPreferenceResponse(preference), status: 200 };
}

async function shouldRecordDurableNeutral({
  access,
  input,
}: {
  access: RecommendationRoomAccess;
  input: PreferenceMutationInput;
}) {
  if (!access.accountUserId || input.liked || input.expectedRevision !== 0) {
    return false;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_preferences")
    .select("preference_state")
    .eq("user_id", access.accountUserId)
    .eq("source_type", input.sourceType)
    .eq("media_id", input.mediaId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.preference_state === "liked";
}

async function canUsePreferenceIdentity(
  access: RecommendationRoomAccess,
  identity: RecommendationMediaIdentity,
) {
  if (identity.sourceType !== "uploaded") {
    return true;
  }

  if (access.catalogueScope === "none") {
    return false;
  }

  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select("owner_user_id,status,visibility")
    .eq("id", identity.mediaId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(
    asset &&
    asset.status === "ready" &&
    (asset.visibility === "public" ||
      (access.catalogueScope === "owner" &&
        asset.owner_user_id === access.accountUserId)),
  );
}

function toPreferenceResponse(preference: RoomMediaPreference) {
  return {
    liked: preference.liked,
    mediaId: preference.mediaId,
    mediaKey: recommendationMediaKey(preference),
    revision: preference.revision,
    sourceType: preference.sourceType,
  };
}
