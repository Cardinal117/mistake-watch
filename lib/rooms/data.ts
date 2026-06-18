import "server-only";

import { cookies } from "next/headers";

import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
} from "@/lib/player/source";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  type Tables,
} from "@/lib/supabase";

import { closeIdleUnsavedRooms } from "./lifecycle";
import { createLiveRoomSeedToken } from "./live-authority";
import type {
  DashboardData,
  DashboardRoomSummary,
  RoomJoinPreview,
  RoomParticipant,
  RoomQueueItem,
  RoomSnapshot,
} from "./types";

const GUEST_COOKIE_PREFIX = "mw_guest_";

type Room = Tables<"rooms">;
type RoomMember = Tables<"room_members">;
type QueueItem = Tables<"queue_items">;
type RoomSettings = Tables<"room_settings">;

export async function getDashboardData(): Promise<DashboardData> {
  try {
    await closeIdleUnsavedRooms();

    const cookieStore = await cookies();
    const guestCookies = cookieStore
      .getAll()
      .filter((cookie) => cookie.name.startsWith(GUEST_COOKIE_PREFIX));

    const reclaimed = await Promise.all(
      guestCookies.map(async (cookie) => {
        const roomId = cookie.name.slice(GUEST_COOKIE_PREFIX.length);
        return reclaimGuestMembership({ roomId, token: cookie.value });
      }),
    );

    const activeSessions = reclaimed.filter(
      (session): session is NonNullable<(typeof reclaimed)[number]> =>
        Boolean(session && session.room.status === "open"),
    );
    const roomIds = activeSessions.map((session) => session.room.id);

    const recentRooms = await Promise.all(
      roomIds.map(async (roomId) => getDashboardRoomSummary(roomId, "rejoin")),
    );

    const sortedRecentRooms = recentRooms
      .filter((room): room is DashboardRoomSummary => Boolean(room))
      .sort((a, b) => a.name.localeCompare(b.name));
    const savedRooms = sortedRecentRooms.filter((room) => room.isSaved);

    return {
      currentRoom: sortedRecentRooms[0] ?? null,
      friendRooms: [],
      recentRooms: sortedRecentRooms,
      savedRooms,
    };
  } catch (error) {
    return {
      currentRoom: null,
      friendRooms: [],
      recentRooms: [],
      savedRooms: [],
      statusMessage:
        error instanceof Error
          ? `Supabase-backed rooms are unavailable: ${error.message}`
          : "Supabase-backed rooms are unavailable.",
    };
  }
}

export async function getRoomSnapshotForGuest(
  roomId: string,
): Promise<RoomSnapshot | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

    const session = token
      ? await reclaimGuestMembership({ roomId, token })
      : null;

    if (!session || session.room.status !== "open") {
      return getRoomSnapshotForSignedInMember(roomId);
    }

    return getRoomSnapshot(session.room.id, session.member.id);
  } catch {
    return null;
  }
}

async function getRoomSnapshotForSignedInMember(
  roomId: string,
): Promise<RoomSnapshot | null> {
  const serverClient = await createSupabaseServerClient();
  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: member, error: memberError } = await supabase
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (memberError || !member) {
    return null;
  }

  return getRoomSnapshot(roomId, member.id);
}

export async function getRoomJoinPreview(
  roomId: string,
): Promise<RoomJoinPreview | null> {
  try {
    await closeIdleUnsavedRooms();

    const supabase = createSupabaseAdminClient();
    const { data: room, error } = await supabase
      .from("rooms")
      .select("id, name, invite_code, mode, status")
      .eq("id", roomId)
      .eq("status", "open")
      .maybeSingle();

    if (error || !room) {
      return null;
    }

    return {
      code: room.invite_code,
      id: room.id,
      mode: room.mode === "listen" ? "listen" : "watch",
      name: room.name,
    };
  } catch {
    return null;
  }
}

async function getDashboardRoomSummary(
  roomId: string,
  joinState: DashboardRoomSummary["joinState"],
): Promise<DashboardRoomSummary | null> {
  const snapshot = await getRoomSnapshot(roomId);

  if (!snapshot) {
    return null;
  }

  const nowPlaying = snapshot.queue.find((item) => item.status === "now");

  return {
    duration: nowPlaying?.duration ?? snapshot.nowPlaying.duration,
    host: snapshot.host,
    id: snapshot.id,
    isSaved: snapshot.isSaved,
    joinState,
    mode: snapshot.mode,
    name: snapshot.name,
    nowPlaying: snapshot.nowPlaying.title,
    participants: snapshot.participantsList.filter(
      (participant) => participant.status === "online",
    ).length,
    privacy: "invite",
    roomCode: snapshot.code,
    sourceType: nowPlaying?.sourceType,
    sourceUrl: nowPlaying?.sourceUrl,
    thumbnailUrl: nowPlaying?.thumbnailUrl,
    updatedAt: "Saved on this browser",
  };
}

