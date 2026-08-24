import { t } from "spacetimedb/server";
import {
  createMediaFailureEvent,
  isPermanentMediaFailureCode,
  mediaProviderId,
  normalizeMediaFailure,
} from "./media-failure";
import {
  isUploadedAssetReference,
  resolveQueuePlaybackSource,
} from "./media-references";
import {
  clampPositionSeconds,
  normalizeChatText,
  normalizeDurationSeconds,
  normalizePlaybackStatus,
  normalizeQueueMode,
  normalizeRoomMode,
  normalizeRoomName,
  normalizeSourceType,
  normalizeSourceUrl,
} from "./normalization";
import {
  calculateNextPlayedSequence,
  calculateNextQueuePosition,
  calculatePlayNextQueuePosition,
  calculateQueueAdvancePatches,
  selectActiveQueueItems,
  selectQueuedQueueItems,
  sortQueueItems,
} from "./queue-calculations";
import {
  asRecommendationContext as recommendationContext,
  beginPlaybackOccurrence,
  beginPlaybackOccurrenceIfMissing,
  claimRecommendationAction,
  classifyPlaybackAdvance,
  completionRatioBps,
  finishPlaybackOccurrence,
  recommendationMediaIdentity,
  recordQueueRecommendationEvent,
  recordSourceFailureEvent,
} from "./recommendation-events";
import { isTrustedRecommendationAuthority } from "./recommendation-authority";
import {
  getCurrentParticipantSession,
  isCurrentParticipantSession,
  removeMemberSessions,
} from "./room-admission";
import {
  getParticipant,
  isParticipantSender,
  upsertAggregateParticipant,
  upsertPermission,
} from "./room-participant-state";
import { spacetimedb } from "./module-schema";
import { recordRoomError } from "./room-errors";
import {
  constantTimeStringEqual,
  kickKey,
  nowMs,
  participantKey,
  permissionKey,
  roomSeedGrantKey,
} from "./room-keys";

export {
  acknowledge_recommendation_event_outbox,
  init,
  read_my_guest_media_preferences,
  read_recommendation_event_outbox,
  read_verified_room_media_preferences,
  set_guest_media_preference,
  set_verified_room_media_preference,
} from "./recommendation-authority";
export {
  issue_room_admission_grant,
  join_room,
  leave_room,
  on_disconnect,
} from "./room-participation";
export {
  clear_room_rhythm_profile,
  publish_room_rhythm_profile,
} from "./room-rhythm";

export default spacetimedb;

function getValidRoomSeedGrant(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  hostMemberId: string,
  seedToken: string,
) {
  const grant = ctx.db.room_seed_grant.grant_key.find(
    roomSeedGrantKey(roomId, hostMemberId),
  );

  if (!grant) {
    return null;
  }

  if (grant.expires_ms < nowMs()) {
    ctx.db.room_seed_grant.delete(grant);
    return null;
  }

  if (
    grant.room_id !== roomId ||
    grant.host_member_id !== hostMemberId ||
    !constantTimeStringEqual(grant.seed_token, seedToken.trim())
  ) {
    return null;
  }

  return grant;
}

function getAuthorizedHost(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  actorMemberId: string,
) {
  const session = ctx.db.room_session.room_id.find(roomId);
  const actor = getParticipant(ctx, roomId, actorMemberId);

  if (!session || !actor) {
    recordRoomError(ctx, {
      code: "authority_missing",
      message:
        "Host authority check failed because the session or actor is missing.",
      roomId,
    });
    return null;
  }

  if (
    session.host_member_id !== actorMemberId ||
    actor.role !== "host" ||
    !isParticipantSender(ctx, actor)
  ) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message: "Only the authoritative host can update live room permissions.",
      roomId,
    });
    return null;
  }

  return { actor, session };
}

function getAuthorizedPlaybackActor(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  actorMemberId: string,
) {
  const session = ctx.db.room_session.room_id.find(roomId);
  const actor = getParticipant(ctx, roomId, actorMemberId);
  const permission = ctx.db.room_permission.permission_key.find(
    permissionKey(roomId, actorMemberId),
  );

  if (!session || !actor || !isParticipantSender(ctx, actor)) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Playback control denied because the caller is not an active room participant.",
      roomId,
    });
    return null;
  }

  if (actor.role !== "host" && !permission?.can_control_playback) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Playback control denied because the caller does not have playback permission.",
      roomId,
    });
    return null;
  }

  return { actor, session };
}

function getAuthorizedQueueAddActor(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  actorMemberId: string,
) {
  const session = ctx.db.room_session.room_id.find(roomId);
  const actor = getParticipant(ctx, roomId, actorMemberId);
  const permission = ctx.db.room_permission.permission_key.find(
    permissionKey(roomId, actorMemberId),
  );

  if (!session || !actor || !isParticipantSender(ctx, actor)) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Queue update denied because the caller is not an active room participant.",
      roomId,
    });
    return null;
  }

  if (actor.role !== "host" && !permission?.can_add_queue) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Queue add denied because the caller does not have queue permission.",
      roomId,
    });
    return null;
  }

  return { actor, session };
}

function getAuthorizedQueueManager(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  actorMemberId: string,
) {
  const session = ctx.db.room_session.room_id.find(roomId);
  const actor = getParticipant(ctx, roomId, actorMemberId);
  const permission = ctx.db.room_permission.permission_key.find(
    permissionKey(roomId, actorMemberId),
  );

  if (!session || !actor || !isParticipantSender(ctx, actor)) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Queue management denied because the caller is not an active room participant.",
      roomId,
    });
    return null;
  }

  if (actor.role !== "host" && !permission?.can_manage_queue) {
    recordRoomError(ctx, {
      code: "permission_denied",
      message:
        "Queue management denied because the caller does not have queue-management permission.",
      roomId,
    });
    return null;
  }

  return { actor, session };
}

