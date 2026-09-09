import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function accessTemporaryRoom(input: {
  roomId: string;
  memberId: string;
  accountId?: string;
  guestHash?: string;
  touch?: boolean;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "access_temporary_room",
    {
      target_room: input.roomId,
      member_id: input.memberId,
      account_id: input.accountId ?? null,
      guest_hash: input.guestHash ?? null,
      touch_activity: input.touch ?? true,
    },
  );
  if (error) throw error;
  return data === true;
}

export async function hasTemporaryRoomEnded(roomId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomId,
    )
  )
    return false;
  const { data, error } = await createSupabaseAdminClient().rpc(
    "has_temporary_room_ended",
    { target_room: roomId },
  );
  if (error) throw error;
  return data === true;
}
