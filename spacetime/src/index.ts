import { schema, table, t } from "spacetimedb/server";

const roomSession = table(
  {
    name: "room_session",
    public: true,
  },
  {
    active_queue_item_id: t.option(t.string()),
    controller_identity: t.option(t.identity()),
    host_member_id: t.string(),
    mode: t.string(),
    playback_rate: t.f64(),
    position_seconds: t.f64(),
    room_id: t.string().primaryKey(),
    server_updated_ms: t.i64(),
    status: t.string(),
    supabase_room_id: t.string(),
    source_title: t.option(t.string()).default(undefined),
    source_type: t.option(t.string()).default(undefined),
    source_url: t.option(t.string()).default(undefined),
    source_duration_seconds: t.option(t.u32()).default(undefined),
    room_name: t.string().default("Untitled room"),
    queue_autoplay_enabled: t.bool().default(true),
    queue_mode: t.string().default("normal"),
  },
);

const roomParticipant = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
        name: "participant_room_id_idx",
      },
      {
        accessor: "by_identity",
        algorithm: "btree",
        columns: ["identity"],
        name: "participant_identity_idx",
      },
    ],
    name: "room_participant",
    public: true,
  },
  {
    connection_id: t.option(t.connectionId()),
    display_name: t.string(),
    identity: t.identity(),
    last_seen_ms: t.i64(),
    member_id: t.string(),
    participant_key: t.string().primaryKey(),
    role: t.string(),
    room_id: t.string(),
    status: t.string(),
    avatar_key: t.option(t.string()).default(undefined),
  },
);

const roomPermission = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
        name: "room_permission_room_id_idx",
      },
      {
        accessor: "by_member_id",
        algorithm: "btree",
        columns: ["member_id"],
        name: "room_permission_member_id_idx",
      },
    ],
    name: "room_permission",
    public: true,
  },
  {
    can_add_queue: t.bool(),
    can_control_browser: t.bool(),
    can_control_playback: t.bool(),
    member_id: t.string(),
    permission_key: t.string().primaryKey(),
    room_id: t.string(),
    updated_by_member_id: t.string(),
    updated_ms: t.i64(),
  },
);

const liveQueueItem = table(
  {
    indexes: [
      {
        accessor: "by_room_position",
        algorithm: "btree",
        columns: ["room_id", "position"],
        name: "queue_room_position_idx",
      },
    ],
    name: "live_queue_item",
    public: true,
  },
  {
    added_by_member_id: t.string(),
    artist: t.option(t.string()),
    duration_seconds: t.option(t.u32()),
    position: t.u32(),
    queue_item_id: t.string().primaryKey(),
    room_id: t.string(),
    source_type: t.string(),
    source_url: t.string(),
    status: t.string(),
    title: t.option(t.string()),
    channel_name: t.option(t.string()).default(undefined),
    is_pinned: t.bool().default(false),
    is_play_next: t.bool().default(false),
    is_unavailable: t.bool().default(false),
    playlist_id: t.option(t.string()).default(undefined),
    playlist_title: t.option(t.string()).default(undefined),
    thumbnail_url: t.option(t.string()).default(undefined),
  },
);

const roomError = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
        name: "room_error_room_id_idx",
      },
    ],
    name: "room_error",
    public: true,
  },
  {
    code: t.string(),
    created_ms: t.i64(),
    error_id: t.string().primaryKey(),
    message: t.string(),
    room_id: t.string(),
    severity: t.string(),
  },
);

const roomKick = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
        name: "room_kick_room_id_idx",
      },
      {
        accessor: "by_member_id",
        algorithm: "btree",
        columns: ["member_id"],
        name: "room_kick_member_id_idx",
      },
    ],
    name: "room_kick",
    public: true,
  },
  {
    actor_member_id: t.string(),
    created_ms: t.i64(),
    kick_key: t.string().primaryKey(),
    member_id: t.string(),
    room_id: t.string(),
  },
);

const roomChatMessage = table(
  {
    indexes: [
      {
        accessor: "by_room_created",
        algorithm: "btree",
        columns: ["room_id", "created_ms"],
        name: "room_chat_message_room_created_idx",
      },
    ],
    name: "room_chat_message",
    public: true,
  },
  {
    avatar_key: t.option(t.string()).default(undefined),
    client_message_id: t.string(),
    created_ms: t.i64(),
    display_name: t.string(),
    is_host: t.bool(),
    member_id: t.string(),
    message_id: t.string().primaryKey(),
    room_id: t.string(),
    text: t.string(),
  },
);

