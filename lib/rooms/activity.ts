import "server-only";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";

import { touchAccountRoomActivity } from "./activity-core";

export async function touchSignedInRoomActivity(roomId: string) {
  const serverClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  return touchAccountRoomActivity(roomId, {
    findMember: async (targetRoomId, userId) => {
      const { data, error } = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", targetRoomId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    findOpenRoom: async (targetRoomId) => {
      const { data, error } = await admin
        .from("rooms")
        .select("id, is_saved")
        .eq("id", targetRoomId)
        .eq("status", "open")
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data
        ? {
            id: data.id,
            isSaved: data.is_saved,
          }
        : null;
    },
    getActiveAuthenticatedUserId: async () => {
      const { data, error } = await serverClient.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("account_status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      return profile?.account_status === "active" ? data.user.id : null;
    },
    now: () => new Date(),
    updateMemberLastSeen: async ({
      memberId,
      roomId: targetRoomId,
      seenAt,
      userId,
    }) => {
      const { error } = await admin
        .from("room_members")
        .update({ last_seen_at: seenAt })
        .eq("id", memberId)
        .eq("room_id", targetRoomId)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },
    updateRoomActivity: async ({
      idleDeadlineAt,
      roomId: targetRoomId,
      seenAt,
    }) => {
      const { error } = await admin
        .from("rooms")
        .update({
          idle_deadline_at: idleDeadlineAt,
          last_active_at: seenAt,
        })
        .eq("id", targetRoomId)
        .eq("status", "open");

      if (error) {
        throw error;
      }
    },
  });
}
