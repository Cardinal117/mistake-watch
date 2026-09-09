import "server-only";
import { drainDurableRecommendationOutbox } from "@/lib/recommendations/durable-outbox-drain";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { runRoomCleanup } from "./cleanup-core";
import { retireLiveRoom } from "./shared-live-revocation";

export async function hasPersistentRoomEnded(roomId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomId,
    )
  )
    return false;
  const { data, error } = await createSupabaseAdminClient().rpc(
    "has_persistent_room_ended",
    { target_room: roomId },
  );
  if (error) throw error;
  return data === true;
}

export async function cleanupPersistentRooms(roomId?: string) {
  const client = createSupabaseAdminClient();
  let drained = false;
  return runRoomCleanup({
    pending: async () => {
      const { data, error } = await client.rpc(
        "pending_persistent_room_retirements",
        roomId ? { target_room: roomId } : {},
      );
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Invalid retirement response");
      return data.map((value) => {
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          typeof value.room_id !== "string" ||
          typeof value.purge !== "boolean"
        )
          throw new Error("Invalid retirement job");
        return { room_id: value.room_id, purge: value.purge };
      });
    },
    retire: async (id, purge) => {
      // Stop authority first, even if pending preference ingestion is unavailable.
      await retireLiveRoom(id, false);
      if (purge) {
        if (!drained) {
          await drainDurableRecommendationOutbox(200);
          drained = true;
        }
        await retireLiveRoom(id, true);
      }
    },
    finish: async (id, purge) => {
      const { data, error } = await client.rpc(
        "finish_persistent_room_retirement",
        { target_room: id, purge },
      );
      if (error) throw error;
      return data === true;
    },
  });
}
