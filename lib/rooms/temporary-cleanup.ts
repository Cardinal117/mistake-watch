import "server-only";
import { drainDurableRecommendationOutbox } from "@/lib/recommendations/durable-outbox-drain";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { retireLiveRoom } from "./shared-live-revocation";
import { runRoomCleanup } from "./cleanup-core";

export async function cleanupTemporaryRooms() {
  const client = createSupabaseAdminClient();
  let drained = false;
  return runRoomCleanup({
    pending: async () => {
      const { data, error } = await client.rpc(
        "pending_temporary_room_cleanup",
      );
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Invalid cleanup response");
      return data.map((value) => {
        if (
          !value ||
          typeof value !== "object" ||
          Array.isArray(value) ||
          typeof value.room_id !== "string" ||
          typeof value.purge !== "boolean"
        )
          throw new Error("Invalid cleanup job");
        return { room_id: value.room_id, purge: value.purge };
      });
    },
    retire: async (roomId, purge) => {
      if (purge && !drained) {
        await drainDurableRecommendationOutbox(200);
        drained = true;
      }
      // Retirement independently refuses purge while explicit preferences remain.
      await retireLiveRoom(roomId, purge);
    },
    finish: async (roomId, purge) => {
      const { data, error } = await client.rpc(
        "finish_temporary_room_cleanup",
        { target_room: roomId, purge },
      );
      if (error) throw error;
      return data === true;
    },
  });
}