async function getRoomSnapshot(
  roomId: string,
  currentMemberId?: string,
): Promise<RoomSnapshot | null> {
  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    return null;
  }

  const [{ data: members }, { data: queueItems }, { data: settings }] =
    await Promise.all([
      supabase
        .from("room_members")
        .select()
        .eq("room_id", room.id)
        .order("joined_at"),
      supabase
        .from("queue_items")
        .select()
        .eq("room_id", room.id)
        .neq("status", "removed")
        .order("position"),
      supabase
        .from("room_settings")
        .select()
        .eq("room_id", room.id)
        .maybeSingle(),
    ]);

  return mapRoomSnapshot({
    members: members ?? [],
    queueItems: queueItems ?? [],
    room,
    currentMemberId,
    settings: settings ?? null,
  });
}

async function mapRoomSnapshot({
  members,
  queueItems,
  room,
  currentMemberId,
  settings,
}: {
  currentMemberId?: string;
  members: RoomMember[];
  queueItems: QueueItem[];
  room: Room;
  settings: RoomSettings | null;
}): Promise<RoomSnapshot> {
  const hostMember = members.find((member) => member.role === "host");
  const currentMember = currentMemberId
    ? members.find((member) => member.id === currentMemberId)
    : undefined;
  const isCurrentHost =
    Boolean(currentMember && hostMember) && currentMember?.id === hostMember?.id;
  const mappedQueue = queueItems.map(mapQueueItem);
  const nowPlaying = mappedQueue.find((item) => item.status === "now");
  const mode = room.mode === "listen" ? "listen" : "watch";
  const liveSeedToken =
    isCurrentHost && hostMember
      ? await createLiveRoomSeedToken({
          hostMemberId: hostMember.id,
          roomId: room.id,
        })
      : null;

  return {
    code: room.invite_code,
    currentMember: currentMember
      ? {
          id: currentMember.id,
          name: currentMember.display_name,
          role: currentMember.role === "host" ? "host" : "guest",
          userId: currentMember.user_id,
        }
      : null,
    host: hostMember?.display_name ?? "Host",
    hostMemberId: hostMember?.id ?? null,
    id: room.id,
    isSaved: room.is_saved,
    liveSeedToken,
    mode,
    name: room.name,
    nowPlaying: {
      album: mode === "listen" ? "Room queue" : undefined,
      artist: nowPlaying?.artist,
      duration: nowPlaying?.duration ?? "Idle",
      elapsed: "00:00",
      latency: "SpacetimeDB pending",
      mood: mode === "listen" ? "Guest-first listening" : undefined,
      resolution:
        mode === "listen" ? "Direct audio pending" : "Direct media pending",
      source: nowPlaying ? "Persisted queue item" : "No source loaded yet",
      sync: "Live room engine arrives in Task 11",
      title: nowPlaying?.title ?? "Ready for a direct media URL",
    },
    participants: members.filter((member) =>
      isRecentlySeen(member.last_seen_at),
    ).length,
    participantsList: members.map((member) => mapParticipant(member, settings)),
    queue: mappedQueue,
  };
}

function mapQueueItem(item: QueueItem): RoomQueueItem {
  const sourceType =
    item.source_type === "hls" || item.source_type === "youtube"
      ? item.source_type
      : "direct";

  return {
    addedBy: item.added_by_guest_identity_id ? "Guest" : "Account user",
    artist: item.artist ?? undefined,
    duration: item.duration_seconds
      ? formatDuration(item.duration_seconds)
      : "Metadata pending",
    id: item.id,
    sourceType,
    sourceUrl: item.source_url,
    status: item.status === "playing" ? "now" : "queued",
    thumbnailUrl:
      sourceType === "youtube"
        ? (getYouTubeThumbnailUrl(item.source_url) ?? undefined)
        : undefined,
    title: getSourceDisplayTitle({
      sourceType,
      sourceUrl: item.source_url,
      title: item.title,
    }),
  };
}

function mapParticipant(
  member: RoomMember,
  settings: RoomSettings | null,
): RoomParticipant {
  const isHost = member.role === "host";

  return {
    id: member.id,
    name: member.display_name,
    permissions: {
      browser: isHost,
      manageQueue: isHost,
      playback: isHost,
      queue: isHost || Boolean(settings?.guest_can_add_queue),
    },
    role: isHost ? "host" : "guest",
    status: isRecentlySeen(member.last_seen_at) ? "online" : "idle",
  };
}

function isRecentlySeen(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() < 10 * 60 * 1000;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