function chatMessageId(roomId: string, clientMessageId: string) {
  return `${roomId}:${clientMessageId}`;
}

function pruneRoomChatMessages(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  const maxMessages = 100;
  const messages = [...ctx.db.room_chat_message.iter()]
    .filter((message) => message.room_id === roomId)
    .sort((a, b) => Number(b.created_ms - a.created_ms));

  messages.slice(maxMessages).forEach((message) => {
    ctx.db.room_chat_message.delete(message);
  });
}

function activeQueueItems(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  return selectActiveQueueItems(roomQueueItems(ctx, roomId));
}

function roomQueueItems(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  return sortQueueItems(
    [...ctx.db.live_queue_item.iter()].filter(
      (item) => item.room_id === roomId && item.status !== "removed",
    ),
  );
}

function findDuplicateActiveQueueItem(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  sourceType: string,
  sourceUrl: string,
) {
  const normalizedSourceType = normalizeSourceType(sourceType);
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl);

  return activeQueueItems(ctx, roomId).find(
    (item) =>
      normalizeSourceType(item.source_type) === normalizedSourceType &&
      normalizeSourceUrl(item.source_url) === normalizedSourceUrl,
  );
}

function findKnownProblemQueueItem(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  sourceType: string,
  sourceUrl: string,
) {
  const normalizedSourceType = normalizeSourceType(sourceType);
  const normalizedSourceUrl = normalizeSourceUrl(sourceUrl);

  return [...ctx.db.live_queue_item.iter()].find(
    (item) =>
      item.room_id === roomId &&
      item.is_unavailable &&
      isPermanentMediaFailureCode(item.failure_code) &&
      normalizeSourceType(item.source_type) === normalizedSourceType &&
      normalizeSourceUrl(item.source_url) === normalizedSourceUrl,
  );
}

function queuedQueueItems(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  return selectQueuedQueueItems(activeQueueItems(ctx, roomId));
}

function nextQueuePosition(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  const items = activeQueueItems(ctx, roomId);
  return calculateNextQueuePosition(items);
}

function nextPlayedSequence(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  const items = [...ctx.db.live_queue_item.iter()].filter(
    (item) => item.room_id === roomId,
  );
  return calculateNextPlayedSequence(items);
}

function nextPlaybackQueueItem(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  queueMode: string,
) {
  const items = roomQueueItems(ctx, roomId);
  const queuedItem = items.find(
    (item) => item.status === "queued" && !item.is_unavailable,
  );

  if (queuedItem || normalizeQueueMode(queueMode) !== "loop") {
    return queuedItem;
  }

  return items.find((item) => item.status === "played" && !item.is_unavailable);
}

function playNextQueuePosition(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  excludeQueueItemId?: string,
) {
  return calculatePlayNextQueuePosition(
    queuedQueueItems(ctx, roomId),
    excludeQueueItemId,
  );
}

function shiftQueuedItemsAtOrAfter(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  position: number,
  excludeQueueItemId?: string,
) {
  queuedQueueItems(ctx, roomId)
    .filter(
      (item) =>
        item.queue_item_id !== excludeQueueItemId && item.position >= position,
    )
    .sort((a, b) => b.position - a.position)
    .forEach((item) => {
      replaceQueueItem(ctx, item, {
        position: item.position + 1,
      });
    });
}

function replaceQueueItem(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  item: NonNullable<
    ReturnType<
      Parameters<
        Parameters<typeof spacetimedb.reducer>[1]
      >[0]["db"]["live_queue_item"]["queue_item_id"]["find"]
    >
  >,
  patch: Partial<typeof item>,
) {
  ctx.db.live_queue_item.delete(item);
  ctx.db.live_queue_item.insert({
    ...item,
    ...patch,
  });
}

function commitQueueAdvance(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  session: NonNullable<
    ReturnType<
      Parameters<
        Parameters<typeof spacetimedb.reducer>[1]
      >[0]["db"]["room_session"]["room_id"]["find"]
    >
  >,
  nextQueueItem: NonNullable<
    ReturnType<
      Parameters<
        Parameters<typeof spacetimedb.reducer>[1]
      >[0]["db"]["live_queue_item"]["queue_item_id"]["find"]
    >
  >,
  sourceUrl: string,
  playbackStatus: "paused" | "playing" = "playing",
  transition?: {
    actorMemberId: string;
    outcome: "completed" | "failed" | "skipped";
    reason: string;
  },
  options?: {
    preserveCurrentAsNext?: boolean;
  },
) {
  if (transition) {
    finishPlaybackOccurrence(
      recommendationContext(ctx),
      {
        actorMemberId: transition.actorMemberId,
        completionRatioBps: completionRatioBps(
          session.position_seconds,
          session.source_duration_seconds,
        ),
        outcome: transition.outcome,
        reason: transition.reason,
        roomId: session.room_id,
      },
      nowMs(),
    );
  }

  const queueItems = roomQueueItems(ctx, session.room_id);
  const patches = calculateQueueAdvancePatches(
    queueItems,
    nextQueueItem.queue_item_id,
    nextPlayedSequence(ctx, session.room_id),
    options?.preserveCurrentAsNext,
  );

  for (const { queue_item_id: queueItemId, ...patch } of patches) {
    const item = ctx.db.live_queue_item.queue_item_id.find(queueItemId);

    if (item) {
      replaceQueueItem(ctx, item, patch);
    }
  }

  const media = recommendationMediaIdentity({
    queueItemId: nextQueueItem.queue_item_id,
    sourceType: nextQueueItem.source_type,
    sourceUrl: nextQueueItem.source_url,
  });
  const occurrence =
    transition && media && playbackStatus === "playing"
      ? beginPlaybackOccurrence(
          recommendationContext(ctx),
          {
            actorMemberId: transition.actorMemberId,
            contributorMemberId: nextQueueItem.added_by_member_id,
            durationSeconds: nextQueueItem.duration_seconds,
            mediaId: media.mediaId,
            queueItemId: nextQueueItem.queue_item_id,
            roomId: session.room_id,
            sourceType: media.sourceType,
          },
          nowMs(),
        )
      : null;

  ctx.db.room_session.delete(session);
  ctx.db.room_session.insert({
    ...session,
    active_queue_item_id: nextQueueItem.queue_item_id,
    playback_rate: 1,
    playback_occurrence_id: occurrence?.playback_occurrence_id,
    position_seconds: 0,
    server_updated_ms: nowMs(),
    source_duration_seconds: nextQueueItem.duration_seconds,
    source_title: nextQueueItem.title ?? nextQueueItem.source_url,
    source_type: normalizeSourceType(nextQueueItem.source_type),
    source_url: sourceUrl,
    status: playbackStatus,
  });

  normalizeQueuedPositions(ctx, session.room_id);
}

