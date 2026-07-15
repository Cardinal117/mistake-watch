import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { RecommendationRoomAccess } from "./room-authorization";
import type {
  RecommendationAggregate,
  RecommendationPreference,
} from "./scoring";
import {
  createRoomRecommendationService,
  type UploadedRecommendationAsset,
} from "./room-service-core";
import type { RoomRecommendationRequest } from "./room-contracts";
import { readRoomMediaPreferences } from "./room-preference-bridge";

const AGGREGATE_LIMIT = 250;
const PREFERENCE_LIMIT = 250;
type RecommendationClient = SupabaseClient<Database>;

const service = createRoomRecommendationService({
  loadAggregates: (access) =>
    loadAggregates(createSupabaseAdminClient(), access),
  loadPreferences: (access) =>
    loadPreferences(createSupabaseAdminClient(), access),
  loadUploadedAssets: (assetIds) =>
    loadUploadedAssets(createSupabaseAdminClient(), assetIds),
});

export async function getRoomRecommendations({
  access,
  request,
}: {
  access: RecommendationRoomAccess;
  request: RoomRecommendationRequest;
}) {
  const sessionPreferences = (await readRoomMediaPreferences(access)).map(
    (preference) => ({
      mediaId: preference.mediaId,
      sourceType: preference.sourceType,
      state: preference.liked ? "liked" : "neutral",
    }),
  ) satisfies RecommendationPreference[];

  return service.getRecommendations({
    access,
    request,
    sessionPreferences,
  });
}

async function loadAggregates(
  client: RecommendationClient,
  access: Pick<RecommendationRoomAccess, "accountUserId" | "roomId">,
) {
  const now = new Date().toISOString();
  const roomQuery = client
    .from("recommendation_media_aggregates")
    .select()
    .eq("scope_type", "room_session")
    .eq("room_id", access.roomId)
    .gt("expires_at", now)
    .order("last_event_at", { ascending: false })
    .limit(AGGREGATE_LIMIT);
  const accountQuery = access.accountUserId
    ? client
        .from("recommendation_media_aggregates")
        .select()
        .eq("scope_type", "account")
        .eq("account_user_id", access.accountUserId)
        .gt("expires_at", now)
        .order("last_event_at", { ascending: false })
        .limit(AGGREGATE_LIMIT)
    : null;
  const [roomResult, accountResult] = await Promise.all([
    roomQuery,
    accountQuery,
  ]);

  if (roomResult.error || accountResult?.error) {
    throw roomResult.error ?? accountResult?.error;
  }

  return [...(roomResult.data ?? []), ...(accountResult?.data ?? [])].map(
    toRecommendationAggregate,
  );
}

async function loadPreferences(
  client: RecommendationClient,
  access: Pick<RecommendationRoomAccess, "accountUserId">,
) {
  if (!access.accountUserId) {
    return [];
  }

  const { data, error } = await client
    .from("media_preferences")
    .select("media_id,preference_state,source_type")
    .eq("user_id", access.accountUserId)
    .limit(PREFERENCE_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    if (
      row.preference_state !== "liked" &&
      row.preference_state !== "neutral"
    ) {
      return [];
    }

    if (row.source_type === "direct" || row.source_type === "hls") {
      return [];
    }

    return [
      {
        mediaId: row.media_id,
        sourceType: row.source_type,
        state: row.preference_state,
      } as RecommendationPreference,
    ];
  });
}

async function loadUploadedAssets(
  client: RecommendationClient,
  assetIds: string[],
): Promise<UploadedRecommendationAsset[]> {
  const uniqueIds = [...new Set(assetIds)];

  if (uniqueIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("media_assets")
    .select("id,owner_user_id,status,visibility")
    .in("id", uniqueIds)
    .limit(AGGREGATE_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? []).map((asset) => ({
    id: asset.id,
    ownerUserId: asset.owner_user_id,
    status: asset.status,
    visibility: asset.visibility,
  }));
}

function toRecommendationAggregate(
  row: Tables<"recommendation_media_aggregates">,
): RecommendationAggregate {
  return {
    completedCount: row.completed_count,
    lastEventAtMs: new Date(row.last_event_at).getTime(),
    mediaId: row.media_id,
    playNextCount: row.play_next_count,
    queueAddedCount: row.queue_added_count,
    queueRemovedCount: row.queue_removed_count,
    replayedCount: row.replayed_count,
    scopeType: row.scope_type === "account" ? "account" : "room_session",
    skippedCount: row.skipped_count,
    sourceFailedCount: row.source_failed_count,
    sourceType: row.source_type as RecommendationAggregate["sourceType"],
  };
}
