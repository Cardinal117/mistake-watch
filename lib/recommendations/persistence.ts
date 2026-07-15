import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  forbiddenRecommendationEventFields,
  recommendationEventSchemaVersion,
  recommendationEventTypes,
  type RecommendationEventContract,
} from "./events";

export const recommendationRetentionDays = {
  account: 180,
  guest: 30,
  neutralPreference: 30,
} as const;

const FUTURE_EVENT_TOLERANCE_MS = 5 * 60 * 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_TYPES = new Set(["direct", "hls", "uploaded", "youtube"]);
const EVENT_TYPES = new Set<string>(recommendationEventTypes);

export type RecommendationMemberAttribution = {
  memberId: string;
  roomId: string;
  userId: string;
};

export type DurableRecommendationEvent = {
  account_user_id: string | null;
  actor_member_id: string | null;
  authority_event_id: string;
  completion_ratio_bps: number | null;
  contributor_member_id: string | null;
  duration_seconds: number | null;
  event_type: string;
  expires_at: string;
  idempotency_key: string;
  ingested_at: string;
  media_id: string | null;
  occurred_at: string;
  playback_occurrence_id: string | null;
  queue_item_id: string | null;
  queue_position: number | null;
  reason: string | null;
  room_id: string;
  room_session_id: string;
  schema_version: number;
  source_type: string | null;
};

type RecommendationPersistenceClient = SupabaseClient<Database>;

export function normalizeDurableRecommendationEvent(
  event: RecommendationEventContract,
  attribution: RecommendationMemberAttribution | null,
  ingestedAt: Date,
): DurableRecommendationEvent | null {
  if (
    hasForbiddenEventField(event) ||
    event.schemaVersion !== recommendationEventSchemaVersion ||
    !EVENT_TYPES.has(event.eventType) ||
    !isBounded(event.eventId, 80) ||
    !isBounded(event.idempotencyKey, 240) ||
    !isUuid(event.roomId) ||
    !isBounded(event.roomSessionId, 80) ||
    !isOptionalBounded(event.actorMemberId, 160) ||
    !isOptionalBounded(event.contributorMemberId, 160) ||
    !isOptionalBounded(event.playbackOccurrenceId, 80) ||
    !isOptionalBounded(event.queueItemId, 80) ||
    !isOptionalBounded(event.reason, 80) ||
    !isOptionalBounded(event.sourceType, 24) ||
    !isOptionalBounded(event.mediaId, 180) ||
    !isOptionalInteger(event.completionRatioBps, 0, 10_000) ||
    !isOptionalInteger(event.durationSeconds, 1) ||
    !isOptionalInteger(event.position, 0)
  ) {
    return null;
  }

  const occurredAt = dateFromEpochMs(event.createdMs);
  const ingestedMs = ingestedAt.getTime();

  if (
    !occurredAt ||
    !Number.isFinite(ingestedMs) ||
    occurredAt.getTime() > ingestedMs + FUTURE_EVENT_TOLERANCE_MS
  ) {
    return null;
  }

  const sourceType = boundedOptional(event.sourceType, 24);
  const mediaId = boundedOptional(event.mediaId, 180);

  if (
    (sourceType === null) !== (mediaId === null) ||
    (sourceType !== null &&
      (!SOURCE_TYPES.has(sourceType) || !isOpaqueMediaId(sourceType, mediaId!)))
  ) {
    return null;
  }

  const accountUserId = verifiedAccountUserId(event, attribution);
  const retentionDays = accountUserId
    ? recommendationRetentionDays.account
    : recommendationRetentionDays.guest;
  const expiresAt = new Date(ingestedMs + retentionDays * 24 * 60 * 60 * 1_000);

  return {
    account_user_id: accountUserId,
    actor_member_id: boundedOptional(event.actorMemberId, 160),
    authority_event_id: event.eventId.trim(),
    completion_ratio_bps: boundedInteger(event.completionRatioBps, 0, 10_000),
    contributor_member_id: boundedOptional(event.contributorMemberId, 160),
    duration_seconds: boundedInteger(event.durationSeconds, 1),
    event_type: event.eventType,
    expires_at: expiresAt.toISOString(),
    idempotency_key: event.idempotencyKey.trim(),
    ingested_at: ingestedAt.toISOString(),
    media_id: mediaId,
    occurred_at: occurredAt.toISOString(),
    playback_occurrence_id: boundedOptional(event.playbackOccurrenceId, 80),
    queue_item_id: boundedOptional(event.queueItemId, 80),
    queue_position: boundedInteger(event.position, 0),
    reason: boundedOptional(event.reason, 80),
    room_id: event.roomId,
    room_session_id: event.roomSessionId.trim(),
    schema_version: event.schemaVersion,
    source_type: sourceType,
  };
}

export function normalizeRecommendationEventBatch(
  events: RecommendationEventContract[],
  attributions:
    | Iterable<RecommendationMemberAttribution>
    | Map<string, RecommendationMemberAttribution>,
  ingestedAt: Date,
) {
  const attributionByMember = new Map<
    string,
    RecommendationMemberAttribution
  >();

  for (const attribution of attributionValues(attributions)) {
    attributionByMember.set(
      attributionKey(attribution.roomId, attribution.memberId),
      attribution,
    );
  }

  const seenEvents = new Map<string, DurableRecommendationEvent>();

  return [...events].sort(compareRecommendationEvents).flatMap((event) => {
    const attribution = event.actorMemberId
      ? (attributionByMember.get(
          attributionKey(event.roomId, event.actorMemberId),
        ) ?? null)
      : null;
    const normalized = normalizeDurableRecommendationEvent(
      event,
      attribution,
      ingestedAt,
    );

    if (!normalized) {
      return [];
    }

    const existing = seenEvents.get(normalized.idempotency_key);

    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
        throw new Error(
          "Recommendation idempotency key has conflicting authority events.",
        );
      }

      return [];
    }

    seenEvents.set(normalized.idempotency_key, normalized);
    return [normalized];
  });
}