function normalizeQueuedPositions(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  queuedQueueItems(ctx, roomId).forEach((item, index) => {
    if (item.position === index) {
      return;
    }

    replaceQueueItem(ctx, item, {
      position: index,
    });
  });
}

function deleteParticipantAndPermissions(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  participant: NonNullable<ReturnType<typeof getParticipant>>,
) {
  removeMemberSessions(ctx, participant.room_id, participant.member_id);

  const permission = ctx.db.room_permission.permission_key.find(
    permissionKey(participant.room_id, participant.member_id),
  );

  if (permission) {
    ctx.db.room_permission.delete(permission);
  }

  ctx.db.room_participant.delete(participant);
}

export const kick_member = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
    target_member_id: t.string(),
  },
  (ctx, { actor_member_id, room_id, target_member_id }) => {
    if (!getAuthorizedHost(ctx, room_id, actor_member_id)) {
      return;
    }

    const target = getParticipant(ctx, room_id, target_member_id);

    if (!target) {
      recordRoomError(ctx, {
        code: "target_missing",
        message: "Kick ignored because the target participant is missing.",
        roomId: room_id,
      });
      return;
    }

    if (target.role === "host") {
      recordRoomError(ctx, {
        code: "permission_denied",
        message: "The host cannot be kicked from their own room.",
        roomId: room_id,
      });
      return;
    }

    deleteParticipantAndPermissions(ctx, target);

    const existingKick = ctx.db.room_kick.kick_key.find(
      kickKey(room_id, target_member_id),
    );

    if (existingKick) {
      ctx.db.room_kick.delete(existingKick);
    }

    ctx.db.room_kick.insert({
      actor_member_id,
      created_ms: nowMs(),
      kick_key: kickKey(room_id, target_member_id),
      member_id: target_member_id,
      room_id,
    });
  },
);

export const remove_idle_member = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
    target_member_id: t.string(),
  },
  (ctx, { actor_member_id, room_id, target_member_id }) => {
    if (!getAuthorizedHost(ctx, room_id, actor_member_id)) {
      return;
    }

    const target = getParticipant(ctx, room_id, target_member_id);

    if (!target) {
      recordRoomError(ctx, {
        code: "target_missing",
        message:
          "Idle member removal ignored because the target participant is missing.",
        roomId: room_id,
      });
      return;
    }

    if (target.role === "host" || target.status !== "idle") {
      recordRoomError(ctx, {
        code: "permission_denied",
        message: "Only idle guest members can be removed with this action.",
        roomId: room_id,
      });
      return;
    }

    deleteParticipantAndPermissions(ctx, target);
  },
);

