import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";

const IDLE_ROOM_TTL_MS = 60 * 60 * 1000;

export async function closeIdleUnsavedRooms() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const freshnessCutoffIso = new Date(
    now.getTime() - IDLE_ROOM_TTL_MS,
  ).toISOString();

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, created_at, idle_deadline_at, last_active_at")
    .eq("status", "open")
    .eq("is_saved", false);

  if (roomsError) {
    throw roomsError;
  }

  const idleRooms = rooms.filter((room) => {
    const deadline = new Date(
      room.idle_deadline_at ??
        addHoursIso(new Date(room.last_active_at ?? room.created_at), 1),
    );

    return deadline.getTime() <= now.getTime();
  });

  await Promise.all(
    idleRooms.map(async (room) => {
      const { count, error: countError } = await supabase
        .from("room_members")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id)
        .gt("last_seen_at", freshnessCutoffIso);

      if (countError) {
        throw countError;
      }

      if (count && count > 0) {
        await supabase
          .from("rooms")
          .update({
            idle_deadline_at: addHoursIso(now, 1),
            last_active_at: nowIso,
          })
          .eq("id", room.id)
          .eq("status", "open");
        return;
      }

      await supabase
        .from("rooms")
        .update({
          close_reason: "idle_timeout",
          closed_at: nowIso,
          status: "closed",
        })
        .eq("id", room.id)
        .eq("is_saved", false)
        .eq("status", "open");
    }),
  );
}

function addHoursIso(date: Date, hours: number) {
  return new Date(date.getTime() + hours * IDLE_ROOM_TTL_MS).toISOString();
}
