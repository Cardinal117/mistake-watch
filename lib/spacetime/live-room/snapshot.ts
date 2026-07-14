import { getDeterministicAvatarKey, isAvatarKey } from "@/lib/identity/avatars";
import type { QueueMode } from "@/lib/queue/model";
import type { RoomParticipant, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomSnapshot } from "../types";
import type { LiveDb } from "./client-types";

export function buildFallbackSnapshot(room: RoomSnapshot): LiveRoomSnapshot {
  const fallbackParticipants = room.currentMember
    ? room.participantsList.filter(
        (participant) => participant.id === room.currentMember?.id,
      )
    : [];

  return {
    connection: {
      connected: false,
    },
    errors: [],
    participants: fallbackParticipants.map((participant) => ({
      displayName: participant.name,
      avatarKey:
        participant.avatarKey ?? getDeterministicAvatarKey(participant.id),
      identity: "",
      lastSeenMs: Date.now(),
      memberId: participant.id,
      participantKey: `${room.id}:${participant.id}`,
      role: participant.role,
      roomId: room.id,
      status: participant.status,
    })),
    permissions: room.participantsList.map((participant) => ({
      canAddQueue: participant.permissions.queue,
      canControlBrowser: participant.permissions.browser,
      canControlPlayback: participant.permissions.playback,
      canManageQueue: participant.permissions.manageQueue,
      memberId: participant.id,
      permissionKey: `${room.id}:${participant.id}`,
      roomId: room.id,
      updatedByMemberId: room.hostMemberId ?? participant.id,
      updatedMs: Date.now(),
    })),
    kicks: [],
    chatMessages: [],
    queue: room.queue.map((item, index) => ({
      addedByMemberId: "",
      artist: item.artist ?? null,
      channelName: item.channelName ?? null,
      durationSeconds: null,
      failureCode: null,
      failureCount: 0,
      failureCreatedMs: null,
      failureReason: null,
      isPinned: item.isPinned ?? false,
      isPlayNext: item.isPlayNext ?? false,
      isUnavailable: item.isUnavailable ?? false,
      playedSequence: 0,
      playlistId: item.playlistId ?? null,
      playlistTitle: item.playlistTitle ?? null,
      position: index,
      queueItemId: item.id,
      roomId: room.id,
      sourceType: item.sourceType ?? "direct",
      sourceUrl: item.sourceUrl ?? "",
      status: item.status === "now" ? "playing" : "queued",
      thumbnailUrl: item.thumbnailUrl ?? null,
      title: item.title,
    })),
    session: {
      activeQueueItemId: null,
      controllerIdentity: null,
      hostMemberId: room.hostMemberId ?? "",
      mode: room.mode,
      playbackRate: 1,
      positionSeconds: 0,
      queueAutoplayEnabled: true,
      queueMode: "normal",
      roomId: room.id,
      roomName: room.name,
      serverUpdatedMs: Date.now(),
      sourceDurationSeconds: null,
      sourceTitle: null,
      sourceType: null,
      sourceUrl: null,
      status: "paused",
      supabaseRoomId: room.id,
    },
  };
}