export const heartbeat = spacetimedb.reducer(
  {
    member_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { member_id, room_id }) => {
    const participant = getParticipant(ctx, room_id, member_id);
    const participantSession = getCurrentParticipantSession(
      ctx,
      room_id,
      member_id,
    );

    if (!participant || !participantSession) {
      recordRoomError(ctx, {
        code: "participant_missing",
        message: "Heartbeat received before join_room.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    if (!isCurrentParticipantSession(ctx, room_id, member_id)) {
      recordRoomError(ctx, {
        code: "identity_mismatch",
        message:
          "Heartbeat ignored because the caller does not own the participant.",
        roomId: room_id,
      });
      return;
    }

    const presence = ctx.db.room_participant_presence.admission_id.find(
      participantSession.admission_id,
    );

    ctx.db.room_participant_session.delete(participantSession);
    ctx.db.room_participant_session.insert({
      ...participantSession,
      connection_id: ctx.connectionId ?? undefined,
      last_seen_ms: nowMs(),
      status: "online",
    });

    if (presence) {
      ctx.db.room_participant_presence.delete(presence);
      ctx.db.room_participant_presence.insert({
        ...presence,
        last_seen_ms: nowMs(),
        status: "online",
      });
    }

    upsertAggregateParticipant(ctx, {
      avatarKey: participant.avatar_key,
      displayName: participant.display_name,
      identity: ctx.sender,
      memberId: member_id,
      role: participantSession.role,
      roomId: room_id,
      status: "online",
    });
  },
);

export const issue_room_seed_grant = spacetimedb.reducer(
  {
    expires_ms: t.i64(),
    host_member_id: t.string(),
    room_id: t.string(),
    seed_token: t.string(),
  },
  (ctx, { expires_ms, host_member_id, room_id, seed_token }) => {
    if (!isTrustedRecommendationAuthority(ctx)) {
      recordRoomError(ctx, {
        code: "seed_issuer_denied",
        message:
          "Seed grant ignored because the caller is not a trusted server issuer.",
        roomId: room_id,
      });
      return;
    }

    const trimmedToken = seed_token.trim();
    const now = nowMs();
    const maxExpiryMs = now + BigInt(5 * 60 * 1000);

    if (!room_id.trim() || !host_member_id.trim() || trimmedToken.length < 32) {
      recordRoomError(ctx, {
        code: "seed_grant_invalid",
        message:
          "Seed grant ignored because its room, host, or token was invalid.",
        roomId: room_id,
      });
      return;
    }

    if (expires_ms <= now || expires_ms > maxExpiryMs) {
      recordRoomError(ctx, {
        code: "seed_grant_expiry_invalid",
        message:
          "Seed grant ignored because its expiry was missing, expired, or too far in the future.",
        roomId: room_id,
      });
      return;
    }

    const grantKey = roomSeedGrantKey(room_id, host_member_id);
    const existing = ctx.db.room_seed_grant.grant_key.find(grantKey);

    if (existing) {
      ctx.db.room_seed_grant.delete(existing);
    }

    ctx.db.room_seed_grant.insert({
      created_by_identity: ctx.sender,
      created_ms: now,
      expires_ms,
      grant_key: grantKey,
      host_member_id,
      room_id,
      seed_token: trimmedToken,
    });
  },
);

export const seed_room_session = spacetimedb.reducer(
  {
    host_member_id: t.string(),
    mode: t.string(),
    room_name: t.string(),
    room_id: t.string(),
    seed_token: t.string(),
  },
  (ctx, { host_member_id, mode, room_name, room_id, seed_token }) => {
    const existing = ctx.db.room_session.room_id.find(room_id);

    if (existing) {
      const nextName = normalizeRoomName(room_name);

      if (
        existing.room_name === "Untitled room" &&
        nextName !== "Untitled room"
      ) {
        ctx.db.room_session.delete(existing);
        ctx.db.room_session.insert({
          ...existing,
          room_name: nextName,
        });
      }

      return;
    }

    const seedGrant = getValidRoomSeedGrant(
      ctx,
      room_id,
      host_member_id,
      seed_token,
    );

    if (!seedGrant) {
      recordRoomError(ctx, {
        code: "seed_authority_denied",
        message:
          "Live room seed ignored because no valid private seed grant exists.",
        roomId: room_id,
      });
      return;
    }

    ctx.db.room_seed_grant.delete(seedGrant);

    ctx.db.room_session.insert({
      active_queue_item_id: undefined,
      controller_identity: undefined,
      host_member_id,
      mode,
      playback_rate: 1,
      playback_occurrence_id: undefined,
      position_seconds: 0,
      queue_autoplay_enabled: true,
      queue_mode: "normal",
      room_name: normalizeRoomName(room_name),
      room_id,
      server_updated_ms: nowMs(),
      source_title: undefined,
      source_type: undefined,
      source_url: undefined,
      source_duration_seconds: undefined,
      status: "paused",
      supabase_room_id: room_id,
    });

    upsertPermission(ctx, {
      canAddQueue: true,
      canControlBrowser: true,
      canControlPlayback: true,
      canManageQueue: true,
      memberId: host_member_id,
      roomId: room_id,
      updatedByMemberId: host_member_id,
    });
  },
);

export const update_room_name = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
    room_name: t.string(),
  },
  (ctx, { actor_member_id, room_id, room_name }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      room_name: normalizeRoomName(room_name),
    });
  },
);

export const update_room_mode = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    mode: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, mode, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      mode: normalizeRoomMode(mode),
    });
  },
);

export const set_queue_autoplay = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    enabled: t.bool(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, enabled, room_id }) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      queue_autoplay_enabled: enabled,
    });
  },
);

export const set_queue_mode = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    mode: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, mode, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      queue_mode: normalizeQueueMode(mode),
    });
  },
);

export const load_media_source = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
    source_title: t.string(),
    source_type: t.string(),
    source_url: t.string(),
  },
  (
    ctx,
    { actor_member_id, room_id, source_title, source_type, source_url },
  ) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    const trimmedUrl = normalizeSourceUrl(source_url);

    if (!trimmedUrl) {
      recordRoomError(ctx, {
        code: "source_invalid",
        message: "Media source load ignored because the URL was empty.",
        roomId: room_id,
      });
      return;
    }

    for (const item of activeQueueItems(ctx, room_id)) {
      if (item.status === "playing") {
        replaceQueueItem(ctx, item, {
          status: "played",
        });
      }
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      active_queue_item_id: undefined,
      playback_rate: 1,
      position_seconds: 0,
      server_updated_ms: nowMs(),
      source_title: source_title.trim() || trimmedUrl,
      source_type: normalizeSourceType(source_type),
      source_url: trimmedUrl,
      source_duration_seconds: undefined,
      status: "paused",
    });
  },
);

export const set_playback_state = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    playback_rate: t.f64(),
    position_seconds: t.f64(),
    room_id: t.string(),
    status: t.string(),
  },
  (ctx, { actor_member_id, position_seconds, room_id, status }) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    const nextStatus = normalizePlaybackStatus(status);

    ctx.db.room_session.delete(authority.session);
    const updatedSession = ctx.db.room_session.insert({
      ...authority.session,
      playback_rate: 1,
      position_seconds: clampPositionSeconds(position_seconds),
      server_updated_ms: nowMs(),
      status: nextStatus,
    });

    const activeQueueItem = authority.session.active_queue_item_id
      ? ctx.db.live_queue_item.queue_item_id.find(
          authority.session.active_queue_item_id,
        )
      : undefined;
    const media = activeQueueItem
      ? recommendationMediaIdentity({
          queueItemId: activeQueueItem.queue_item_id,
          sourceType: activeQueueItem.source_type,
          sourceUrl: activeQueueItem.source_url,
        })
      : null;

    if (nextStatus === "playing" && activeQueueItem && media) {
      const occurrence = beginPlaybackOccurrenceIfMissing(
        recommendationContext(ctx),
        {
          actorMemberId: actor_member_id,
          contributorMemberId: activeQueueItem.added_by_member_id,
          durationSeconds: activeQueueItem.duration_seconds,
          mediaId: media.mediaId,
          queueItemId: activeQueueItem.queue_item_id,
          roomId: room_id,
          sourceType: media.sourceType,
        },
        nowMs(),
      );

      if (
        updatedSession.playback_occurrence_id !==
        occurrence.playback_occurrence_id
      ) {
        ctx.db.room_session.delete(updatedSession);
        ctx.db.room_session.insert({
          ...updatedSession,
          playback_occurrence_id: occurrence.playback_occurrence_id,
        });
      }
    }
  },
);