const spacetimedb = schema({
  live_queue_item: liveQueueItem,
  room_chat_message: roomChatMessage,
  room_error: roomError,
  room_kick: roomKick,
  room_permission: roomPermission,
  room_participant: roomParticipant,
  room_session: roomSession,
});

export default spacetimedb;

function nowMs() {
  return BigInt(Date.now());
}

function participantKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

function permissionKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

function kickKey(roomId: string, memberId: string) {
  return `${roomId}:${memberId}`;
}

function recordRoomError(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  {
    code,
    message,
    roomId,
    severity = "warning",
  }: {
    code: string;
    message: string;
    roomId: string;
    severity?: "info" | "warning" | "error";
  },
) {
  ctx.db.room_error.insert({
    code,
    created_ms: nowMs(),
    error_id: ctx.newUuidV7().toString(),
    message,
    room_id: roomId,
    severity,
  });
}

function getParticipant(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
  memberId: string,
) {
  return ctx.db.room_participant.participant_key.find(
    participantKey(roomId, memberId),
  );
}

function isParticipantSender(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  participant: NonNullable<ReturnType<typeof getParticipant>>,
) {
  return participant.identity.isEqual(ctx.sender);
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

function clampPositionSeconds(positionSeconds: number) {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) {
    return 0;
  }

  return positionSeconds;
}

function normalizePlaybackStatus(status: string) {
  return status === "playing" ||
    status === "buffering" ||
    status === "ended" ||
    status === "error"
    ? status
    : "paused";
}

function normalizeSourceType(sourceType: string) {
  if (sourceType === "hls" || sourceType === "youtube") {
    return sourceType;
  }

  return "direct";
}

function normalizeRoomMode(mode: string) {
  return mode === "listen" ? "listen" : "watch";
}

function normalizeQueueMode(mode: string) {
  if (
    mode === "shuffle" ||
    mode === "smartShuffle" ||
    mode === "loop" ||
    mode === "autoplayRelated"
  ) {
    return mode;
  }

  return "normal";
}

function normalizeDurationSeconds(durationSeconds: number | undefined) {
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return undefined;
  }

  return Math.max(0, Math.trunc(durationSeconds));
}

function normalizeRoomName(roomName: string) {
  const normalized = roomName.trim().replace(/\s+/g, " ");

  if (!normalized || normalized.length > 120) {
    return "Untitled room";
  }

  return normalized;
}

function normalizeAvatarKey(avatarKey: string | undefined) {
  if (
    avatarKey === "audio" ||
    avatarKey === "controller" ||
    avatarKey === "cooling" ||
    avatarKey === "memory" ||
    avatarKey === "network" ||
    avatarKey === "power" ||
    avatarKey === "processor" ||
    avatarKey === "storage"
  ) {
    return avatarKey;
  }

  return undefined;
}

function normalizeChatText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (normalized.length > 500) {
    return normalized.slice(0, 500).trim();
  }

  return normalized;
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
  return [...ctx.db.live_queue_item.iter()]
    .filter(
      (item) =>
        item.room_id === roomId &&
        (item.status === "queued" || item.status === "playing"),
    )
    .sort((a, b) => a.position - b.position);
}

function queuedQueueItems(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  return activeQueueItems(ctx, roomId).filter(
    (item) => item.status === "queued",
  );
}

