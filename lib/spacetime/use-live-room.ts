"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  readStoredAvatarKey,
  useSelectedAvatarKey,
} from "@/lib/identity/avatar-selection";
import { getDeterministicAvatarKey, isAvatarKey } from "@/lib/identity/avatars";
import {
  renameRoomAction,
  setRoomModeAction,
  touchRoomActivityAction,
} from "@/lib/rooms/actions";
import type { QueueMode } from "@/lib/queue/model";
import type { RoomParticipant, RoomSnapshot } from "@/lib/rooms";
import {
  createUploadedSessionReference,
  parseUploadedAssetReference,
} from "@/lib/media/uploaded-playback-reference";
import { predictNextQueueItem } from "@/lib/player/next-item-preparation";
import { DbConnection } from "./generated";
import type {
  RoomError as GeneratedRoomError,
  RoomKick as GeneratedRoomKick,
  RoomChatMessage as GeneratedRoomChatMessage,
  LiveQueueItem as GeneratedLiveQueueItem,
  RoomParticipant as GeneratedRoomParticipant,
  RoomPermission as GeneratedRoomPermission,
  RoomSession as GeneratedRoomSession,
} from "./generated/types";
import { getRoomSubscriptions } from "./adapter";
import { getSpacetimeConfig } from "./config";
import type { SpacetimeConnectionStatus } from "./adapter";
import type { LiveRoomSnapshot } from "./types";

type ClientTable<Row> = {
  iter(): Iterable<Row>;
  onDelete(callback: TableDeleteCallback<Row>): void;
  onInsert(callback: TableRowCallback<Row>): void;
  onUpdate(callback: TableUpdateCallback<Row>): void;
  removeOnDelete(callback: TableDeleteCallback<Row>): void;
  removeOnInsert(callback: TableRowCallback<Row>): void;
  removeOnUpdate(callback: TableUpdateCallback<Row>): void;
};

type TableRowCallback<Row> = (ctx: unknown, row: Row) => void;
type TableDeleteCallback<Row> = (ctx: unknown, row: Row) => void;
type TableUpdateCallback<Row> = (
  ctx: unknown,
  oldRow: Row,
  newRow: Row,
) => void;

type LiveDb = {
  live_queue_item: ClientTable<GeneratedLiveQueueItem>;
  room_chat_message: ClientTable<GeneratedRoomChatMessage>;
  room_error: ClientTable<GeneratedRoomError>;
  room_kick: ClientTable<GeneratedRoomKick>;
  room_participant: ClientTable<GeneratedRoomParticipant>;
  room_permission: ClientTable<GeneratedRoomPermission>;
  room_session: ClientTable<GeneratedRoomSession>;
};