export const update_media_title = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    duration_seconds: t.option(t.u32()),
    room_id: t.string(),
    source_title: t.string(),
  },
  (ctx, { actor_member_id, duration_seconds, room_id, source_title }) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    const title = source_title.trim();

    if (!title) {
      return;
    }

    const activeQueueItem = authority.session.active_queue_item_id
      ? ctx.db.live_queue_item.queue_item_id.find(
          authority.session.active_queue_item_id,
        )
      : null;
    const activeQueueDuration =
      activeQueueItem?.room_id === room_id
        ? activeQueueItem.duration_seconds
        : undefined;
    const existingDuration = authority.session.source_duration_seconds;
    const effectiveDuration =
      activeQueueDuration ?? duration_seconds ?? existingDuration;

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      source_duration_seconds: effectiveDuration,
      source_title: title,
    });

    if (activeQueueItem && activeQueueItem.room_id === room_id) {
      if (activeQueueItem.duration_seconds === undefined) {
        replaceQueueItem(ctx, activeQueueItem, {
          duration_seconds,
          title,
        });
      } else {
        replaceQueueItem(ctx, activeQueueItem, {
          title,
        });
      }
    }
  },
);

export const add_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    artist: t.string(),
    channel_name: t.option(t.string()),
    duration_seconds: t.option(t.u32()),
    is_pinned: t.bool(),
    is_play_next: t.bool(),
    is_unavailable: t.bool(),
    allow_duplicate: t.bool().default(false),
    client_action_id: t.string().default(""),
    playlist_id: t.option(t.string()),
    playlist_title: t.option(t.string()),
    room_id: t.string(),
    source_title: t.string(),
    source_type: t.string(),
    source_url: t.string(),
    thumbnail_url: t.option(t.string()),
  },
  (
    ctx,
    {
      actor_member_id,
      artist,
      channel_name,
      duration_seconds,
      is_pinned,
      is_play_next,
      is_unavailable,
      allow_duplicate,
      client_action_id,
      playlist_id,
      playlist_title,
      room_id,
      source_title,
      source_type,
      source_url,
      thumbnail_url,
    },
  ) => {
    const authority = getAuthorizedQueueAddActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    const trimmedUrl = source_url.trim();

    if (!trimmedUrl) {
      recordRoomError(ctx, {
        code: "queue_source_invalid",
        message: "Queue item ignored because the source URL was empty.",
        roomId: room_id,
      });
      return;
    }

    if (
      !allow_duplicate &&
      findDuplicateActiveQueueItem(ctx, room_id, source_type, trimmedUrl)
    ) {
      recordRoomError(ctx, {
        code: "queue_duplicate_ignored",
        message:
          "Queue item ignored because the same active source is already in the live queue.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    const knownProblem = findKnownProblemQueueItem(
      ctx,
      room_id,
      source_type,
      trimmedUrl,
    );

    if (
      !claimRecommendationAction(
        recommendationContext(ctx),
        {
          actionId: client_action_id,
          actionType: "queue_add",
          actorMemberId: actor_member_id,
          roomId: room_id,
        },
        nowMs(),
      )
    ) {
      return;
    }

    const position = is_play_next
      ? playNextQueuePosition(ctx, room_id)
      : nextQueuePosition(ctx, room_id);

    if (is_play_next) {
      shiftQueuedItemsAtOrAfter(ctx, room_id, position);
    }

    const queueItem = ctx.db.live_queue_item.insert({
      added_by_member_id: actor_member_id,
      artist: artist?.trim() || undefined,
      channel_name: channel_name?.trim() || undefined,
      duration_seconds: normalizeDurationSeconds(duration_seconds),
      failure_code: knownProblem?.failure_code,
      failure_count: knownProblem?.failure_count ?? 0,
      failure_created_ms: knownProblem?.failure_created_ms,
      failure_reason: knownProblem?.failure_reason,
      is_pinned,
      is_play_next,
      is_unavailable: is_unavailable || Boolean(knownProblem),
      played_sequence: 0,
      playlist_id: playlist_id?.trim() || undefined,
      playlist_title: playlist_title?.trim() || undefined,
      position,
      queue_item_id: ctx.newUuidV7().toString(),
      room_id,
      source_type: normalizeSourceType(source_type),
      source_url: trimmedUrl,
      status: "queued",
      thumbnail_url: thumbnail_url?.trim() || undefined,
      title: source_title.trim() || trimmedUrl,
    });

    recordQueueRecommendationEvent(ctx, queueItem, {
      actorMemberId: actor_member_id,
      eventType: is_play_next ? "queue_play_next" : "queue_added",
      reason: is_play_next ? "add_as_next" : "manual_add",
    });
  },
);

export const send_room_chat_message = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_message_id: t.string(),
    room_id: t.string(),
    text: t.string(),
  },
  (ctx, { actor_member_id, client_message_id, room_id, text }) => {
    const actor = getParticipant(ctx, room_id, actor_member_id);

    if (!actor || !isParticipantSender(ctx, actor)) {
      recordRoomError(ctx, {
        code: "chat_permission_denied",
        message:
          "Chat message ignored because the caller is not an active room participant.",
        roomId: room_id,
      });
      return;
    }

    const normalizedText = normalizeChatText(text);

    if (!normalizedText) {
      recordRoomError(ctx, {
        code: "chat_message_empty",
        message: "Chat message ignored because it was empty.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    const safeClientMessageId = client_message_id.trim();

    if (!safeClientMessageId || safeClientMessageId.length > 120) {
      recordRoomError(ctx, {
        code: "chat_message_invalid",
        message: "Chat message ignored because its client id was invalid.",
        roomId: room_id,
      });
      return;
    }

    const messageId = chatMessageId(room_id, safeClientMessageId);

    if (ctx.db.room_chat_message.message_id.find(messageId)) {
      return;
    }

    ctx.db.room_chat_message.insert({
      avatar_key: actor.avatar_key,
      client_message_id: safeClientMessageId,
      created_ms: nowMs(),
      display_name: actor.display_name || "Guest",
      is_host: actor.role === "host",
      member_id: actor_member_id,
      message_id: messageId,
      room_id,
      text: normalizedText,
    });

    pruneRoomChatMessages(ctx, room_id);
  },
);

export const set_queue_item_priority = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string(),
    is_pinned: t.bool(),
    is_play_next: t.bool(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      client_action_id,
      is_pinned,
      is_play_next,
      queue_item_id,
      room_id,
    },
  ) => {
    const authority = getAuthorizedQueueManager(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.status !== "queued" ||
      !client_action_id.trim()
    ) {
      return;
    }

    const position = is_play_next
      ? playNextQueuePosition(ctx, room_id, queue_item_id)
      : queueItem.position;

    if (is_play_next) {
      shiftQueuedItemsAtOrAfter(ctx, room_id, position, queue_item_id);
    }

    replaceQueueItem(ctx, queueItem, {
      is_pinned,
      is_play_next,
      position,
    });

    if (
      queueItem.is_pinned !== is_pinned ||
      queueItem.is_play_next !== is_play_next ||
      queueItem.position !== position
    ) {
      recordQueueRecommendationEvent(
        ctx,
        { ...queueItem, position },
        {
          actionId: client_action_id,
          actorMemberId: actor_member_id,
          eventType: is_play_next ? "queue_play_next" : "queue_reordered",
          reason: is_play_next ? "priority_play_next" : "priority_changed",
        },
      );
    }

    normalizeQueuedPositions(ctx, room_id);
  },
);

