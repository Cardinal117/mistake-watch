import "server-only";

import { createSupabaseAdminClient, type Tables } from "@/lib/supabase";

import {
  projectAccountRooms,
  type AccountRoomRecord,
  type AccountRoomSummary,
} from "./room-projection";

const ROOM_COLUMNS =
  "id, name, mode, status, privacy, is_saved, owner_user_id, saved_by_user_id, last_active_at, updated_at, created_at";

type RoomRow = Tables<"rooms">;

export async function listAccountRooms(
  userId: string,
): Promise<AccountRoomSummary[]> {
  const supabase = createSupabaseAdminClient();
  const [membershipsResult, ownedResult, savedResult] = await Promise.all([
    supabase.from("room_members").select("room_id").eq("user_id", userId),
    supabase.from("rooms").select(ROOM_COLUMNS).eq("owner_user_id", userId),
    supabase.from("rooms").select(ROOM_COLUMNS).eq("saved_by_user_id", userId),
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
      .in("id", memberOnlyRoomIds);

    if (error) {
      throw error;
    }

    memberRooms = data as unknown as AccountRoomRecord[];
  }

  return projectAccountRooms({
    memberRoomIds,
    rooms: mergeRoomRows(attributedRooms, memberRooms),
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
