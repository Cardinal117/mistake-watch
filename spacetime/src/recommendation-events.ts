export * from "./recommendation-tables";
export * from "./recommendation-policy";
import {
  RECOMMENDATION_EVENT_SCHEMA_VERSION,
  RECOMMENDATION_GUEST_PREFERENCE_MEMBER_LIMIT,
  RECOMMENDATION_OUTBOX_ROOM_LIMIT,
  type RecommendationAuthorityContext,
  type RecommendationEventInput,
} from "./recommendation-tables";
import { recommendationMediaIdentity } from "./recommendation-policy";
import { nowMs } from "./room-keys";
export function asRecommendationContext(ctx: unknown) {
  return ctx as RecommendationAuthorityContext;
}

export function recordQueueRecommendationEvent(
  ctx: unknown,
  item: {
    added_by_member_id: string;
    duration_seconds?: number;
    position: number;
    queue_item_id: string;
    room_id: string;
    source_type: string;
    source_url: string;
  },
  input: {
    actionId?: string;
    actorMemberId: string;
    eventType: string;
    reason: string;
  },
  createdMs: bigint = nowMs(),
) {
  const media = recommendationMediaIdentity({
    queueItemId: item.queue_item_id,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
  });

  return appendRecommendationEvent(
    asRecommendationContext(ctx),
    {
      actorMemberId: input.actorMemberId,
      contributorMemberId: item.added_by_member_id,
      durationSeconds: item.duration_seconds,
      eventType: input.eventType,
      idempotencyKey: input.actionId?.trim()
        ? `${input.eventType}:${item.room_id}:${input.actorMemberId}:${input.actionId.trim().slice(0, 100)}`
        : `${input.eventType}:${item.queue_item_id}:${input.reason}`,
      mediaId: media?.mediaId,
      position: item.position,
      queueItemId: item.queue_item_id,
      reason: input.reason,
      roomId: item.room_id,
      sourceType: media?.sourceType,
    },
    createdMs,
  );
}

export function recordSourceFailureEvent(
  ctx: RecommendationAuthorityContext,
  item: Parameters<typeof recordQueueRecommendationEvent>[1],
  actorMemberId: string,
  reason: string,
  createdMs: bigint,
) {
  const occurrence = ctx.db.recommendation_playback_occurrence.room_id.find(
    item.room_id,
  );
  const media = recommendationMediaIdentity({
    queueItemId: item.queue_item_id,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
  });

  return appendRecommendationEvent(
    ctx,
    {
      actorMemberId,
      contributorMemberId: item.added_by_member_id,
      eventType: "source_failed",
      idempotencyKey: `source_failed:${occurrence?.playback_occurrence_id ?? item.queue_item_id}:${reason}`,
      mediaId: media?.mediaId,
      playbackOccurrenceId: occurrence?.playback_occurrence_id,
      queueItemId: item.queue_item_id,
      reason,
      roomId: item.room_id,
      sourceType: media?.sourceType,
    },
    createdMs,
  );
}

export function ensureRecommendationRoomSession(
  ctx: RecommendationAuthorityContext,
  roomId: string,
  createdMs: bigint,
) {
  const existing = ctx.db.recommendation_room_session.room_id.find(roomId);

  if (existing) {
    return existing;
  }

  return ctx.db.recommendation_room_session.insert({
    created_ms: createdMs,
    room_id: roomId,
    room_session_id: ctx.newUuidV7().toString(),
  });
}

export function appendRecommendationEvent(
  ctx: RecommendationAuthorityContext,
  input: RecommendationEventInput,
  createdMs: bigint,
) {
  const idempotencyKey = input.idempotencyKey.trim().slice(0, 240);

  if (!idempotencyKey) {
    return null;
  }

  const existing =
    ctx.db.recommendation_event_outbox.idempotency_key.find(idempotencyKey);

  if (existing) {
    return existing;
  }

  const roomSession = ensureRecommendationRoomSession(
    ctx,
    input.roomId,
    createdMs,
  );
  const roomEventCount = [...ctx.db.recommendation_event_outbox.iter()].filter(
    (event) => event.room_id === input.roomId,
  ).length;

  if (roomEventCount >= RECOMMENDATION_OUTBOX_ROOM_LIMIT) {
    const overflow = ctx.db.recommendation_event_overflow.room_id.find(
      input.roomId,
    );

    if (overflow) {
      ctx.db.recommendation_event_overflow.delete(overflow);
    }

    ctx.db.recommendation_event_overflow.insert({
      dropped_count: (overflow?.dropped_count ?? 0) + 1,
      room_id: input.roomId,
      updated_ms: createdMs,
    });
    console.warn("Recommendation outbox capacity reached", input.roomId);
    return null;
  }

  const row = ctx.db.recommendation_event_outbox.insert({
    actor_member_id: boundedOptional(input.actorMemberId, 160),
    completion_ratio_bps: boundedRatio(input.completionRatioBps),
    contributor_member_id: boundedOptional(input.contributorMemberId, 160),
    created_ms: createdMs,
    duration_seconds: boundedPositiveInteger(input.durationSeconds),
    event_id: ctx.newUuidV7().toString(),
    event_type: input.eventType.trim().slice(0, 48),
    idempotency_key: idempotencyKey,
    media_id: boundedOptional(input.mediaId, 180),
    playback_occurrence_id: boundedOptional(input.playbackOccurrenceId, 80),
    position: boundedPositiveInteger(input.position, true),
    queue_item_id: boundedOptional(input.queueItemId, 80),
    reason: boundedOptional(input.reason, 80),
    room_id: input.roomId,
    room_session_id: roomSession.room_session_id,
    schema_version: RECOMMENDATION_EVENT_SCHEMA_VERSION,
    source_type: boundedOptional(input.sourceType, 24),
  });

  return row;
}