type LiveReducers = {
  addQueueItem(params: {
    actorMemberId: string;
    artist: string;
    channelName?: string;
    durationSeconds?: number;
    isPinned: boolean;
    isPlayNext: boolean;
    isUnavailable: boolean;
    allowDuplicate?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    roomId: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): Promise<void>;
  advanceQueueItem(params: {
    actorMemberId: string;
    autoplay?: boolean;
    expectedActiveQueueItemId?: string;
    expectedSourceUrl?: string;
    roomId: string;
  }): Promise<void>;
  advanceUploadedQueueItem(params: {
    actorMemberId: string;
    autoplay?: boolean;
    expectedActiveQueueItemId?: string;
    expectedNextQueueItemId: string;
    expectedSourceUrl?: string;
    resolvedSourceUrl: string;
    roomId: string;
  }): Promise<void>;
  clearQueue(params: { actorMemberId: string; roomId: string }): Promise<void>;
  grantRoomControl(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  heartbeat(params: { memberId: string; roomId: string }): Promise<void>;
  joinRoom(params: {
    avatarKey?: string;
    displayName: string;
    memberId: string;
    role: "host" | "guest";
    roomId: string;
  }): Promise<void>;
  kickMember(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  leaveRoom(params: { memberId: string; roomId: string }): Promise<void>;
  loadMediaSource(params: {
    actorMemberId: string;
    roomId: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): Promise<void>;
  moveQueueItem(params: {
    actorMemberId: string;
    position: number;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  playQueueItem(params: {
    actorMemberId: string;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  removeQueueItem(params: {
    actorMemberId: string;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  removeIdleMember(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  revokeRoomControl(params: {
    actorMemberId: string;
    roomId: string;
  }): Promise<void>;
  sendRoomChatMessage(params: {
    actorMemberId: string;
    clientMessageId: string;
    roomId: string;
    text: string;
  }): Promise<void>;
  seedRoomSession(params: {
    hostMemberId: string;
    mode: "watch" | "listen" | "browser";
    roomId: string;
    roomName: string;
    seedToken: string;
  }): Promise<void>;
  reportMediaFailure(params: {
    actorMemberId: string;
    allowAutoplayAdvance?: boolean;
    expectedActiveQueueItemId?: string;
    expectedSourceUrl: string;
    failureCode: string;
    roomId: string;
  }): Promise<void>;
  setMemberPermissions(params: {
    actorMemberId: string;
    canAddQueue: boolean;
    canControlBrowser: boolean;
    canControlPlayback: boolean;
    canManageQueue: boolean;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  setPlaybackState(params: {
    actorMemberId: string;
    playbackRate: number;
    positionSeconds: number;
    roomId: string;
    status: "buffering" | "ended" | "error" | "paused" | "playing";
  }): Promise<void>;
  setQueueAutoplay(params: {
    actorMemberId: string;
    enabled: boolean;
    roomId: string;
  }): Promise<void>;
  setQueueItemPriority(params: {
    actorMemberId: string;
    isPinned: boolean;
    isPlayNext: boolean;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  setQueueMode(params: {
    actorMemberId: string;
    mode: QueueMode;
    roomId: string;
  }): Promise<void>;
  updateMediaTitle(params: {
    actorMemberId: string;
    durationSeconds?: number;
    roomId: string;
    sourceTitle: string;
  }): Promise<void>;
  updateRoomMode(params: {
    actorMemberId: string;
    mode: "watch" | "listen";
    roomId: string;
  }): Promise<void>;
  updateRoomName(params: {
    actorMemberId: string;
    roomId: string;
    roomName: string;
  }): Promise<void>;
};

const LIVE_ROOM_RECONNECT_BASE_DELAY_MS = 1_000;
const LIVE_ROOM_RECONNECT_MAX_DELAY_MS = 30_000;
const LIVE_ROOM_STALE_MEMBER_REJOIN_MS = 4_000;
const LIVE_ROOM_MEMBER_MISSING_NOTICE_MS = 30_000;

export type LiveRoomState = {
  addQueueItem(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPinned?: boolean;
    isPlayNext?: boolean;
    isUnavailable?: boolean;
    allowDuplicate?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  canAddQueue: boolean;
  canManageAuthority: boolean;
  canManageQueue: boolean;
  canControlPlayback: boolean;
  clearQueue(): void;
  advanceToNextQueueItem(input?: { autoplay?: boolean }): void;
  connectionStatus: SpacetimeConnectionStatus;
  errorMessage: string | null;
  grantControl(memberId: string): void;
  kickMember(memberId: string): void;
  loadMediaSource(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  moveQueueItem(queueItemId: string, position: number): void;
  participants: RoomParticipant[];
  playQueueItemNow(queueItemId: string): void;
  playQueueItem(queueItemId: string): void;
  removalNotice: string | null;
  removeIdleMember(memberId: string): void;
  removeQueueItem(queueItemId: string): void;
  reportMediaFailure(input: {
    allowAutoplayAdvance: boolean;
    failureCode: string;
  }): void;
  renameRoom(roomName: string): Promise<void>;
  revokeControl(): void;
  sendChatMessage(input: {
    clientMessageId: string;
    text: string;
  }): Promise<void>;
  switchMode(mode: "listen" | "watch"): Promise<void>;
  setPermission(
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ): void;
  setPlaybackState(input: {
    playbackRate?: number;
    positionSeconds: number;
    status: "buffering" | "ended" | "error" | "paused" | "playing";
  }): void;
  setQueueAutoplay(enabled: boolean): void;
  setQueueItemPriority(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  setQueueMode(mode: QueueMode): void;
  updateMediaTitle(sourceTitle: string, durationSeconds?: number): void;
  snapshot: LiveRoomSnapshot;
};

export function useLiveRoom(room: RoomSnapshot): LiveRoomState {
  const [connectionStatus, setConnectionStatus] =
    useState<SpacetimeConnectionStatus>(() =>
      room.currentMember && room.hostMemberId ? "connecting" : "idle",
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [memberMissingNotice, setMemberMissingNotice] = useState<string | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<LiveRoomSnapshot>(() =>
    buildFallbackSnapshot(room),
  );
  const [reducers, setReducers] = useState<LiveReducers | null>(null);
  const serverClockOffsetMs = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const recoveringConnectionRef = useRef(false);
  const [connectionRunId, setConnectionRunId] = useState(0);

  const tokenStorageKey = `mw_spacetime_token_${room.id}`;
  const currentMember = room.currentMember;
  const { avatarKey: selectedAvatarKey } = useSelectedAvatarKey(
    currentMember?.id ?? currentMember?.name,
  );
  const canManageAuthority = currentMember?.role === "host";
  const currentLiveParticipant = snapshot.participants.find(
    (participant) => participant.memberId === currentMember?.id,
  );
  const currentLivePermission = snapshot.permissions.find(
    (permission) => permission.memberId === currentMember?.id,
  );
  const canControlPlayback =
    currentMember?.role === "host" ||
    Boolean(
      currentLiveParticipant &&
      currentLiveParticipant.status === "online" &&
      currentLivePermission?.canControlPlayback,
    );
  const canAddQueue =
    currentMember?.role === "host" ||
    Boolean(
      currentLiveParticipant &&
      currentLiveParticipant.status === "online" &&
      currentLivePermission?.canAddQueue,
    );
  const canManageQueue =
    currentMember?.role === "host" ||
    Boolean(
      currentLiveParticipant &&
      currentLiveParticipant.status === "online" &&
      (currentLivePermission?.canAddQueue ||
        currentLivePermission?.canManageQueue),
    );

  const currentMemberKick = currentMember
    ? snapshot.kicks.find((kick) => kick.memberId === currentMember.id)
    : null;
  const removalNotice = currentMemberKick
    ? "You were removed from this room by the host."
    : currentLiveParticipant || !currentMember
      ? null
      : memberMissingNotice;

  useEffect(() => {
    if (!currentMember || connectionStatus !== "connected") {
      return;
    }

    if (currentLiveParticipant) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMemberMissingNotice(
        "Your live room membership could not be restored. You will be returned to the dashboard.",
      );
    }, LIVE_ROOM_MEMBER_MISSING_NOTICE_MS);

    return () => window.clearTimeout(timer);
  }, [connectionStatus, currentLiveParticipant, currentMember]);

  useEffect(() => {
    if (!currentMember || !reducers || connectionStatus !== "connected") {
      return;
    }

    if (currentLiveParticipant?.status === "online") {
      return;
    }

    const timer = window.setTimeout(() => {
      void reducers.joinRoom({
        avatarKey: selectedAvatarKey,
        displayName: currentMember.name,
        memberId: currentMember.id,
        role: currentMember.role,
        roomId: room.id,
      });
    }, LIVE_ROOM_STALE_MEMBER_REJOIN_MS);

    return () => window.clearTimeout(timer);
  }, [
    connectionStatus,
    currentLiveParticipant?.status,
    currentMember,
    reducers,
    room.id,
    selectedAvatarKey,
  ]);

  useEffect(() => {
    if (!currentMember || !room.hostMemberId) {
      return;
    }

    const hostMemberId = room.hostMemberId;
    let disposed = false;
    let heartbeatTimer: number | undefined;
    let durableHeartbeatTimer: number | undefined;
    let liveDb: LiveDb | undefined;
    let shouldLeaveOnCleanup = true;
    const config = getSpacetimeConfig();
    const storedToken = window.localStorage.getItem(tokenStorageKey);

    const refreshSnapshot = (options?: { calibrateClock?: boolean }) => {
      if (!liveDb) {
        return;
      }

      const nextSnapshot = readLiveSnapshot(liveDb);

      if (options?.calibrateClock && nextSnapshot.session) {
        serverClockOffsetMs.current =
          Date.now() - nextSnapshot.session.serverUpdatedMs;
      }

      const adjustedSnapshot = adjustSnapshotClock(
        nextSnapshot,
        serverClockOffsetMs.current,
      );

      if (adjustedSnapshot.session) {
        recoveringConnectionRef.current = false;
      }

      setSnapshot((currentSnapshot) =>
        shouldPreserveCurrentSnapshotDuringReconnect(
          currentSnapshot,
          adjustedSnapshot,
          recoveringConnectionRef.current,
        )
          ? {
              ...currentSnapshot,
              connection: adjustedSnapshot.connection,
              errors: adjustedSnapshot.errors,
            }
          : adjustedSnapshot,
      );
    };

    const handleRowChange = () => refreshSnapshot();
    const handleSessionChange = () => refreshSnapshot({ calibrateClock: true });

    const clearLiveTimers = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
      }

      if (durableHeartbeatTimer) {
        window.clearInterval(durableHeartbeatTimer);
        durableHeartbeatTimer = undefined;
      }
    };

    const removeLiveListeners = () => {
      if (!liveDb) {
        return;
      }

      liveDb.room_participant.removeOnInsert(handleRowChange);
      liveDb.room_participant.removeOnUpdate(handleRowChange);
      liveDb.room_participant.removeOnDelete(handleRowChange);
      liveDb.room_permission.removeOnInsert(handleRowChange);
      liveDb.room_permission.removeOnUpdate(handleRowChange);
      liveDb.room_permission.removeOnDelete(handleRowChange);
      liveDb.room_session.removeOnInsert(handleSessionChange);
      liveDb.room_session.removeOnUpdate(handleSessionChange);
      liveDb.room_session.removeOnDelete(handleSessionChange);
      liveDb.room_error.removeOnInsert(handleRowChange);
      liveDb.room_error.removeOnDelete(handleRowChange);
      liveDb.room_kick.removeOnInsert(handleRowChange);
      liveDb.room_kick.removeOnDelete(handleRowChange);
      liveDb.live_queue_item.removeOnInsert(handleRowChange);
      liveDb.live_queue_item.removeOnUpdate(handleRowChange);
      liveDb.live_queue_item.removeOnDelete(handleRowChange);
      liveDb.room_chat_message.removeOnInsert(handleRowChange);
      liveDb.room_chat_message.removeOnDelete(handleRowChange);
      liveDb = undefined;
    };

    const scheduleReconnect = (message: string) => {
      if (disposed || reconnectTimerRef.current !== null) {
        return;
      }

      shouldLeaveOnCleanup = false;
      recoveringConnectionRef.current = true;
      clearLiveTimers();
      removeLiveListeners();
      setReducers(null);
      setErrorMessage(message);

      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const delayMs = Math.min(
        LIVE_ROOM_RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1),
        LIVE_ROOM_RECONNECT_MAX_DELAY_MS,
      );

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        setConnectionStatus("connecting");
        setConnectionRunId((current) => current + 1);
      }, delayMs);
    };

    const connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(storedToken ?? "")
      .onConnect((connected, _identity, token) => {
        reconnectAttemptRef.current = 0;
        window.localStorage.setItem(tokenStorageKey, token);
        setConnectionStatus("connected");
        setErrorMessage(null);
        setMemberMissingNotice(null);

        liveDb = connected.db as unknown as LiveDb;
        setReducers(connected.reducers as unknown as LiveReducers);

        liveDb.room_participant.onInsert(handleRowChange);
        liveDb.room_participant.onUpdate(handleRowChange);
        liveDb.room_participant.onDelete(handleRowChange);
        liveDb.room_permission.onInsert(handleRowChange);
        liveDb.room_permission.onUpdate(handleRowChange);
        liveDb.room_permission.onDelete(handleRowChange);
        liveDb.room_session.onInsert(handleSessionChange);
        liveDb.room_session.onUpdate(handleSessionChange);
        liveDb.room_session.onDelete(handleSessionChange);
        liveDb.room_error.onInsert(handleRowChange);
        liveDb.room_error.onDelete(handleRowChange);
        liveDb.room_kick.onInsert(handleRowChange);
        liveDb.room_kick.onDelete(handleRowChange);
        liveDb.live_queue_item.onInsert(handleRowChange);
        liveDb.live_queue_item.onUpdate(handleRowChange);
        liveDb.live_queue_item.onDelete(handleRowChange);
        liveDb.room_chat_message.onInsert(handleRowChange);
        liveDb.room_chat_message.onDelete(handleRowChange);

        if (currentMember.role === "host" && room.liveSeedToken) {
          void connected.reducers.seedRoomSession({
            hostMemberId,
            mode: room.mode,
            roomId: room.id,
            roomName: room.name,
            seedToken: room.liveSeedToken,
          });
        } else if (currentMember.role === "host") {
          setErrorMessage(
            "Live room host authority is not configured. Set SPACETIME_SERVER_AUTH_TOKEN and trusted_seed_issuer before opening live rooms.",
          );
        }
        void connected.reducers.joinRoom({
          avatarKey: readStoredAvatarKey(currentMember.id),
          displayName: currentMember.name,
          memberId: currentMember.id,
          role: currentMember.role,
          roomId: room.id,
        });

        connected
          .subscriptionBuilder()
          .onApplied(() => {
            refreshSnapshot();
          })
          .onError(() => {
            setConnectionStatus("error");
            scheduleReconnect("Live room subscription failed. Reconnecting...");
          })
          .subscribe(getRoomSubscriptions(room.id));

        heartbeatTimer = window.setInterval(() => {
          void connected.reducers.heartbeat({
            memberId: currentMember.id,
            roomId: room.id,
          });
        }, 15_000);

        durableHeartbeatTimer = window.setInterval(() => {
          void touchRoomActivityAction({ roomId: room.id });
        }, 60_000);
      })
      .onDisconnect(() => {
        setConnectionStatus("disconnected");
        scheduleReconnect("Live room signal disconnected. Reconnecting...");
      })
      .onConnectError(() => {
        setConnectionStatus("error");
        scheduleReconnect("Live room connection failed. Retrying...");
      })
      .build();

    return () => {
      disposed = true;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      clearLiveTimers();
      removeLiveListeners();

      if (shouldLeaveOnCleanup) {
        void (connection.reducers as unknown as LiveReducers).leaveRoom({
          memberId: currentMember.id,
          roomId: room.id,
        });
      }

      connection.disconnect();
      setReducers(null);
    };
  }, [
    connectionRunId,
    currentMember,
    room.hostMemberId,
    room.id,
    room.liveSeedToken,
    room.mode,
    room.name,
    tokenStorageKey,
  ]);

  useEffect(() => {
    if (!currentMember || !reducers || connectionStatus !== "connected") {
      return;
    }

    void reducers.joinRoom({
      avatarKey: selectedAvatarKey,
      displayName: currentMember.name,
      memberId: currentMember.id,
      role: currentMember.role,
      roomId: room.id,
    });
  }, [connectionStatus, currentMember, reducers, room.id, selectedAvatarKey]);

  const participants = useMemo(
    () => mapLiveParticipants(room, snapshot),
    [room, snapshot],
  );

  function setPermission(
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    const participant = participants.find((person) => person.id === memberId);

    if (!participant || participant.role === "host") {
      return;
    }

    const nextPermissions = {
      ...participant.permissions,
      [permission]: value,
    };
    const queueAuthority = nextPermissions.queue;

    void reducers.setMemberPermissions({
      actorMemberId: currentMember.id,
      canAddQueue: queueAuthority,
      canControlBrowser: nextPermissions.browser,
      canControlPlayback: nextPermissions.playback,
      canManageQueue: queueAuthority,
      roomId: room.id,
      targetMemberId: memberId,
    });
  }

  function grantControl(memberId: string) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    void reducers.grantRoomControl({
      actorMemberId: currentMember.id,
      roomId: room.id,
      targetMemberId: memberId,
    });
  }

  function revokeControl() {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    void reducers.revokeRoomControl({
      actorMemberId: currentMember.id,
      roomId: room.id,
    });
  }

  function kickMember(memberId: string) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    void reducers.kickMember({
      actorMemberId: currentMember.id,
      roomId: room.id,
      targetMemberId: memberId,
    });
  }

  function removeIdleMember(memberId: string) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    void reducers.removeIdleMember({
      actorMemberId: currentMember.id,
      roomId: room.id,
      targetMemberId: memberId,
    });
  }

  function loadMediaSource(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    void reducers.loadMediaSource({
      actorMemberId: currentMember.id,
      roomId: room.id,
      ...input,
    });
  }

  function setPlaybackState(input: {
    playbackRate?: number;
    positionSeconds: number;
    status: "buffering" | "ended" | "error" | "paused" | "playing";
  }) {
    if (!currentMember || !canControlPlayback || !reducers) {
      return;
    }

    void reducers.setPlaybackState({
      actorMemberId: currentMember.id,
      playbackRate: input.playbackRate ?? 1,
      positionSeconds: input.positionSeconds,
      roomId: room.id,
      status: input.status,
    });
  }

  function updateMediaTitle(sourceTitle: string, durationSeconds?: number) {
    if (!currentMember || !canControlPlayback || !reducers) {
      return;
    }

    void reducers.updateMediaTitle({
      actorMemberId: currentMember.id,
      durationSeconds,
      roomId: room.id,
      sourceTitle,
    });
  }

  function addQueueItem(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPinned?: boolean;
    isPlayNext?: boolean;
    isUnavailable?: boolean;
    allowDuplicate?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }) {
    if (!currentMember || !canAddQueue || !reducers) {
      return;
    }

    void reducers.addQueueItem({
      actorMemberId: currentMember.id,
      artist: input.artist ?? "",
      channelName: input.channelName,
      durationSeconds: input.durationSeconds,
      allowDuplicate: input.allowDuplicate ?? false,
      isPinned: input.isPinned ?? false,
      isPlayNext: input.isPlayNext ?? false,
      isUnavailable: input.isUnavailable ?? false,
      playlistId: input.playlistId,
      playlistTitle: input.playlistTitle,
      roomId: room.id,
      sourceTitle: input.sourceTitle,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.thumbnailUrl,
    });
  }

  function playQueueItem(queueItemId: string) {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    void reducers.playQueueItem({
      actorMemberId: currentMember.id,
      queueItemId,
      roomId: room.id,
    });
  }

  async function playQueueItemNow(queueItemId: string) {
    if (!currentMember || !canControlPlayback || !reducers) {
      return;
    }

    const uploadedQueueItem = snapshot.queue.find(
      (item) => item.queueItemId === queueItemId,
    );
    const uploadedAssetId = parseUploadedAssetReference(
      uploadedQueueItem?.sourceUrl,
    );

    if (uploadedQueueItem && uploadedAssetId) {
      const uploadedSession = await createUploadedPlaybackSession({
        assetId: uploadedAssetId,
        roomId: room.id,
      });

      await reducers.loadMediaSource({
        actorMemberId: currentMember.id,
        roomId: room.id,
        sourceTitle: uploadedQueueItem.title ?? "Uploaded media",
        sourceType: "direct",
        sourceUrl: createUploadedSessionReference(uploadedSession.id),
      });

      await reducers.setPlaybackState({
        actorMemberId: currentMember.id,
        playbackRate: 1,
        positionSeconds: 0,
        roomId: room.id,
        status: "playing",
      });
      return;
    }

    await reducers.playQueueItem({
      actorMemberId: currentMember.id,
      queueItemId,
      roomId: room.id,
    });

    await reducers.setPlaybackState({
      actorMemberId: currentMember.id,
      playbackRate: 1,
      positionSeconds: 0,
      roomId: room.id,
      status: "playing",
    });
  }

  async function advanceToNextQueueItem(input?: { autoplay?: boolean }) {
    const session = snapshot.session;

    if (
      !currentMember ||
      !canControlPlayback ||
      !reducers ||
      !session ||
      (input?.autoplay !== false && !session.queueAutoplayEnabled)
    ) {
      return;
    }

    const nextQueueItem = predictNextQueueItem(snapshot);
    const nextUploadedAssetId = parseUploadedAssetReference(
      nextQueueItem?.sourceUrl,
    );
    if (nextQueueItem && nextUploadedAssetId) {
      try {
        const uploadedSession = await createUploadedPlaybackSession({
          assetId: nextUploadedAssetId,
          roomId: room.id,
        });

        if (uploadedSession.assetId !== nextUploadedAssetId) {
          throw new Error(
            "Uploaded media session did not match the queued asset.",
          );
        }

        await reducers.advanceUploadedQueueItem({
          actorMemberId: currentMember.id,
          autoplay: input?.autoplay ?? false,
          expectedActiveQueueItemId: session.activeQueueItemId ?? undefined,
          expectedNextQueueItemId: nextQueueItem.queueItemId,
          expectedSourceUrl: session.sourceUrl ?? undefined,
          resolvedSourceUrl: createUploadedSessionReference(uploadedSession.id),
          roomId: room.id,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Uploaded media session could not start.",
        );
      }

      return;
    }

    await reducers.advanceQueueItem({
      actorMemberId: currentMember.id,
      autoplay: input?.autoplay ?? false,
      expectedActiveQueueItemId: session.activeQueueItemId ?? undefined,
      expectedSourceUrl: session.sourceUrl ?? undefined,
      roomId: room.id,
    });
  }

  function reportMediaFailure(input: {
    allowAutoplayAdvance: boolean;
    failureCode: string;
  }) {
    const session = snapshot.session;

    if (
      !currentMember ||
      !canControlPlayback ||
      !reducers ||
      !session?.sourceUrl
    ) {
      return;
    }

    void reducers.reportMediaFailure({
      actorMemberId: currentMember.id,
      allowAutoplayAdvance: input.allowAutoplayAdvance,
      expectedActiveQueueItemId: session.activeQueueItemId ?? undefined,
      expectedSourceUrl: session.sourceUrl,
      failureCode: input.failureCode,
      roomId: room.id,
    });
  }

  function moveQueueItem(queueItemId: string, position: number) {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    void reducers.moveQueueItem({
      actorMemberId: currentMember.id,
      position,
      queueItemId,
      roomId: room.id,
    });
  }

  function removeQueueItem(queueItemId: string) {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    void reducers.removeQueueItem({
      actorMemberId: currentMember.id,
      queueItemId,
      roomId: room.id,
    });
  }

  function clearQueue() {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    void reducers.clearQueue({
      actorMemberId: currentMember.id,
      roomId: room.id,
    });
  }

  async function sendChatMessage(input: {
    clientMessageId: string;
    text: string;
  }) {
    if (!currentMember || !reducers || connectionStatus !== "connected") {
      throw new Error("Room chat is not connected.");
    }

    await reducers.sendRoomChatMessage({
      actorMemberId: currentMember.id,
      clientMessageId: input.clientMessageId,
      roomId: room.id,
      text: input.text,
    });
  }

  async function renameRoom(roomName: string) {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    const result = await renameRoomAction({
      roomId: room.id,
      roomName,
    });

    await reducers.updateRoomName({
      actorMemberId: currentMember.id,
      roomId: room.id,
      roomName: result.roomName,
    });
  }

  async function switchMode(mode: "listen" | "watch") {
    if (!currentMember || !canManageAuthority || !reducers) {
      return;
    }

    const previousMode = snapshot.session?.mode ?? room.mode;

    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      session: currentSnapshot.session
        ? {
            ...currentSnapshot.session,
            mode,
          }
        : currentSnapshot.session,
    }));

    try {
      const result = await setRoomModeAction({
        mode,
        roomId: room.id,
      });

      setSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        session: currentSnapshot.session
          ? {
              ...currentSnapshot.session,
              mode: result.mode,
            }
          : currentSnapshot.session,
      }));

      await reducers.updateRoomMode({
        actorMemberId: currentMember.id,
        mode: result.mode,
        roomId: room.id,
      });
    } catch (error) {
      setSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        session: currentSnapshot.session
          ? {
              ...currentSnapshot.session,
              mode: previousMode,
            }
          : currentSnapshot.session,
      }));

      throw error;
    }
  }

  function setQueueAutoplay(enabled: boolean) {
    if (!currentMember || !canControlPlayback || !reducers) {
      return;
    }

    void reducers.setQueueAutoplay({
      actorMemberId: currentMember.id,
      enabled,
      roomId: room.id,
    });
  }

  function setQueueMode(mode: QueueMode) {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    void reducers.setQueueMode({
      actorMemberId: currentMember.id,
      mode,
      roomId: room.id,
    });
  }

  function setQueueItemPriority(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ) {
    if (!currentMember || !canManageQueue || !reducers) {
      return;
    }

    const queueItem = snapshot.queue.find(
      (item) => item.queueItemId === queueItemId,
    );

    if (!queueItem) {
      return;
    }

    void reducers.setQueueItemPriority({
      actorMemberId: currentMember.id,
      isPinned: input.isPinned ?? queueItem.isPinned,
      isPlayNext: input.isPlayNext ?? queueItem.isPlayNext,
      queueItemId,
      roomId: room.id,
    });
  }

  return {
    addQueueItem,
    advanceToNextQueueItem,
    canAddQueue,
    canManageAuthority,
    canManageQueue,
    canControlPlayback,
    clearQueue,
    connectionStatus,
    errorMessage,
    grantControl,
    kickMember,
    loadMediaSource,
    moveQueueItem,
    participants,
    playQueueItemNow,
    playQueueItem,
    removalNotice,
    removeIdleMember,
    removeQueueItem,
    reportMediaFailure,
    renameRoom,
    revokeControl,
    sendChatMessage,
    switchMode,
    setPermission,
    setPlaybackState,
    setQueueAutoplay,
    setQueueItemPriority,
    setQueueMode,
    updateMediaTitle,
    snapshot,
  };
}

async function createUploadedPlaybackSession(input: {
  assetId: string;
  roomId: string;
}) {
  const response = await fetch("/api/media/room-sessions", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: string;
    session?: {
      assetId: string;
      id: string;
    };
  };

  if (!response.ok || !payload.session) {
    throw new Error(payload.error ?? "Uploaded media session could not start.");
  }

  return payload.session;
}

function buildFallbackSnapshot(room: RoomSnapshot): LiveRoomSnapshot {
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

function readLiveSnapshot(liveDb: LiveDb): LiveRoomSnapshot {
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

function adjustSnapshotClock(
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

function shouldPreserveCurrentSnapshotDuringReconnect(
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

function mapLiveParticipants(
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