export const advance_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    autoplay: t.bool().default(true),
    expected_active_queue_item_id: t.option(t.string()),
    expected_playback_occurrence_id: t.option(t.string()),
    expected_source_url: t.option(t.string()),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      autoplay,
      expected_active_queue_item_id,
      expected_playback_occurrence_id,
      expected_source_url,
      room_id,
    },
  ) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    if (autoplay && !authority.session.queue_autoplay_enabled) {
      return;
    }

    const expectedActiveQueueItemId =
      expected_active_queue_item_id?.trim() || undefined;
    const expectedPlaybackOccurrenceId =
      expected_playback_occurrence_id?.trim() || undefined;
    const expectedSourceUrl = expected_source_url?.trim() || undefined;

    if (
      expectedActiveQueueItemId &&
      authority.session.active_queue_item_id !== expectedActiveQueueItemId
    ) {
      return;
    }

    if (
      expectedPlaybackOccurrenceId &&
      authority.session.playback_occurrence_id !== expectedPlaybackOccurrenceId
    ) {
      return;
    }

    if (
      expectedSourceUrl &&
      normalizeSourceUrl(authority.session.source_url ?? "") !==
        normalizeSourceUrl(expectedSourceUrl)
    ) {
      return;
    }

    const nextQueueItem = nextPlaybackQueueItem(
      ctx,
      room_id,
      authority.session.queue_mode,
    );

    if (
      !nextQueueItem ||
      nextQueueItem.queue_item_id === authority.session.active_queue_item_id
    ) {
      return;
    }

    const nextSourceUrl = resolveQueuePlaybackSource(
      nextQueueItem.source_url,
      undefined,
    );

    if (!nextSourceUrl) {
      return;
    }

    commitQueueAdvance(
      ctx,
      authority.session,
      nextQueueItem,
      nextSourceUrl,
      "playing",
      {
        actorMemberId: actor_member_id,
        ...classifyPlaybackAdvance({
          autoplay,
          completionRatioBps: completionRatioBps(
            authority.session.position_seconds,
            authority.session.source_duration_seconds,
          ),
          playbackStatus: authority.session.status,
        }),
      },
    );
  },
);

export const advance_uploaded_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    autoplay: t.bool().default(true),
    expected_active_queue_item_id: t.option(t.string()),
    expected_next_queue_item_id: t.string(),
    expected_playback_occurrence_id: t.option(t.string()),
    expected_source_url: t.option(t.string()),
    resolved_source_url: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      autoplay,
      expected_active_queue_item_id,
      expected_next_queue_item_id,
      expected_playback_occurrence_id,
      expected_source_url,
      resolved_source_url,
      room_id,
    },
  ) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority || (autoplay && !authority.session.queue_autoplay_enabled)) {
      return;
    }

    const expectedActiveQueueItemId =
      expected_active_queue_item_id?.trim() || undefined;
    const expectedNextQueueItemId = expected_next_queue_item_id.trim();
    const expectedPlaybackOccurrenceId =
      expected_playback_occurrence_id?.trim() || undefined;
    const expectedSourceUrl = expected_source_url?.trim() || undefined;
    const resolvedSourceUrl = resolved_source_url.trim();

    if (
      !expectedNextQueueItemId ||
      (expectedActiveQueueItemId &&
        authority.session.active_queue_item_id !== expectedActiveQueueItemId) ||
      (expectedPlaybackOccurrenceId &&
        authority.session.playback_occurrence_id !==
          expectedPlaybackOccurrenceId) ||
      (expectedSourceUrl &&
        normalizeSourceUrl(authority.session.source_url ?? "") !==
          normalizeSourceUrl(expectedSourceUrl))
    ) {
      return;
    }

    const nextQueueItem = nextPlaybackQueueItem(
      ctx,
      room_id,
      authority.session.queue_mode,
    );

    if (
      !nextQueueItem ||
      nextQueueItem.queue_item_id === authority.session.active_queue_item_id ||
      nextQueueItem.queue_item_id !== expectedNextQueueItemId
    ) {
      return;
    }

    const nextSourceUrl = resolveQueuePlaybackSource(
      nextQueueItem.source_url,
      resolvedSourceUrl,
    );

    if (!nextSourceUrl) {
      return;
    }

    commitQueueAdvance(
      ctx,
      authority.session,
      nextQueueItem,
      nextSourceUrl,
      "playing",
      {
        actorMemberId: actor_member_id,
        ...classifyPlaybackAdvance({
          autoplay,
          completionRatioBps: completionRatioBps(
            authority.session.position_seconds,
            authority.session.source_duration_seconds,
          ),
          playbackStatus: authority.session.status,
        }),
      },
    );
  },
);

