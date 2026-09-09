export type AccountRoomRelationship = "owned" | "saved" | "joined";

export type AccountRoomRecord = {
  created_at: string;
  id: string;
  is_saved: boolean;
  last_active_at: string | null;
  mode: string;
  name: string;
  owner_user_id: string | null;
  privacy: string;
  room_kind?: string;
  saved_by_user_id: string | null;
  status: string;
  updated_at: string;
};

export type AccountRoomSummary = {
  // Optional for snapshots from an older server during the additive rollout.
  kind?: "legacy" | "personal" | "shared" | "themed" | "temporary";
  id: string;
  isSaved: boolean;
  lastActiveAt: string;
  mode: "listen" | "watch";
  name: string;
  privacy: "invite" | "friends";
  relationship: AccountRoomRelationship;
  status: "open" | "closed";
};

export function projectAccountRooms({
  memberRoomIds,
  rooms,
  userId,
}: {
  memberRoomIds: string[];
  rooms: AccountRoomRecord[];
  userId: string;
}): AccountRoomSummary[] {
  const memberships = new Set(memberRoomIds);
  const projected = new Map<string, AccountRoomSummary>();

  for (const room of rooms) {
    // Only an absent pre-migration field has a compatibility default.
    // Unsupported values must never be presented as ordinary Legacy rooms.
    if (
      room.room_kind !== undefined &&
      room.room_kind !== "legacy" &&
      room.room_kind !== "personal" &&
      room.room_kind !== "shared" &&
      room.room_kind !== "themed" && room.room_kind !== "temporary"
    )
      continue;
    if (room.room_kind === "personal" && room.owner_user_id !== userId)
      continue;
    if (room.room_kind === "shared" && !memberships.has(room.id)) continue;
    const relationship = getRelationship(room, memberships, userId);

    if (!relationship || projected.has(room.id)) {
      continue;
    }

    projected.set(room.id, {
      id: room.id,
      kind:
        room.room_kind === "personal"
          ? "personal"
          : room.room_kind === "shared"
            ? "shared"
            : room.room_kind === "themed"
              ? "themed"
              : room.room_kind === "temporary" ? "temporary"
              : "legacy",
      isSaved: room.is_saved && room.saved_by_user_id === userId,
      lastActiveAt: room.last_active_at ?? room.updated_at ?? room.created_at,
      mode: room.mode === "listen" ? "listen" : "watch",
      name: room.name,
      privacy: room.privacy === "friends" ? "friends" : "invite",
      relationship,
      status: room.status === "open" ? "open" : "closed",
    });
  }

  return [...projected.values()].sort(
    (left, right) =>
      readTimestamp(right.lastActiveAt) - readTimestamp(left.lastActiveAt) ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
}

function readTimestamp(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getRelationship(
  room: AccountRoomRecord,
  memberships: Set<string>,
  userId: string,
): AccountRoomRelationship | null {
  if (room.owner_user_id === userId) {
    return "owned";
  }

  if (room.saved_by_user_id === userId) {
    return "saved";
  }

  return memberships.has(room.id) ? "joined" : null;
}
