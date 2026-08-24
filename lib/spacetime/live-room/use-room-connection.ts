"use client";

import { useEffect, useRef, useState } from "react";

import { readStoredAvatarKey } from "@/lib/identity/avatar-selection";
import { touchRoomActivityAction } from "@/lib/rooms/actions";
import type { RoomSnapshot } from "@/lib/rooms";
import { getRoomSubscriptions } from "../adapter";
import type { SpacetimeConnectionStatus } from "../adapter";
import { getSpacetimeConfig } from "../config";
import { DbConnection } from "../generated";
import type { LiveRoomSnapshot } from "../types";
import {
  readSpacetimeIdentityHex,
  requestLiveRoomAdmission,
} from "./admission";
import type { LiveDb, LiveReducers } from "./client-types";
import {
  beginRoomConnectionAttempt,
  getFailedRoomConnectionReadiness,
  type RoomConnectionReadiness,
} from "./connection-readiness";
import {
  adjustSnapshotClock,
  buildFallbackSnapshot,
  readLiveSnapshot,
  shouldPreserveCurrentSnapshotDuringReconnect,
} from "./snapshot";

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export function useRoomConnection(room: RoomSnapshot) {
  const [connectionStatus, setConnectionStatus] =
    useState<SpacetimeConnectionStatus>(() =>
      room.currentMember && room.hostMemberId ? "connecting" : "idle",
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionReadiness, setConnectionReadiness] =
    useState<RoomConnectionReadiness>({ status: "connecting" });
  const [memberMissingNotice, setMemberMissingNotice] = useState<string | null>(
    null,
  );
  const [admissionId, setAdmissionId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LiveRoomSnapshot>(() =>
    buildFallbackSnapshot(room),
  );
  const [reducers, setReducers] = useState<LiveReducers | null>(null);
  const serverClockOffsetMs = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const recoveringConnectionRef = useRef(false);
  const [connectionRunId, setConnectionRunId] = useState(0);
  const currentMember = room.currentMember;
  const tokenStorageKey = `mw_spacetime_token_${room.id}`;

  function retryConnection() {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptRef.current = 0;
    setErrorMessage(null);
    setAdmissionId(null);
    setConnectionStatus("connecting");
    setConnectionReadiness({ status: "connecting" });
    setConnectionRunId((current) => current + 1);
  }

  useEffect(() => {
    if (!currentMember || !room.hostMemberId) {
      return;
    }

    const hostMemberId = room.hostMemberId;
    let disposed = false;
    let heartbeatTimer: number | undefined;
    let durableHeartbeatTimer: number | undefined;
    let liveDb: LiveDb | undefined;
    let activeReducers: LiveReducers | undefined;
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
      liveDb.room_participant_presence.removeOnInsert(handleRowChange);
      liveDb.room_participant_presence.removeOnUpdate(handleRowChange);
      liveDb.room_participant_presence.removeOnDelete(handleRowChange);
      liveDb.room_permission.removeOnInsert(handleRowChange);
      liveDb.room_permission.removeOnUpdate(handleRowChange);
      liveDb.room_permission.removeOnDelete(handleRowChange);
      liveDb.room_rhythm_profile.removeOnInsert(handleRowChange);
      liveDb.room_rhythm_profile.removeOnUpdate(handleRowChange);
      liveDb.room_rhythm_profile.removeOnDelete(handleRowChange);
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
      activeReducers = undefined;
      setReducers(null);
      setAdmissionId(null);

      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const nextReadiness = getFailedRoomConnectionReadiness(attempt, message);

      setConnectionReadiness(nextReadiness);
      setErrorMessage(message);

      if (nextReadiness.status === "error") {
        setConnectionStatus("error");
        return;
      }

      const delayMs = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1),
        RECONNECT_MAX_DELAY_MS,
      );

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        setConnectionStatus("connecting");
        setConnectionRunId((current) => current + 1);
      }, delayMs);
    };

    const connection = beginRoomConnectionAttempt({
      connect: ({ onConnect, onConnectError, onDisconnect }) =>
        DbConnection.builder()
          .withUri(config.uri)
          .withDatabaseName(config.databaseName)
          .withToken(storedToken ?? "")
          .onConnect((connected, identity, token) => {
            try {
              onConnect({
                connected,
                identityHex: readSpacetimeIdentityHex(identity),
                token,
              });
            } catch {
              onConnectError();
            }
          })
          .onDisconnect(onDisconnect)
          .onConnectError(onConnectError)
          .build(),
      onConnect: ({ connected, identityHex, token }) => {
        reconnectAttemptRef.current = 0;
        window.localStorage.setItem(tokenStorageKey, token);
        setConnectionStatus("connected");
        setErrorMessage(null);
        setMemberMissingNotice(null);

        liveDb = connected.db as unknown as LiveDb;
        activeReducers = connected.reducers as unknown as LiveReducers;
        setReducers(activeReducers);

        liveDb.room_participant.onInsert(handleRowChange);
        liveDb.room_participant.onUpdate(handleRowChange);
        liveDb.room_participant.onDelete(handleRowChange);
        liveDb.room_participant_presence.onInsert(handleRowChange);
        liveDb.room_participant_presence.onUpdate(handleRowChange);
        liveDb.room_participant_presence.onDelete(handleRowChange);
        liveDb.room_permission.onInsert(handleRowChange);
        liveDb.room_permission.onUpdate(handleRowChange);
        liveDb.room_permission.onDelete(handleRowChange);
        liveDb.room_rhythm_profile.onInsert(handleRowChange);
        liveDb.room_rhythm_profile.onUpdate(handleRowChange);
        liveDb.room_rhythm_profile.onDelete(handleRowChange);
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

        connected
          .subscriptionBuilder()
          .onApplied(() => refreshSnapshot())
          .onError(() => {
            setConnectionStatus("error");
            scheduleReconnect("Live room subscription failed. Reconnecting...");
          })
          .subscribe(getRoomSubscriptions(room.id));

        void (async () => {
          if (currentMember.role === "host" && room.liveSeedToken) {
            await connected.reducers.seedRoomSession({
              hostMemberId,
              mode: room.mode,
              roomId: room.id,
              roomName: room.name,
              seedToken: room.liveSeedToken,
            });
          } else if (currentMember.role === "host") {
            throw new Error(
              "Live room host authority is not configured. Set SPACETIME_SERVER_AUTH_TOKEN and trusted_seed_issuer before opening live rooms.",
            );
          }

          const admission = await requestLiveRoomAdmission({
            identityHex,
            roomId: room.id,
          });

          if (disposed) {
            return;
          }

          setAdmissionId(admission.admissionId);
          await connected.reducers.joinRoom({
            admissionId: admission.admissionId,
            admissionToken: admission.admissionToken,
            avatarKey: readStoredAvatarKey(currentMember.id),
            displayName: currentMember.name,
            memberId: currentMember.id,
            role: currentMember.role,
            roomId: room.id,
          });

          heartbeatTimer = window.setInterval(() => {
            void connected.reducers.heartbeat({
              memberId: currentMember.id,
              roomId: room.id,
            });
          }, 15_000);

          durableHeartbeatTimer = window.setInterval(() => {
            void touchRoomActivityAction({ roomId: room.id });
          }, 60_000);
        })().catch((error: unknown) => {
          const message =
            error instanceof Error && error.message.trim()
              ? error.message
              : "Live room admission failed. Reconnecting...";
          setErrorMessage(message);
          scheduleReconnect(message);
          connected.disconnect();
        });
      },
      onDisconnect: () => {
        setConnectionStatus("disconnected");
        scheduleReconnect("Live room signal disconnected. Reconnecting...");
      },
      onConnectError: () => {
        setConnectionStatus("error");
        scheduleReconnect("Live room connection failed. Retrying...");
      },
      onReadiness: setConnectionReadiness,
    });

    return () => {
      disposed = true;

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      clearLiveTimers();
      removeLiveListeners();

      if (shouldLeaveOnCleanup && activeReducers) {
        void activeReducers.leaveRoom({
          memberId: currentMember.id,
          roomId: room.id,
        });
      }

      connection.disconnect();
      setReducers(null);
      setAdmissionId(null);
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

  return {
    admissionId,
    connectionReadiness,
    connectionStatus,
    errorMessage,
    memberMissingNotice,
    reducers,
    retryConnection,
    setErrorMessage,
    setMemberMissingNotice,
    setSnapshot,
    snapshot,
  };
}
