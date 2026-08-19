import { spacetimedb } from "./module-schema";
import {
  isCurrentParticipantSession,
  onlineMemberSessions,
} from "./room-admission";
import { nowMs, participantKey, permissionKey } from "./room-keys";

type ReducerContext = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];

export function getParticipant(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
) {
  return ctx.db.room_participant.participant_key.find(
    participantKey(roomId, memberId),
  );
}

export function isParticipantSender(
  ctx: ReducerContext,
  participant: NonNullable<ReturnType<typeof getParticipant>>,
) {
  return isCurrentParticipantSession(
    ctx,
    participant.room_id,
    participant.member_id,
  );
}

export function upsertAggregateParticipant(
  ctx: ReducerContext,
  input: {
    avatarKey?: string;
    displayName: string;
    identity: typeof ctx.sender;
    memberId: string;
    role: string;
    roomId: string;
    status: string;
  },
) {
  const key = participantKey(input.roomId, input.memberId);
  const existing = ctx.db.room_participant.participant_key.find(key);

  if (existing) {
    ctx.db.room_participant.delete(existing);
  }

  ctx.db.room_participant.insert({
    avatar_key: input.avatarKey,
    connection_id:
      input.status === "online" ? (ctx.connectionId ?? undefined) : undefined,
    display_name: input.displayName,
    identity: input.identity,
    last_seen_ms: nowMs(),
    member_id: input.memberId,
    participant_key: key,
    role: input.role,
    room_id: input.roomId,
    status: input.status,
  });
}

export function syncAggregateParticipant(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
  removeWhenOffline = false,
) {
  const existing = getParticipant(ctx, roomId, memberId);
  const active = onlineMemberSessions(ctx, roomId, memberId)[0];

  if (!active) {
    if (existing) {
      ctx.db.room_participant.delete(existing);

      if (!removeWhenOffline) {
        ctx.db.room_participant.insert({
          ...existing,
          connection_id: undefined,
          last_seen_ms: nowMs(),
          status: "idle",
        });
      }
    }
    return;
  }

  if (existing) {
    ctx.db.room_participant.delete(existing);
  }

  ctx.db.room_participant.insert({
    avatar_key: active.avatar_key,
    connection_id: active.connection_id ?? undefined,
    display_name: active.display_name,
    identity: active.identity,
    last_seen_ms: active.last_seen_ms,
    member_id: active.member_id,
    participant_key: participantKey(roomId, memberId),
    role: active.role,
    room_id: active.room_id,
    status: "online",
  });
}

export function upsertPermission(
  ctx: ReducerContext,
  {
    canAddQueue,
    canControlBrowser,
    canControlPlayback,
    canManageQueue,
    memberId,
    roomId,
    updatedByMemberId,
  }: {
    canAddQueue: boolean;
    canControlBrowser: boolean;
    canControlPlayback: boolean;
    canManageQueue: boolean;
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
    can_manage_queue: canManageQueue,
    member_id: memberId,
    permission_key: key,
    room_id: roomId,
    updated_by_member_id: updatedByMemberId,
    updated_ms: nowMs(),
  });
}
