"use server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase";
import { resolveRoomMembership } from "./membership";

export type RoomDirection = {
  direction: string;
  exclusions: string;
  version: number;
};

export async function readRoomDirectionAction(
  roomId: string,
): Promise<(RoomDirection & { editable: boolean }) | null> {
  if (!(await resolveRoomMembership(roomId))) return null;
  const client = await createSupabaseServerClient();
  const [{ data, error }, { data: owned }] = await Promise.all([
    createSupabaseAdminClient().rpc("read_room_direction", {
      target_room: roomId,
    }),
    client.rpc("read_owned_room_direction", { target_room: roomId }),
  ]);
  if (error) throw new Error("Room direction could not be loaded.");
  return data ? { ...(data as RoomDirection), editable: Boolean(owned) } : null;
}

export async function createThemedRoomAction(
  name: string,
  direction: string,
  exclusions: string,
  requestId: string,
) {
  if (process.env.THEMED_ROOMS_ENABLED !== "true")
    return { error: "Themed rooms are not available yet." };
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("create_themed_room", {
    room_name: name,
    direction,
    exclusions,
    request_id: requestId,
  });
  return error
    ? {
        error:
          "Could not create the room. Check your account and the field lengths.",
      }
    : { roomId: data };
}

export async function readOwnedRoomDirectionAction(
  roomId: string,
): Promise<RoomDirection | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("read_owned_room_direction", {
    target_room: roomId,
  });
  if (error)
    throw new Error("Room direction could not be loaded. Please retry.");
  return data as RoomDirection | null;
}

export async function changeRoomDirectionAction(
  roomId: string,
  expectedVersion: number,
  direction: string,
  exclusions: string,
) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("change_room_direction", {
    target_room: roomId,
    expected_version: expectedVersion,
    direction,
    exclusions,
  });
  if (error)
    return {
      error:
        error.code === "PT409"
          ? "Direction changed on another device. Reload it before saving."
          : "Could not change direction. Only the active room owner can save valid changes.",
    };
  return { direction: data as RoomDirection };
}