export function readLiveSnapshot(liveDb: LiveDb): LiveRoomSnapshot {
  const session = [...liveDb.room_session.iter()][0] ?? null;
  const errors = [...liveDb.room_error.iter()];

  return {
    connection: {
      connected: true,
      lastError: errors.at(-1)?.message,
    },
    chatMessages: [...liveDb.room_chat_message.iter()]
      .sort((a, b) => toNumber(a.createdMs) - toNumber(b.createdMs))
      .map((message) => ({
        avatarKey: message.avatarKey ?? null,
        clientMessageId: message.clientMessageId,
        createdMs: toNumber(message.createdMs),
        displayName: message.displayName || "Guest",
        isHost: message.isHost,
        memberId: message.memberId,
        messageId: message.messageId,
        roomId: message.roomId,
        text: message.text,
      })),
    errors: errors.map((error) => ({
      actorMemberId: error.actorMemberId ?? null,
      actorSource:
        error.actorSource === "actor" || error.actorSource === "system"
          ? error.actorSource
          : null,
      code: error.code,
      createdMs: toNumber(error.createdMs),
      errorId: error.errorId,
      eventType: error.eventType ?? null,
      message: error.message,
      permanent: error.permanent ?? false,
      providerId: error.providerId ?? null,
      queueItemId: error.queueItemId ?? null,
      roomId: error.roomId,
      severity: toSeverity(error.severity),
      sourceType: toSourceType(error.sourceType),
      title: error.title ?? null,
    })),
    kicks: [...liveDb.room_kick.iter()].map((kick) => ({
      actorMemberId: kick.actorMemberId,
      createdMs: toNumber(kick.createdMs),
      kickKey: kick.kickKey,
      memberId: kick.memberId,
      roomId: kick.roomId,
    })),
    participants: [...liveDb.room_participant.iter()].map((participant) => ({
      displayName: participant.displayName,
      avatarKey: participant.avatarKey ?? null,
      identity: participant.identity.toHexString(),
      lastSeenMs: toNumber(participant.lastSeenMs),
      memberId: participant.memberId,
      participantKey: participant.participantKey,
      role: participant.role === "host" ? "host" : "guest",
      roomId: participant.roomId,
      status: participant.status === "online" ? "online" : "idle",
    })),
    permissions: [...liveDb.room_permission.iter()].map((permission) => ({
      canAddQueue: permission.canAddQueue,
      canControlBrowser: permission.canControlBrowser,
      canControlPlayback: permission.canControlPlayback,
      canManageQueue: permission.canManageQueue,
      memberId: permission.memberId,
      permissionKey: permission.permissionKey,
      roomId: permission.roomId,
      updatedByMemberId: permission.updatedByMemberId,
      updatedMs: toNumber(permission.updatedMs),
    })),
    queue: [...liveDb.live_queue_item.iter()]
      .filter(
        (item) =>
          item.status === "queued" ||
          item.status === "playing" ||
          item.status === "played",
      )
      .sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === "playing") {
            return -1;
          }

          if (b.status === "playing") {
            return 1;
          }
        }

        if (a.status === "played" && b.status === "played") {
          return (a.playedSequence ?? 0) - (b.playedSequence ?? 0);
        }

        return a.position - b.position;
      })
      .map((item) => ({
        addedByMemberId: item.addedByMemberId,
        artist: item.artist ?? null,
        channelName: item.channelName ?? null,
        durationSeconds:
          typeof item.durationSeconds === "number"
            ? item.durationSeconds
            : null,
        failureCode: item.failureCode ?? null,
        failureCount: item.failureCount ?? 0,
        failureCreatedMs:
          item.failureCreatedMs === undefined
            ? null
            : toNumber(item.failureCreatedMs),
        failureReason: item.failureReason ?? null,
        isPinned: item.isPinned ?? false,
        isPlayNext: item.isPlayNext ?? false,
        isUnavailable: item.isUnavailable ?? false,
        playedSequence: item.playedSequence ?? 0,
        playlistId: item.playlistId ?? null,
        playlistTitle: item.playlistTitle ?? null,
        position: item.position,
        queueItemId: item.queueItemId,
        roomId: item.roomId,
        sourceType: toRequiredSourceType(item.sourceType),
        sourceUrl: item.sourceUrl,
        thumbnailUrl: item.thumbnailUrl ?? null,
        status:
          item.status === "playing" || item.status === "played"
            ? item.status
            : "queued",
        title: item.title ?? null,
      })),
    session: session
      ? {
          activeQueueItemId: session.activeQueueItemId ?? null,
          controllerIdentity: session.controllerIdentity?.toHexString() ?? null,
          hostMemberId: session.hostMemberId,
          mode: session.mode === "listen" ? "listen" : "watch",
          playbackRate: session.playbackRate,
          positionSeconds: session.positionSeconds,
          queueAutoplayEnabled: session.queueAutoplayEnabled ?? true,
          queueMode: toQueueMode(session.queueMode),
          roomId: session.roomId,
          roomName: session.roomName,
          serverUpdatedMs: toNumber(session.serverUpdatedMs),
          sourceTitle: session.sourceTitle ?? null,
          sourceType: toSourceType(session.sourceType),
          sourceUrl: session.sourceUrl ?? null,
          sourceDurationSeconds:
            typeof session.sourceDurationSeconds === "number"
              ? session.sourceDurationSeconds
              : null,
          status:
            session.status === "playing" ||
            session.status === "buffering" ||
            session.status === "ended" ||
            session.status === "error"
              ? session.status
              : "paused",
          supabaseRoomId: session.supabaseRoomId,
        }
      : null,
  };
}