export const play_uploaded_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string().default(""),
    queue_item_id: t.string(),
    resolved_source_url: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      client_action_id,
      queue_item_id,
      resolved_source_url,
      room_id,
    },
  ) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(
      queue_item_id.trim(),
    );

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.is_unavailable ||
      (queueItem.status !== "queued" &&
        queueItem.status !== "playing" &&
        queueItem.status !== "played")
    ) {
      return;
    }

    const sourceUrl = resolveQueuePlaybackSource(
      queueItem.source_url,
      resolved_source_url.trim(),
    );

    if (!sourceUrl) {
      return;
    }

    if (
      !claimRecommendationAction(
        recommendationContext(ctx),
        {
          actionId: client_action_id,
          actionType: "play_uploaded_queue_item",
          actorMemberId: actor_member_id,
          roomId: room_id,
        },
        nowMs(),
      )
    ) {
      return;
    }

    commitQueueAdvance(
      ctx,
      authority.session,
      queueItem,
      sourceUrl,
      "playing",
      {
        actorMemberId: actor_member_id,
        outcome: "skipped",
        reason: "manual_play",
      },
      {
        preserveCurrentAsNext: queueItem.status === "played",
      },
    );
  },
);

export const report_media_failure = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    allow_autoplay_advance: t.bool().default(false),
    expected_active_queue_item_id: t.option(t.string()),
    expected_playback_occurrence_id: t.option(t.string()),
    expected_source_url: t.string(),
    failure_code: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      allow_autoplay_advance,
      expected_active_queue_item_id,
      expected_playback_occurrence_id,
      expected_source_url,
      failure_code,
      room_id,
    },
  ) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    const expectedActiveQueueItemId =
      expected_active_queue_item_id?.trim() || undefined;
    const expectedPlaybackOccurrenceId =
      expected_playback_occurrence_id?.trim() || undefined;
    const expectedSourceUrl = normalizeSourceUrl(expected_source_url);
    const activeSourceUrl = normalizeSourceUrl(
      authority.session.source_url ?? "",
    );

    if (
      !expectedSourceUrl ||
      expectedSourceUrl !== activeSourceUrl ||
      (authority.session.playback_occurrence_id &&
        authority.session.playback_occurrence_id !==
          expectedPlaybackOccurrenceId) ||
      (expectedActiveQueueItemId &&
        authority.session.active_queue_item_id !== expectedActiveQueueItemId)
    ) {
      return;
    }

    const activeQueueItemId = authority.session.active_queue_item_id;
    const activeQueueItem = activeQueueItemId
      ? ctx.db.live_queue_item.queue_item_id.find(activeQueueItemId)
      : undefined;
    const failure = normalizeMediaFailure(failure_code);
    const failureCreatedMs = nowMs();
    const sourceType = normalizeSourceType(
      authority.session.source_type ?? activeQueueItem?.source_type ?? "direct",
    );
    const title = (
      activeQueueItem?.title ??
      authority.session.source_title ??
      "Current media"
    )
      .trim()
      .slice(0, 160);
    const providerId = mediaProviderId(
      sourceType,
      activeSourceUrl,
      activeQueueItemId,
    );
    const duplicateEvent = [...ctx.db.room_error.iter()].find(
      (error) =>
        error.room_id === room_id &&
        error.code === `media_${failure.code}` &&
        error.provider_id === providerId &&
        Number(failureCreatedMs - error.created_ms) < 5_000,
    );

    if (duplicateEvent) {
      return;
    }

    for (const item of [...ctx.db.live_queue_item.iter()]) {
      const matchesCurrent = item.queue_item_id === activeQueueItemId;
      const matchesPermanentSource =
        failure.permanent &&
        item.room_id === room_id &&
        normalizeSourceType(item.source_type) === sourceType &&
        normalizeSourceUrl(item.source_url) === activeSourceUrl;

      if (!matchesCurrent && !matchesPermanentSource) {
        continue;
      }

      replaceQueueItem(ctx, item, {
        failure_code: failure.code,
        failure_count: (item.failure_count ?? 0) + 1,
        failure_created_ms: failureCreatedMs,
        failure_reason: failure.reason,
        is_unavailable: item.is_unavailable || failure.permanent,
      });
    }

    const nextQueueItem = nextPlaybackQueueItem(
      ctx,
      room_id,
      authority.session.queue_mode,
    );
    const canAdvance = Boolean(
      failure.permanent &&
      allow_autoplay_advance &&
      authority.session.queue_autoplay_enabled &&
      nextQueueItem &&
      nextQueueItem.queue_item_id !== activeQueueItemId,
    );

    recordRoomError(
      ctx,
      createMediaFailureEvent({
        actorMemberId: actor_member_id,
        canAdvance,
        failure,
        queueItemId: activeQueueItemId,
        roomId: room_id,
        sourceType,
        sourceUrl: activeSourceUrl,
        title,
      }),
    );

    if (activeQueueItem) {
      recordSourceFailureEvent(
        recommendationContext(ctx),
        activeQueueItem,
        actor_member_id,
        failure.code,
        nowMs(),
      );
    }

    if (canAdvance && nextQueueItem) {
      commitQueueAdvance(
        ctx,
        authority.session,
        nextQueueItem,
        nextQueueItem.source_url,
        "playing",
        {
          actorMemberId: actor_member_id,
          outcome: "failed",
          reason: "source_failure_advance",
        },
      );
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      server_updated_ms: nowMs(),
      status: "error",
    });
  },
);

