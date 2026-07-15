import { table, t } from "spacetimedb/server";

export const RECOMMENDATION_EVENT_SCHEMA_VERSION = 1;
export const RECOMMENDATION_OUTBOX_ROOM_LIMIT = 5_000;
export const RECOMMENDATION_GUEST_PREFERENCE_MEMBER_LIMIT = 1_000;

export const recommendationEventOutbox = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
      },
      {
        accessor: "by_created_ms",
        algorithm: "btree",
        columns: ["created_ms"],
      },
    ],
    name: "recommendation_event_outbox",
  },
  {
    actor_member_id: t.option(t.string()),
    completion_ratio_bps: t.option(t.u32()),
    contributor_member_id: t.option(t.string()),
    created_ms: t.i64(),
    duration_seconds: t.option(t.u32()),
    event_id: t.string(),
    event_type: t.string(),
    idempotency_key: t.string().primaryKey(),
    media_id: t.option(t.string()),
    playback_occurrence_id: t.option(t.string()),
    position: t.option(t.u32()),
    queue_item_id: t.option(t.string()),
    reason: t.option(t.string()),
    room_id: t.string(),
    room_session_id: t.string(),
    schema_version: t.u32(),
    source_type: t.option(t.string()),
  },
);

export const recommendationRoomSession = table(
  { name: "recommendation_room_session" },
  {
    created_ms: t.i64(),
    room_id: t.string().primaryKey(),
    room_session_id: t.string(),
  },
);

export const recommendationEventOverflow = table(
  { name: "recommendation_event_overflow" },
  {
    dropped_count: t.u32(),
    room_id: t.string().primaryKey(),
    updated_ms: t.i64(),
  },
);

export const recommendationPlaybackOccurrence = table(
  { name: "recommendation_playback_occurrence" },
  {
    actor_member_id: t.string(),
    contributor_member_id: t.option(t.string()),
    duration_seconds: t.option(t.u32()),
    media_id: t.string(),
    playback_occurrence_id: t.string(),
    queue_item_id: t.string(),
    room_id: t.string().primaryKey(),
    room_session_id: t.string(),
    source_type: t.string(),
    started_ms: t.i64(),
  },
);

export const recommendationProcessedAction = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
      },
    ],
    name: "recommendation_processed_action",
  },
  {
    action_key: t.string().primaryKey(),
    created_ms: t.i64(),
    room_id: t.string(),
  },
);

export const recommendationPlaybackMemory = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
      },
    ],
    name: "recommendation_playback_memory",
  },
  {
    last_played_ms: t.i64(),
    media_key: t.string().primaryKey(),
    media_id: t.string(),
    play_count: t.u32(),
    room_id: t.string(),
    room_session_id: t.string(),
    source_type: t.string(),
  },
);

export const guestMediaPreference = table(
  {
    indexes: [
      {
        accessor: "by_room_id",
        algorithm: "btree",
        columns: ["room_id"],
      },
    ],
    name: "guest_media_preference",
  },
  {
    actor_member_id: t.string(),
    liked: t.bool(),
    media_id: t.string(),
    preference_key: t.string().primaryKey(),
    queue_item_id: t.string(),
    revision: t.u32(),
    room_id: t.string(),
    room_session_id: t.string(),
    source_type: t.string(),
    updated_ms: t.i64(),
  },
);

export type RecommendationEventInput = {
  actorMemberId?: string;
  completionRatioBps?: number;
  contributorMemberId?: string;
  durationSeconds?: number;
  eventType: string;
  idempotencyKey: string;
  mediaId?: string;
  playbackOccurrenceId?: string;
  position?: number;
  queueItemId?: string;
  reason?: string;
  roomId: string;
  sourceType?: string;
};

export type EventRow = {
  actor_member_id: string | undefined;
  completion_ratio_bps: number | undefined;
  contributor_member_id: string | undefined;
  created_ms: bigint;
  duration_seconds: number | undefined;
  event_id: string;
  event_type: string;
  idempotency_key: string;
  media_id: string | undefined;
  playback_occurrence_id: string | undefined;
  position: number | undefined;
  queue_item_id: string | undefined;
  reason: string | undefined;
  room_id: string;
  room_session_id: string;
  schema_version: number;
  source_type: string | undefined;
};

type RoomSessionRow = {
  created_ms: bigint;
  room_id: string;
  room_session_id: string;
};

type OccurrenceRow = {
  actor_member_id: string;
  contributor_member_id?: string;
  duration_seconds?: number;
  media_id: string;
  playback_occurrence_id: string;
  queue_item_id: string;
  room_id: string;
  room_session_id: string;
  source_type: string;
  started_ms: bigint;
};

type PlaybackMemoryRow = {
  last_played_ms: bigint;
  media_key: string;
  media_id: string;
  play_count: number;
  room_id: string;
  room_session_id: string;
  source_type: string;
};

type GuestPreferenceRow = {
  actor_member_id: string;
  liked: boolean;
  media_id: string;
  preference_key: string;
  queue_item_id: string;
  revision: number;
  room_id: string;
  room_session_id: string;
  source_type: string;
  updated_ms: bigint;
};

type ProcessedActionRow = {
  action_key: string;
  created_ms: bigint;
  room_id: string;
};

type EventOverflowRow = {
  dropped_count: number;
  room_id: string;
  updated_ms: bigint;
};

type TableAccess<Row> = {
  delete(row: Row): void;
  insert(row: Row): Row;
  iter(): Iterable<Row>;
};

export type RecommendationAuthorityContext = {
  db: {
    guest_media_preference: TableAccess<GuestPreferenceRow> & {
      preference_key: { find(key: string): GuestPreferenceRow | undefined };
    };
    recommendation_event_outbox: TableAccess<EventRow> & {
      idempotency_key: { find(key: string): EventRow | undefined };
    };
    recommendation_event_overflow: TableAccess<EventOverflowRow> & {
      room_id: { find(key: string): EventOverflowRow | undefined };
    };
    recommendation_playback_memory: TableAccess<PlaybackMemoryRow> & {
      media_key: { find(key: string): PlaybackMemoryRow | undefined };
    };
    recommendation_playback_occurrence: TableAccess<OccurrenceRow> & {
      room_id: { find(key: string): OccurrenceRow | undefined };
    };
    recommendation_processed_action: TableAccess<ProcessedActionRow> & {
      action_key: { find(key: string): ProcessedActionRow | undefined };
    };
    recommendation_room_session: TableAccess<RoomSessionRow> & {
      room_id: { find(key: string): RoomSessionRow | undefined };
    };
  };
  newUuidV7(): { toString(): string };
};