export async function persistRecommendationEventBatch({
  client = createSupabaseAdminClient(),
  events,
  ingestedAt = new Date(),
}: {
  client?: RecommendationPersistenceClient;
  events: RecommendationEventContract[];
  ingestedAt?: Date;
}) {
  const attributions = await loadMemberAttributions(client, events);
  const eventBatch = normalizeRecommendationEventBatch(
    events,
    attributions,
    ingestedAt,
  );

  const uniqueInputCount = new Set(events.map((event) => event.idempotencyKey))
    .size;

  if (eventBatch.length !== uniqueInputCount) {
    throw new Error(
      "Recommendation event batch contains an invalid authority event.",
    );
  }

  if (eventBatch.length === 0) {
    return { duplicates: 0, inserted: 0, received: 0 };
  }

  const { data, error } = await client.rpc("ingest_recommendation_events", {
    event_batch: eventBatch as unknown as Json,
  });

  if (error) {
    throw new Error(
      `Recommendation event persistence failed: ${error.message}`,
    );
  }

  return parseIngestResult(data, eventBatch.length);
}

export async function pruneDurableRecommendationData(
  client: RecommendationPersistenceClient = createSupabaseAdminClient(),
  pruneAt = new Date(),
) {
  const { data, error } = await client.rpc("prune_recommendation_data", {
    prune_at: pruneAt.toISOString(),
  });

  if (error) {
    throw new Error(`Recommendation cleanup failed: ${error.message}`);
  }

  return data;
}

async function loadMemberAttributions(
  client: RecommendationPersistenceClient,
  events: RecommendationEventContract[],
) {
  const memberIds = [
    ...new Set(
      events
        .map((event) => event.actorMemberId)
        .filter((memberId): memberId is string =>
          Boolean(memberId && isUuid(memberId)),
        ),
    ),
  ];

  if (memberIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("room_members")
    .select("id,room_id,user_id")
    .in("id", memberIds);

  if (error) {
    throw new Error(
      `Recommendation attribution lookup failed: ${error.message}`,
    );
  }

  return (data ?? []).flatMap((member) =>
    member.user_id
      ? [
          {
            memberId: member.id,
            roomId: member.room_id,
            userId: member.user_id,
          },
        ]
      : [],
  );
}

function verifiedAccountUserId(
  event: RecommendationEventContract,
  attribution: RecommendationMemberAttribution | null,
) {
  if (
    !attribution ||
    attribution.memberId !== event.actorMemberId ||
    attribution.roomId !== event.roomId ||
    !isUuid(attribution.userId)
  ) {
    return null;
  }

  return attribution.userId;
}

function attributionValues(
  attributions:
    | Iterable<RecommendationMemberAttribution>
    | Map<string, RecommendationMemberAttribution>,
) {
  return attributions instanceof Map ? attributions.values() : attributions;
}

function attributionKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

function compareRecommendationEvents(
  left: RecommendationEventContract,
  right: RecommendationEventContract,
) {
  if (left.createdMs !== right.createdMs) {
    return left.createdMs < right.createdMs ? -1 : 1;
  }

  return left.eventId.localeCompare(right.eventId);
}

function dateFromEpochMs(value: bigint) {
  const milliseconds = Number(value);

  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
    return null;
  }

  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) ? date : null;
}

function boundedOptional(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function boundedInteger(
  value: number | undefined,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (!Number.isSafeInteger(value) || value! < minimum || value! > maximum) {
    return null;
  }

  return value!;
}

function isBounded(value: string, maxLength: number) {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength;
}

function isOptionalBounded(value: string | undefined, maxLength: number) {
  return value === undefined || value.trim().length <= maxLength;
}

function isOptionalInteger(
  value: number | undefined,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  return (
    value === undefined ||
    (Number.isSafeInteger(value) && value >= minimum && value <= maximum)
  );
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function hasForbiddenEventField(event: RecommendationEventContract) {
  const runtimeEvent = event as unknown as Record<string, unknown>;
  return forbiddenRecommendationEventFields.some((field) =>
    Object.prototype.hasOwnProperty.call(runtimeEvent, field),
  );
}

function isOpaqueMediaId(sourceType: string, mediaId: string) {
  if (sourceType === "youtube") {
    return /^[A-Za-z0-9_-]{6,64}$/.test(mediaId);
  }

  if (sourceType === "uploaded") {
    return isUuid(mediaId);
  }

  return (
    mediaId.startsWith("queue:") &&
    mediaId.length > "queue:".length &&
    !/[/?#\\\s]/.test(mediaId.slice("queue:".length))
  );
}

function parseIngestResult(data: Json, expectedReceived: number) {
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new Error("Recommendation ingest returned an invalid result.");
  }

  const result = {
    duplicates: numericResult(data.duplicates),
    inserted: numericResult(data.inserted),
    received: numericResult(data.received),
  };

  if (
    result.duplicates === null ||
    result.inserted === null ||
    result.received !== expectedReceived ||
    result.inserted + result.duplicates !== result.received
  ) {
    throw new Error("Recommendation ingest returned inconsistent counts.");
  }

  return result as {
    duplicates: number;
    inserted: number;
    received: number;
  };
}

function numericResult(value: Json | undefined) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}