export const play_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string().default(""),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, client_action_id, queue_item_id, room_id }) => {
    const authority = getAuthorizedPlaybackActor(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.is_unavailable ||
      (queueItem.status !== "queued" &&
        queueItem.status !== "playing" &&
        queueItem.status !== "played")
    ) {
      return;
    }

    if (
      !claimRecommendationAction(
        recommendationContext(ctx),
        {
          actionId: client_action_id,
          actionType: "play_queue_item",
          actorMemberId: actor_member_id,
          roomId: room_id,
        },
        nowMs(),
      )
    ) {
      return;
    }

    commitQueueAdvance(
      ctx,
      authority.session,
      queueItem,
      queueItem.source_url,
      "paused",
      {
        actorMemberId: actor_member_id,
        outcome: "skipped",
        reason: "manual_play",
      },
      {
        preserveCurrentAsNext: queueItem.status === "played",
      },
    );
  },
);

export const move_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string(),
    position: t.u32(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    { actor_member_id, client_action_id, position, queue_item_id, room_id },
  ) => {
    const authority = getAuthorizedQueueManager(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.status !== "queued" ||
      !client_action_id.trim()
    ) {
      return;
    }

    const items = queuedQueueItems(ctx, room_id);
    const movingIndex = items.findIndex(
      (item) => item.queue_item_id === queue_item_id,
    );

    const targetPosition = Math.min(position, Math.max(0, items.length - 1));

    if (movingIndex < 0 || movingIndex === targetPosition) {
      return;
    }

    const [movingItem] = items.splice(movingIndex, 1);
    items.splice(Math.min(position, items.length), 0, movingItem);

    items.forEach((item, index) => {
      replaceQueueItem(ctx, item, {
        position: index,
      });
    });

    recordQueueRecommendationEvent(
      ctx,
      { ...queueItem, position: targetPosition },
      {
        actionId: client_action_id,
        actorMemberId: actor_member_id,
        eventType: "queue_reordered",
        reason: "manual_reorder",
      },
    );
  },
);

export const remove_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, queue_item_id, room_id }) => {
    const authority = getAuthorizedQueueManager(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (!authority || !queueItem || queueItem.room_id !== room_id) {
      return;
    }

    recordQueueRecommendationEvent(ctx, queueItem, {
      actorMemberId: actor_member_id,
      eventType: "queue_removed",
      reason: "manual_remove",
    });
    ctx.db.live_queue_item.delete(queueItem);

    if (authority.session.active_queue_item_id === queue_item_id) {
      finishPlaybackOccurrence(
        recommendationContext(ctx),
        {
          actorMemberId: actor_member_id,
          completionRatioBps: completionRatioBps(
            authority.session.position_seconds,
            authority.session.source_duration_seconds,
          ),
          outcome: "skipped",
          reason: "active_item_removed",
          roomId: room_id,
        },
        nowMs(),
      );
      ctx.db.room_session.delete(authority.session);
      ctx.db.room_session.insert({
        ...authority.session,
        active_queue_item_id: undefined,
        playback_rate: 1,
        playback_occurrence_id: undefined,
        position_seconds: 0,
        server_updated_ms: nowMs(),
        source_duration_seconds: undefined,
        source_title: undefined,
        source_type: undefined,
        source_url: undefined,
        status: "paused",
      });
    }

    normalizeQueuedPositions(ctx, room_id);
  },
);

export const clear_queue = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, room_id }) => {
    if (!getAuthorizedQueueManager(ctx, room_id, actor_member_id)) {
      return;
    }

    for (const item of activeQueueItems(ctx, room_id)) {
      if (item.status === "queued") {
        ctx.db.live_queue_item.delete(item);
      }
    }
  },
);

export const set_member_permissions = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    can_add_queue: t.bool(),
    can_control_browser: t.bool(),
    can_control_playback: t.bool(),
    can_manage_queue: t.bool(),
    room_id: t.string(),
    target_member_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      can_add_queue,
      can_control_browser,
      can_control_playback,
      can_manage_queue,
      room_id,
      target_member_id,
    },
  ) => {
    if (!getAuthorizedHost(ctx, room_id, actor_member_id)) {
      return;
    }

    const target = getParticipant(ctx, room_id, target_member_id);

    if (!target) {
      recordRoomError(ctx, {
        code: "target_missing",
        message:
          "Permission update ignored because the target participant is missing.",
        roomId: room_id,
      });
      return;
    }

    const targetIsHost = target.role === "host";

    upsertPermission(ctx, {
      canAddQueue: targetIsHost || can_add_queue,
      canControlBrowser: targetIsHost || can_control_browser,
      canControlPlayback: targetIsHost || can_control_playback,
      canManageQueue: targetIsHost || can_add_queue || can_manage_queue,
      memberId: target_member_id,
      roomId: room_id,
      updatedByMemberId: actor_member_id,
    });
  },
);

export const grant_room_control = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
    target_member_id: t.string(),
  },
  (ctx, { actor_member_id, room_id, target_member_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);
    const target = getParticipant(ctx, room_id, target_member_id);

    if (!authority || !target) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      controller_identity: target.identity,
    });
  },
);

export const revoke_room_control = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);

    if (!authority) {
      return;
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      controller_identity: undefined,
    });
  },
);