export function claimRecommendationAction(
  ctx: RecommendationAuthorityContext,
  input: {
    actionId?: string;
    actorMemberId: string;
    actionType: string;
    roomId: string;
  },
  createdMs: bigint,
) {
  const actionId = input.actionId?.trim().slice(0, 100);

  if (!actionId) {
    return false;
  }

  const actionKey = `${input.roomId}:${input.actorMemberId}:${input.actionType}:${actionId}`;

  if (ctx.db.recommendation_processed_action.action_key.find(actionKey)) {
    return false;
  }

  ctx.db.recommendation_processed_action.insert({
    action_key: actionKey,
    created_ms: createdMs,
    room_id: input.roomId,
  });

  const roomActions = [...ctx.db.recommendation_processed_action.iter()]
    .filter((action) => action.room_id === input.roomId)
    .sort((left, right) =>
      left.created_ms === right.created_ms
        ? left.action_key.localeCompare(right.action_key)
        : left.created_ms < right.created_ms
          ? -1
          : 1,
    );

  roomActions
    .slice(0, Math.max(0, roomActions.length - 5_000))
    .forEach((action) => ctx.db.recommendation_processed_action.delete(action));

  return true;
}

export function beginPlaybackOccurrence(
  ctx: RecommendationAuthorityContext,
  input: {
    actorMemberId: string;
    contributorMemberId?: string;
    durationSeconds?: number;
    mediaId: string;
    queueItemId: string;
    roomId: string;
    sourceType: string;
  },
  createdMs: bigint,
) {
  const roomSession = ensureRecommendationRoomSession(
    ctx,
    input.roomId,
    createdMs,
  );
  const existing = ctx.db.recommendation_playback_occurrence.room_id.find(
    input.roomId,
  );

  if (existing) {
    ctx.db.recommendation_playback_occurrence.delete(existing);
  }

  const occurrence = ctx.db.recommendation_playback_occurrence.insert({
    actor_member_id: input.actorMemberId,
    contributor_member_id: input.contributorMemberId,
    duration_seconds: input.durationSeconds,
    media_id: input.mediaId,
    playback_occurrence_id: ctx.newUuidV7().toString(),
    queue_item_id: input.queueItemId,
    room_id: input.roomId,
    room_session_id: roomSession.room_session_id,
    source_type: input.sourceType,
    started_ms: createdMs,
  });
  const mediaKey = `${roomSession.room_session_id}:${input.sourceType}:${input.mediaId}`;
  const memory = ctx.db.recommendation_playback_memory.media_key.find(mediaKey);
  const eventType = memory ? "playback_replayed" : "playback_started";

  if (memory) {
    ctx.db.recommendation_playback_memory.delete(memory);
  }

  ctx.db.recommendation_playback_memory.insert({
    last_played_ms: createdMs,
    media_id: input.mediaId,
    media_key: mediaKey,
    play_count: (memory?.play_count ?? 0) + 1,
    room_id: input.roomId,
    room_session_id: roomSession.room_session_id,
    source_type: input.sourceType,
  });

  appendRecommendationEvent(
    ctx,
    {
      actorMemberId: input.actorMemberId,
      contributorMemberId: input.contributorMemberId,
      durationSeconds: input.durationSeconds,
      eventType,
      idempotencyKey: `${eventType}:${occurrence.playback_occurrence_id}`,
      mediaId: input.mediaId,
      playbackOccurrenceId: occurrence.playback_occurrence_id,
      queueItemId: input.queueItemId,
      reason: memory ? "media_seen_in_room_session" : "queue_transition",
      roomId: input.roomId,
      sourceType: input.sourceType,
    },
    createdMs,
  );

  return occurrence;
}

