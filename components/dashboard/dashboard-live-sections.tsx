"use client";

import { useEffect, useMemo, useState } from "react";

import type { DashboardData, DashboardRoomSummary } from "@/lib/rooms";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
} from "@/lib/player/source";
import { getRoomSubscriptions } from "@/lib/spacetime/adapter";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import { DbConnection } from "@/lib/spacetime/generated";
import type {
  RoomParticipant as GeneratedRoomParticipant,
  RoomSession as GeneratedRoomSession,
} from "@/lib/spacetime/generated/types";
import { CurrentRoomSection } from "./current-room-section";
import { FirstRunGuide } from "./first-run-guide";
import { FriendRooms } from "./friend-rooms";
import { RecentRooms } from "./recent-rooms";
import { SavedRooms } from "./saved-rooms";

type DashboardLiveSectionsProps = {
  initialData: DashboardData;
};

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

type DashboardLiveDb = {
  room_participant: ClientTable<GeneratedRoomParticipant>;
  room_session: ClientTable<GeneratedRoomSession>;
};

const DASHBOARD_TOKEN_KEY = "mw_spacetime_dashboard_token";
const ONLINE_FRESHNESS_MS = 45_000;

export function DashboardLiveSections({
  initialData,
}: DashboardLiveSectionsProps) {
  const [livePatches, setLivePatches] = useState<
    Record<string, Partial<DashboardRoomSummary>>
  >({});
  const roomIds = useMemo(
    () =>
      uniqueRoomIds([
        initialData.currentRoom,
        ...initialData.recentRooms,
        ...initialData.savedRooms,
        ...initialData.friendRooms,
      ]),
    [initialData],
  );
  const currentRoom = initialData.currentRoom
    ? applyLivePatch(initialData.currentRoom, livePatches)
    : null;
  const recentRooms = applyLivePatches(initialData.recentRooms, livePatches);
  const savedRooms = applyLivePatches(initialData.savedRooms, livePatches);
  const friendRooms = applyLivePatches(initialData.friendRooms, livePatches);

  useEffect(() => {
    if (roomIds.length === 0) {
      return;
    }

    const config = getSpacetimeConfig();
    const storedToken = window.localStorage.getItem(DASHBOARD_TOKEN_KEY);
    let liveDb: DashboardLiveDb | undefined;
    let freshnessTimer: number | undefined;

    const refreshLivePatches = () => {
      if (!liveDb) {
        return;
      }

      setLivePatches(readLiveDashboardPatches(liveDb, roomIds));
    };

    const handleRowChange = () => refreshLivePatches();

    const connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(storedToken ?? "")
      .onConnect((connected, _identity, token) => {
        window.localStorage.setItem(DASHBOARD_TOKEN_KEY, token);
        liveDb = connected.db as unknown as DashboardLiveDb;

        liveDb.room_participant.onInsert(handleRowChange);
        liveDb.room_participant.onUpdate(handleRowChange);
        liveDb.room_participant.onDelete(handleRowChange);
        liveDb.room_session.onInsert(handleRowChange);
        liveDb.room_session.onUpdate(handleRowChange);
        liveDb.room_session.onDelete(handleRowChange);

        connected
          .subscriptionBuilder()
          .onApplied(refreshLivePatches)
          .subscribe(roomIds.flatMap((roomId) => getRoomSubscriptions(roomId)));

        freshnessTimer = window.setInterval(refreshLivePatches, 15_000);
      })
      .onDisconnect(() => {
        setLivePatches({});
      })
      .onConnectError(() => {
        setLivePatches({});
      })
      .build();

    return () => {
      if (freshnessTimer) {
        window.clearInterval(freshnessTimer);
      }

      if (liveDb) {
        liveDb.room_participant.removeOnInsert(handleRowChange);
        liveDb.room_participant.removeOnUpdate(handleRowChange);
        liveDb.room_participant.removeOnDelete(handleRowChange);
        liveDb.room_session.removeOnInsert(handleRowChange);
        liveDb.room_session.removeOnUpdate(handleRowChange);
        liveDb.room_session.removeOnDelete(handleRowChange);
      }

      connection.disconnect();
    };
  }, [roomIds]);

  return (
    <div className="space-y-8 px-6 md:px-8">
      <FirstRunGuide />
      <CurrentRoomSection room={currentRoom} />
      <RecentRooms rooms={recentRooms} />
      <SavedRooms rooms={savedRooms} />
      <FriendRooms rooms={friendRooms} />
    </div>
  );
}