function nextQueuePosition(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  roomId: string,
) {
  const items = activeQueueItems(ctx, roomId);

  return items.length > 0
    ? Math.max(...items.map((item) => item.position)) + 1
    : 0;
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

function upsertPermission(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  {
    canAddQueue,
    canControlBrowser,
    canControlPlayback,
    memberId,
    roomId,
    updatedByMemberId,
  }: {
    canAddQueue: boolean;
    canControlBrowser: boolean;
    canControlPlayback: boolean;
    memberId: string;
    roomId: string;
    updatedByMemberId: string;
  },
) {
  const key = permissionKey(roomId, memberId);
  const existing = ctx.db.room_permission.permission_key.find(key);

  if (existing) {
    ctx.db.room_permission.delete(existing);
  }

  ctx.db.room_permission.insert({
    can_add_queue: canAddQueue,
    can_control_browser: canControlBrowser,
    can_control_playback: canControlPlayback,
    member_id: memberId,
    permission_key: key,
    room_id: roomId,
    updated_by_member_id: updatedByMemberId,
    updated_ms: nowMs(),
  });
}

function deleteParticipantAndPermissions(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  participant: NonNullable<ReturnType<typeof getParticipant>>,
) {
  const permission = ctx.db.room_permission.permission_key.find(
    permissionKey(participant.room_id, participant.member_id),
  );

  if (permission) {
    ctx.db.room_permission.delete(permission);
  }

  ctx.db.room_participant.delete(participant);
}

export const join_room = spacetimedb.reducer(
  {
    avatar_key: t.option(t.string()),
    display_name: t.string(),
    member_id: t.string(),
    role: t.string(),
    room_id: t.string(),
  },
  (ctx, { avatar_key, display_name, member_id, role, room_id }) => {
    const session = ctx.db.room_session.room_id.find(room_id);
    const kicked = ctx.db.room_kick.kick_key.find(kickKey(room_id, member_id));
    const participantKeyValue = participantKey(room_id, member_id);
    const existing =
      ctx.db.room_participant.participant_key.find(participantKeyValue);
    const resolvedRole =
      session?.host_member_id === member_id && role === "host"
        ? "host"
        : "guest";

    if (kicked && resolvedRole !== "host") {
      recordRoomError(ctx, {
        code: "member_removed",
        message: "Join ignored because this guest was removed by the host.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    if (existing) {
      ctx.db.room_participant.delete(existing);
    }

    ctx.db.room_participant.insert({
      avatar_key: normalizeAvatarKey(avatar_key),
      connection_id: ctx.connectionId ?? undefined,
      display_name,
      identity: ctx.sender,
      last_seen_ms: nowMs(),
      member_id,
      participant_key: participantKeyValue,
      role: resolvedRole,
      room_id,
      status: "online",
    });

    if (!ctx.db.room_permission.permission_key.find(participantKeyValue)) {
      const isHost = resolvedRole === "host";
      upsertPermission(ctx, {
        canAddQueue: true,
        canControlBrowser: isHost,
        canControlPlayback: isHost,
        memberId: member_id,
        roomId: room_id,
        updatedByMemberId: member_id,
      });
    }
  },
);

export const leave_room = spacetimedb.reducer(
  {
    member_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { member_id, room_id }) => {
    const participant = ctx.db.room_participant.participant_key.find(
      participantKey(room_id, member_id),
    );

    if (!participant || !isParticipantSender(ctx, participant)) {
      return;
    }

    ctx.db.room_participant.delete(participant);
  },
);

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
    const participantKey = `${room_id}:${member_id}`;
    const participant =
      ctx.db.room_participant.participant_key.find(participantKey);

    if (!participant) {
      recordRoomError(ctx, {
        code: "participant_missing",
        message: "Heartbeat received before join_room.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    if (!isParticipantSender(ctx, participant)) {
      recordRoomError(ctx, {
        code: "identity_mismatch",
        message:
          "Heartbeat ignored because the caller does not own the participant.",
        roomId: room_id,
      });
      return;
    }

    ctx.db.room_participant.delete(participant);
    ctx.db.room_participant.insert({
      ...participant,
      connection_id: ctx.connectionId ?? undefined,
      last_seen_ms: nowMs(),
      status: "online",
    });
  },
);

export const seed_room_session = spacetimedb.reducer(
  {
    host_member_id: t.string(),
    mode: t.string(),
    room_name: t.string(),
    room_id: t.string(),
  },
  (ctx, { host_member_id, mode, room_name, room_id }) => {
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

    ctx.db.room_session.insert({
      active_queue_item_id: undefined,
      controller_identity: undefined,
      host_member_id,
      mode,
      playback_rate: 1,
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

    const trimmedUrl = source_url.trim();

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

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      playback_rate: 1,
      position_seconds: clampPositionSeconds(position_seconds),
      server_updated_ms: nowMs(),
      status: normalizePlaybackStatus(status),
    });
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
      activeQueueDuration ?? existingDuration ?? duration_seconds;

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

    ctx.db.live_queue_item.insert({
      added_by_member_id: actor_member_id,
      artist: artist?.trim() || undefined,
      channel_name: channel_name?.trim() || undefined,
      duration_seconds: normalizeDurationSeconds(duration_seconds),
      is_pinned,
      is_play_next,
      is_unavailable,
      playlist_id: playlist_id?.trim() || undefined,
      playlist_title: playlist_title?.trim() || undefined,
      position: nextQueuePosition(ctx, room_id),
      queue_item_id: ctx.newUuidV7().toString(),
      room_id,
      source_type: normalizeSourceType(source_type),
      source_url: trimmedUrl,
      status: "queued",
      thumbnail_url: thumbnail_url?.trim() || undefined,
      title: source_title.trim() || trimmedUrl,
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
    is_pinned: t.bool(),
    is_play_next: t.bool(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    { actor_member_id, is_pinned, is_play_next, queue_item_id, room_id },
  ) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.status !== "queued"
    ) {
      return;
    }

    replaceQueueItem(ctx, queueItem, {
      is_pinned,
      is_play_next,
      position: is_play_next ? 0 : queueItem.position,
    });

    normalizeQueuedPositions(ctx, room_id);
  },
);

export const play_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, queue_item_id, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      (queueItem.status !== "queued" &&
        queueItem.status !== "playing" &&
        queueItem.status !== "played")
    ) {
      return;
    }

    for (const item of ctx.db.live_queue_item.iter()) {
      if (item.room_id !== room_id) {
        continue;
      }

      if (item.queue_item_id === queue_item_id) {
        replaceQueueItem(ctx, item, {
          status: "playing",
        });
      } else if (item.status === "playing") {
        replaceQueueItem(ctx, item, {
          status: "played",
        });
      }
    }

    ctx.db.room_session.delete(authority.session);
    ctx.db.room_session.insert({
      ...authority.session,
      active_queue_item_id: queue_item_id,
      playback_rate: 1,
      position_seconds: 0,
      server_updated_ms: nowMs(),
      source_duration_seconds: queueItem.duration_seconds,
      source_title: queueItem.title ?? queueItem.source_url,
      source_type: normalizeSourceType(queueItem.source_type),
      source_url: queueItem.source_url,
      status: "paused",
    });

    normalizeQueuedPositions(ctx, room_id);
  },
);

export const move_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    position: t.u32(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, position, queue_item_id, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !authority ||
      !queueItem ||
      queueItem.room_id !== room_id ||
      queueItem.status !== "queued"
    ) {
      return;
    }

    const items = queuedQueueItems(ctx, room_id);
    const movingIndex = items.findIndex(
      (item) => item.queue_item_id === queue_item_id,
    );

    if (movingIndex < 0) {
      return;
    }

    const [movingItem] = items.splice(movingIndex, 1);
    items.splice(Math.min(position, items.length), 0, movingItem);

    items.forEach((item, index) => {
      replaceQueueItem(ctx, item, {
        position: index,
      });
    });
  },
);

export const remove_queue_item = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { actor_member_id, queue_item_id, room_id }) => {
    const authority = getAuthorizedHost(ctx, room_id, actor_member_id);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (!authority || !queueItem || queueItem.room_id !== room_id) {
      return;
    }

    ctx.db.live_queue_item.delete(queueItem);

    if (authority.session.active_queue_item_id === queue_item_id) {
      ctx.db.room_session.delete(authority.session);
      ctx.db.room_session.insert({
        ...authority.session,
        active_queue_item_id: undefined,
        playback_rate: 1,
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
    if (!getAuthorizedHost(ctx, room_id, actor_member_id)) {
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

export const on_disconnect = spacetimedb.clientDisconnected((ctx) => {
  if (!ctx.connectionId) {
    return;
  }

  for (const participant of ctx.db.room_participant.iter()) {
    if (participant.connection_id?.isEqual(ctx.connectionId)) {
      ctx.db.room_participant.delete(participant);
      ctx.db.room_participant.insert({
        ...participant,
        connection_id: undefined,
        last_seen_ms: nowMs(),
        status: "idle",
      });
    }
  }
});