export function beginPlaybackOccurrenceIfMissing(
  ctx: RecommendationAuthorityContext,
  input: Parameters<typeof beginPlaybackOccurrence>[1],
  createdMs: bigint,
) {
  return (
    ctx.db.recommendation_playback_occurrence.room_id.find(input.roomId) ??
    beginPlaybackOccurrence(ctx, input, createdMs)
  );
}

export function finishPlaybackOccurrence(
  ctx: RecommendationAuthorityContext,
  input: {
    actorMemberId: string;
    completionRatioBps?: number;
    outcome: "completed" | "failed" | "skipped";
    reason: string;
    roomId: string;
  },
  createdMs: bigint,
) {
  const occurrence = ctx.db.recommendation_playback_occurrence.room_id.find(
    input.roomId,
  );

  if (!occurrence) {
    return null;
  }

  ctx.db.recommendation_playback_occurrence.delete(occurrence);

  if (input.outcome === "failed") {
    return occurrence;
  }

  appendRecommendationEvent(
    ctx,
    {
      actorMemberId: input.actorMemberId,
      completionRatioBps: input.completionRatioBps,
      contributorMemberId: occurrence.contributor_member_id,
      durationSeconds: occurrence.duration_seconds,
      eventType:
        input.outcome === "completed"
          ? "playback_completed"
          : "playback_skipped",
      idempotencyKey: `playback_${input.outcome}:${occurrence.playback_occurrence_id}`,
      mediaId: occurrence.media_id,
      playbackOccurrenceId: occurrence.playback_occurrence_id,
      queueItemId: occurrence.queue_item_id,
      reason: input.reason,
      roomId: input.roomId,
      sourceType: occurrence.source_type,
    },
    createdMs,
  );

  return occurrence;
}

export function setGuestMediaPreference(
  ctx: RecommendationAuthorityContext,
  input: {
    actorMemberId: string;
    expectedRevision: number;
    liked: boolean;
    mediaId: string;
    queueItemId: string;
    roomId: string;
    sourceType: string;
  },
  createdMs: bigint,
) {
  const roomSession = ensureRecommendationRoomSession(
    ctx,
    input.roomId,
    createdMs,
  );
  const preferenceKey = `${roomSession.room_session_id}:${input.actorMemberId}:${input.sourceType}:${input.mediaId}`;
  const current =
    ctx.db.guest_media_preference.preference_key.find(preferenceKey);

  if ((current?.revision ?? 0) !== input.expectedRevision) {
    return current ?? null;
  }

  if (current?.liked === input.liked || (!current && !input.liked)) {
    return current ?? null;
  }

  if (current) {
    ctx.db.guest_media_preference.delete(current);
  }

  const revision = (current?.revision ?? 0) + 1;
  const preference = ctx.db.guest_media_preference.insert({
    actor_member_id: input.actorMemberId,
    liked: input.liked,
    media_id: input.mediaId,
    preference_key: preferenceKey,
    queue_item_id: input.queueItemId,
    revision,
    room_id: input.roomId,
    room_session_id: roomSession.room_session_id,
    source_type: input.sourceType,
    updated_ms: createdMs,
  });

  appendRecommendationEvent(
    ctx,
    {
      actorMemberId: input.actorMemberId,
      eventType: input.liked ? "media_liked" : "media_unliked",
      idempotencyKey: `preference:${preferenceKey}:${revision}`,
      mediaId: input.mediaId,
      queueItemId: input.queueItemId,
      reason: input.liked ? "explicit_like" : "explicit_neutral",
      roomId: input.roomId,
      sourceType: input.sourceType,
    },
    createdMs,
  );

  pruneGuestPreferences(ctx, input.roomId, input.actorMemberId);
  return preference;
}

function pruneGuestPreferences(
  ctx: RecommendationAuthorityContext,
  roomId: string,
  actorMemberId: string,
) {
  const roomPreferences = [...ctx.db.guest_media_preference.iter()]
    .filter(
      (preference) =>
        preference.room_id === roomId &&
        preference.actor_member_id === actorMemberId,
    )
    .sort((left, right) =>
      left.updated_ms === right.updated_ms
        ? left.preference_key.localeCompare(right.preference_key)
        : left.updated_ms < right.updated_ms
          ? -1
          : 1,
    );

  roomPreferences
    .slice(
      0,
      Math.max(
        0,
        roomPreferences.length - RECOMMENDATION_GUEST_PREFERENCE_MEMBER_LIMIT,
      ),
    )
    .forEach((preference) => ctx.db.guest_media_preference.delete(preference));
}

function boundedOptional(value: string | undefined, maxLength: number) {
  const normalized = value?.trim().slice(0, maxLength);
  return normalized || undefined;
}

function boundedPositiveInteger(value?: number, allowZero = false) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.floor(value!);
  return normalized > 0 || (allowZero && normalized === 0)
    ? normalized
    : undefined;
}

function boundedRatio(value?: number) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(10_000, Math.round(value!)));
}