export function adjustSnapshotClock(
  snapshot: LiveRoomSnapshot,
  serverClockOffsetMs: number,
): LiveRoomSnapshot {
  if (!snapshot.session) {
    return snapshot;
  }

  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      serverUpdatedMs: snapshot.session.serverUpdatedMs + serverClockOffsetMs,
    },
  };
}

export function shouldPreserveCurrentSnapshotDuringReconnect(
  currentSnapshot: LiveRoomSnapshot,
  nextSnapshot: LiveRoomSnapshot,
  recoveringConnection: boolean,
) {
  return Boolean(
    recoveringConnection &&
    currentSnapshot.session &&
    currentSnapshot.queue.length > 0 &&
    !nextSnapshot.session &&
    nextSnapshot.queue.length === 0,
  );
}

export function mapLiveParticipants(
  room: RoomSnapshot,
  snapshot: LiveRoomSnapshot,
): RoomParticipant[] {
  const fallbackById = new Map(
    room.participantsList.map((participant) => [participant.id, participant]),
  );
  const permissionsByMemberId = new Map(
    snapshot.permissions.map((permission) => [permission.memberId, permission]),
  );

  const liveParticipants =
    snapshot.participants.length > 0
      ? snapshot.participants.map((participant) => {
          const fallback = fallbackById.get(participant.memberId);
          const permissions = permissionsByMemberId.get(participant.memberId);
          const isHost =
            participant.role === "host" ||
            participant.memberId === snapshot.session?.hostMemberId;
          const hasQueueAuthority =
            isHost ||
            permissions?.canAddQueue === true ||
            fallback?.permissions.queue === true;

          return {
            id: participant.memberId,
            avatarKey: isAvatarKey(participant.avatarKey)
              ? participant.avatarKey
              : (fallback?.avatarKey ??
                getDeterministicAvatarKey(participant.memberId)),
            isController:
              Boolean(snapshot.session?.controllerIdentity) &&
              snapshot.session?.controllerIdentity === participant.identity,
            name: participant.displayName || fallback?.name || "Guest",
            permissions: {
              browser: isHost || Boolean(permissions?.canControlBrowser),
              playback: isHost || Boolean(permissions?.canControlPlayback),
              queue: hasQueueAuthority,
              manageQueue: hasQueueAuthority,
            },
            role: isHost ? "host" : "guest",
            status: participant.status,
          } satisfies RoomParticipant;
        })
      : room.participantsList;

  return [...liveParticipants].sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "host" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

function toSeverity(value: string) {
  if (value === "error" || value === "warning" || value === "info") {
    return value;
  }

  return "warning";
}

function toSourceType(value: string | undefined) {
  if (value === "direct" || value === "hls" || value === "youtube") {
    return value;
  }

  return null;
}

function toRequiredSourceType(value: string | undefined) {
  return toSourceType(value) ?? "direct";
}

function toQueueMode(value: string | undefined): QueueMode {
  if (
    value === "autoplayRelated" ||
    value === "loop" ||
    value === "shuffle" ||
    value === "smartShuffle"
  ) {
    return value;
  }

  return "normal";
}
