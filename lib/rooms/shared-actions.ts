"use server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase";
import { revokeLiveMembership } from "./shared-live-revocation";
export type SharedContext = {
  name: string;
  state: "invited" | "pending" | "approved" | "removed";
  owner: boolean;
  contribute: boolean;
  individual: boolean;
  members: Array<{
    userId: string;
    name: string;
    state: string;
    memberId: string | null;
    revocationPending: boolean;
  }>;
};
export async function sharedContextAction(
  roomId: string,
  invite = "",
): Promise<SharedContext | null> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomId,
    ) ||
    invite.length > 256
  )
    return null;
  const client = await createSupabaseServerClient();
  const { data: auth } = await client.auth.getUser();
  // Signed-out requests expose only a valid invite's minimal preview, never a room snapshot.
  const reader = auth.user ? client : createSupabaseAdminClient();
  const { data, error } = await reader.rpc("shared_room_context", {
    target_room: roomId,
    invite,
  });
  if (error) throw new Error("Shared room details could not be loaded.");
  return data as SharedContext | null;
}
export async function createSharedRoomAction(name: string, requestId: string) {
  if (process.env.SHARED_ROOMS_ENABLED !== "true")
    return { error: "Shared rooms are not available yet." };
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("create_shared_room", {
    room_name: name,
    request_id: requestId,
  });
  return error
    ? {
        error:
          "Shared room could not be created. Check your account and room name.",
      }
    : { roomId: data };
}
export async function requestSharedMembershipAction(
  roomId: string,
  invite: string,
) {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("request_shared_membership", {
    target_room: roomId,
    invite,
  });
  return error
    ? { error: "A valid invite and active signed-in account are required." }
    : { ok: true };
}
export async function decideSharedMembershipAction(
  roomId: string,
  userId: string,
  approve: boolean,
) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("decide_shared_membership", {
    target_room: roomId,
    target_user: userId,
    approve,
  });
  if (error)
    return {
      error:
        "Membership could not be changed. Only the owner can approve or remove members. Retry any pending live removal first.",
    };
  if (!approve && data) return finishSharedRevocation(roomId, data);

  return { ok: true };
}
export async function removeSharedMemberAction(
  roomId: string,
  memberId: string,
) {
  const context = await sharedContextAction(roomId);
  const target = context?.owner
    ? context.members.find((m) => m.memberId === memberId)
    : null;
  if (!target)
    return { error: "Only the room owner can remove this membership." };
  return decideSharedMembershipAction(roomId, target.userId, false);
}
export async function saveSharedConsentAction(
  roomId: string,
  contribute: boolean,
  individual: boolean,
) {
  const client = await createSupabaseServerClient();
  const { error } = await client.rpc("set_room_learning_consent", {
    target_room: roomId,
    allow_contribution: contribute,
    allow_individual: individual,
  });
  return error
    ? {
        error:
          "Your learning choices could not be saved. Approved membership is required.",
      }
    : { ok: true };
}

export async function leaveSharedRoomAction(roomId: string) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc("leave_shared_room", {
    target_room: roomId,
  });
  if (error)
    return {
      error:
        "Shared membership could not be withdrawn. An active non-owner membership is required.",
    };
  return data ? finishSharedRevocation(roomId, data) : { ok: true };
}

async function finishSharedRevocation(roomId: string, memberId: string) {
  try {
    await revokeLiveMembership(roomId, memberId);
    const { error } = await createSupabaseAdminClient().rpc(
      "ack_shared_revocation",
      { target_room: roomId, target_member: memberId },
    );
    if (error) throw error;
    return { ok: true };
  } catch {
    return {
      error:
        "Return access is revoked. Live removal still needs a retry; the member may remain connected until it succeeds. Retry this action or ask the owner to retry removal.",
    };
  }
}