function readLiveDashboardPatches(liveDb: DashboardLiveDb, roomIds: string[]) {
  const patches: Record<string, Partial<DashboardRoomSummary>> = {};
  const roomIdSet = new Set(roomIds);
  const sessions = [...liveDb.room_session.iter()].filter((session) =>
    roomIdSet.has(session.roomId),
  );
  const participants = [...liveDb.room_participant.iter()].filter(
    (participant) => roomIdSet.has(participant.roomId),
  );

  for (const roomId of roomIds) {
    const session = sessions.find((row) => row.roomId === roomId);
    const onlineCount = participants.filter(
      (participant) =>
        participant.roomId === roomId && isOnlineParticipant(participant),
    ).length;

    patches[roomId] = {
      duration: session ? getLiveStateLabel(session) : "Idle",
      name: session?.roomName,
      nowPlaying: session ? getLiveNowPlayingLabel(session) : "No active media",
      participants: onlineCount,
      sourceType:
        session?.sourceType === "hls" || session?.sourceType === "youtube"
          ? session.sourceType
          : session?.sourceType
            ? "direct"
            : undefined,
      sourceUrl: session?.sourceUrl ?? undefined,
      thumbnailUrl:
        session?.sourceType === "youtube" && session.sourceUrl
          ? (getYouTubeThumbnailUrl(session.sourceUrl) ?? undefined)
          : undefined,
      updatedAt: onlineCount > 0 ? "Live now" : "No one online",
    };
  }

  return patches;
}

function applyLivePatches(
  rooms: DashboardRoomSummary[],
  patches: Record<string, Partial<DashboardRoomSummary>>,
) {
  return rooms.map((room) => applyLivePatch(room, patches));
}

function applyLivePatch(
  room: DashboardRoomSummary,
  patches: Record<string, Partial<DashboardRoomSummary>>,
) {
  return {
    ...room,
    ...patches[room.id],
  };
}

function uniqueRoomIds(rooms: Array<DashboardRoomSummary | null>) {
  return [...new Set(rooms.flatMap((room) => (room ? [room.id] : [])))];
}

function isOnlineParticipant(participant: GeneratedRoomParticipant) {
  return (
    participant.status === "online" &&
    Date.now() - toNumber(participant.lastSeenMs) < ONLINE_FRESHNESS_MS
  );
}

function getLiveNowPlayingLabel(session: GeneratedRoomSession) {
  if (!session.sourceUrl || !session.sourceType) {
    return "Waiting for media";
  }

  const title = getSourceDisplayTitle({
    sourceType:
      session.sourceType === "hls" || session.sourceType === "youtube"
        ? session.sourceType
        : "direct",
    sourceUrl: session.sourceUrl,
    title: session.sourceTitle,
  });
  const verb = session.mode === "listen" ? "Listening to" : "Watching";

  return `${verb}: ${title}`;
}

function getLiveStateLabel(session: GeneratedRoomSession) {
  if (!session.sourceUrl) {
    return "Awaiting media";
  }

  if (session.status === "playing") {
    return "Playing";
  }

  if (session.status === "buffering") {
    return "Buffering";
  }

  if (session.status === "ended") {
    return "Ended";
  }

  if (session.status === "error") {
    return "Playback error";
  }

  return "Paused";
}

function toNumber(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}
