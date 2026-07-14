"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  readStoredAvatarKey,
  useSelectedAvatarKey,
} from "@/lib/identity/avatar-selection";
import {
  renameRoomAction,
  setRoomModeAction,
  touchRoomActivityAction,
} from "@/lib/rooms/actions";
import type { QueueMode } from "@/lib/queue/model";
import type { RoomParticipant, RoomSnapshot } from "@/lib/rooms";
import { parseUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import { createUploadedPlaybackSessionReference } from "@/lib/media/uploaded-room-session-client";
import { predictNextQueueItem } from "@/lib/player/next-item-preparation";
import { DbConnection } from "./generated";
import { getRoomSubscriptions } from "./adapter";
import { getSpacetimeConfig } from "./config";
import type { SpacetimeConnectionStatus } from "./adapter";
import type { LiveRoomSnapshot } from "./types";
import type {
  LiveDb,
  LiveReducers,
  LiveRoomState,
} from "./live-room/client-types";
import {
  adjustSnapshotClock,
  buildFallbackSnapshot,
  mapLiveParticipants,
  readLiveSnapshot,
  shouldPreserveCurrentSnapshotDuringReconnect,
} from "./live-room/snapshot";

export type { LiveRoomState } from "./live-room/client-types";

const LIVE_ROOM_RECONNECT_BASE_DELAY_MS = 1_000;
const LIVE_ROOM_RECONNECT_MAX_DELAY_MS = 30_000;
const LIVE_ROOM_STALE_MEMBER_REJOIN_MS = 4_000;
const LIVE_ROOM_MEMBER_MISSING_NOTICE_MS = 30_000;

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
      try {
        const resolvedSourceUrl = await createUploadedPlaybackSessionReference({
          assetId: uploadedAssetId,
          roomId: room.id,
        });

        await reducers.playUploadedQueueItem({
          actorMemberId: currentMember.id,
          queueItemId: uploadedQueueItem.queueItemId,
          resolvedSourceUrl,
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
        const resolvedSourceUrl = await createUploadedPlaybackSessionReference({
          assetId: nextUploadedAssetId,
          roomId: room.id,
        });

        await reducers.advanceUploadedQueueItem({
          actorMemberId: currentMember.id,
          autoplay: input?.autoplay ?? false,
          expectedActiveQueueItemId: session.activeQueueItemId ?? undefined,
          expectedNextQueueItemId: nextQueueItem.queueItemId,
          expectedSourceUrl: session.sourceUrl ?? undefined,
          resolvedSourceUrl,
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
