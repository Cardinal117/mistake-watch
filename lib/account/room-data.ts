import "server-only";
import { isPersonalRoomOwner } from "@/lib/rooms/personal-access";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  type Tables,
} from "@/lib/supabase";

import {
  projectAccountRooms,
  type AccountRoomRecord,
  type AccountRoomSummary,
} from "./room-projection";

const ROOM_COLUMNS =
  "id, name, mode, status, privacy, room_kind, is_saved, owner_user_id, saved_by_user_id, last_active_at, updated_at, created_at";

type RoomRow = Tables<"rooms">;

export async function listAccountRooms(
  userId: string,
): Promise<AccountRoomSummary[]> {
  const supabase = createSupabaseAdminClient();
  const [membershipsResult, ownedResult, savedResult] = await Promise.all([
    supabase.from("room_members").select("room_id").eq("user_id", userId),
    supabase
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("owner_user_id", userId)
      .neq("status", "archived"),
    supabase
      .from("rooms")
      .select(ROOM_COLUMNS)
      .eq("saved_by_user_id", userId)
      .neq("status", "archived"),
  ]);

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }
  if (ownedResult.error) {
    throw ownedResult.error;
  }
  if (savedResult.error) {
    throw savedResult.error;
  }

  const memberRoomIds = membershipsResult.data.map((row) => row.room_id);
  const attributedRooms = mergeRoomRows(
    ownedResult.data as unknown as AccountRoomRecord[],
    savedResult.data as unknown as AccountRoomRecord[],
  );
  const attributedRoomIds = new Set(attributedRooms.map((room) => room.id));
  const memberOnlyRoomIds = memberRoomIds.filter(
    (roomId) => !attributedRoomIds.has(roomId),
  );
  let memberRooms: AccountRoomRecord[] = [];

  if (memberOnlyRoomIds.length > 0) {
    const { data, error } = await supabase
      .from("rooms")
      .select(ROOM_COLUMNS)
      .in("id", memberOnlyRoomIds)
      .neq("status", "archived");

    if (error) {
      throw error;
    }

    memberRooms = data as unknown as AccountRoomRecord[];
  }

  const allRooms = mergeRoomRows(attributedRooms, memberRooms);
  const personal = allRooms.find((room) => room.room_kind === "personal");
  const personalAllowed = personal
    ? await isPersonalRoomOwner(personal)
    : false;
  const sharedIds = new Set<string>();
  if (allRooms.some((room) => room.room_kind === "shared")) {
    const client = await createSupabaseServerClient();
    const { data, error } = await client
      .from("rooms")
      .select("id")
      .eq("room_kind", "shared")
      .neq("status", "archived");
    if (error) throw error;
    for (const room of data ?? []) sharedIds.add(room.id);
  }
  return projectAccountRooms({
    memberRoomIds,
    rooms: allRooms.filter(
      (room) =>
        (room.room_kind !== "personal" || personalAllowed) &&
        (room.room_kind !== "shared" || sharedIds.has(room.id)),
    ),
    userId,
  });
}

function mergeRoomRows(
  ...groups: Array<Array<AccountRoomRecord | RoomRow>>
): AccountRoomRecord[] {
  const rooms = new Map<string, AccountRoomRecord>();

  for (const room of groups.flat()) {
    rooms.set(room.id, room as AccountRoomRecord);
  }

  return [...rooms.values()];
}
