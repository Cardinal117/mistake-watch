import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type {
  CreatedGuestRoom,
  CreateGuestHostedRoomInput,
} from "./guest-room";
import {
  createGuestTokenBundle,
  createInviteCode,
  createOpaqueToken,
  hashInviteToken,
  normalizeDisplayName,
} from "./guest-token";

export async function createTemporaryRoom(
  input: CreateGuestHostedRoomInput,
): Promise<CreatedGuestRoom> {
  if (process.env.TEMPORARY_ROOMS_ENABLED !== "true")
    throw new Error("Temporary rooms are not available yet.");
  const roomId = randomUUID();
  const bundle = createGuestTokenBundle(roomId);
  const inviteToken = createOpaqueToken();
  const { data, error } = await createSupabaseAdminClient().rpc(
    "create_temporary_room",
    {
      target_room: roomId,
      room_name: input.roomName.trim(),
      display_name: normalizeDisplayName(input.displayName),
      room_mode: input.mode ?? "watch",
      invite_code: createInviteCode(),
      invite_hash: hashInviteToken(inviteToken),
      guest_hash: bundle.tokenHash,
    },
  );
  if (error || !data)
    throw new Error(
      "Could not create Temporary room. Check the names and retry.",
    );
  const session = data as unknown as Pick<
    CreatedGuestRoom,
    "room" | "guestIdentity" | "member"
  >;
  return {
    ...session,
    inviteCode: session.room.invite_code,
    inviteToken,
    token: bundle.token,
    tokenCookieName: bundle.cookieName,
  };
}
