import { table, t } from "spacetimedb/server";

export const roomSession = table(
  { name: "room_session", public: true },
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
    playback_occurrence_id: t.option(t.string()).default(undefined),
  },
);

export const roomParticipant = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
      { accessor: "by_identity", algorithm: "btree", columns: ["identity"] },
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

export const roomParticipantSession = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
      {
        accessor: "by_room_member",
        algorithm: "btree",
        columns: ["room_id", "member_id"],
      },
    ],
    name: "room_participant_session",
  },
  {
    admission_id: t.string(),
    avatar_key: t.option(t.string()).default(undefined),
    connection_id: t.option(t.connectionId()),
    display_name: t.string(),
    identity: t.identity(),
    last_seen_ms: t.i64(),
    member_id: t.string(),
    role: t.string(),
    room_id: t.string(),
    session_key: t.string().primaryKey(),
    status: t.string(),
  },
);

export const roomParticipantPresence = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
    ],
    name: "room_participant_presence",
    public: true,
  },
  {
    admission_id: t.string().primaryKey(),
    last_seen_ms: t.i64(),
    member_id: t.string(),
    room_id: t.string(),
    status: t.string(),
  },
);

export const roomPermission = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
      { accessor: "by_member_id", algorithm: "btree", columns: ["member_id"] },
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
    can_manage_queue: t.bool().default(false),
  },
);

export const liveQueueItem = table(
  {
    indexes: [
      {
        accessor: "by_room_position",
        algorithm: "btree",
        columns: ["room_id", "position"],
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
    played_sequence: t.u32().default(0),
    failure_code: t.option(t.string()).default(undefined),
    failure_reason: t.option(t.string()).default(undefined),
    failure_created_ms: t.option(t.i64()).default(undefined),
    failure_count: t.u32().default(0),
  },
);

export const roomError = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
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
    actor_member_id: t.option(t.string()).default(undefined),
    actor_source: t.option(t.string()).default(undefined),
    event_type: t.option(t.string()).default(undefined),
    permanent: t.bool().default(false),
    provider_id: t.option(t.string()).default(undefined),
    queue_item_id: t.option(t.string()).default(undefined),
    source_type: t.option(t.string()).default(undefined),
    title: t.option(t.string()).default(undefined),
  },
);

export const roomKick = table(
  {
    indexes: [
      { accessor: "by_room_id", algorithm: "btree", columns: ["room_id"] },
      { accessor: "by_member_id", algorithm: "btree", columns: ["member_id"] },
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

export const roomChatMessage = table(
  {
    indexes: [
      {
        accessor: "by_room_created",
        algorithm: "btree",
        columns: ["room_id", "created_ms"],
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

export const roomSeedGrant = table(
  { name: "room_seed_grant" },
  {
    created_by_identity: t.identity(),
    created_ms: t.i64(),
    expires_ms: t.i64(),
    grant_key: t.string().primaryKey(),
    host_member_id: t.string(),
    room_id: t.string(),
    seed_token: t.string(),
  },
);

export const roomAdmissionGrant = table(
  { name: "room_admission_grant" },
  {
    admission_id: t.string(),
    admission_token: t.string().primaryKey(),
    authorization_kind: t.string(),
    created_by_identity: t.identity(),
    created_ms: t.i64(),
    expires_ms: t.i64(),
    identity_hex: t.string(),
    member_id: t.string(),
    role: t.string(),
    room_id: t.string(),
  },
);

export const trustedSeedIssuer = table(
  { name: "trusted_seed_issuer" },
  {
    created_ms: t.i64(),
    identity_hex: t.string().primaryKey(),
    label: t.string(),
  },
);
