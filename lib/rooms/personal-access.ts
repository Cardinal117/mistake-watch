import "server-only";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";

// For privileged server reads/writes that cannot rely on user-scoped RLS.
// Call only for Personal; existing Legacy access rules remain authoritative.
export async function isPersonalRoomOwner(room: {
  owner_user_id: string | null;
}) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (
    error ||
    !data.user ||
    data.user.is_anonymous !== false ||
    data.user.id !== room.owner_user_id
  )
    return false;
  const { data: profile, error: profileError } =
    await createSupabaseAdminClient()
      .from("profiles")
      .select("account_status")
      .eq("id", data.user.id)
      .maybeSingle();
  if (profileError) throw profileError;
  return profile?.account_status === "active";
}

export async function canAccessAccountRoom(room: {
  id: string;
  room_kind?: string;
  owner_user_id: string | null;
}) {
  if (room.room_kind === "personal") return isPersonalRoomOwner(room);
  if (room.room_kind === "temporary") {
    const client = await createSupabaseServerClient();
    const { data, error } = await client
      .from("rooms")
      .select("id")
      .eq("id", room.id)
      .eq("status", "open")
      .maybeSingle();
    return !error && Boolean(data);
  }
  if (room.room_kind !== "shared") return true;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("shared_room_context", {
    target_room: room.id,
  });
  return (
    !error &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.state === "approved"
  );
}
