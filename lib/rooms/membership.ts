import "server-only";
import { accessTemporaryRoom } from "./temporary";

import { cookies } from "next/headers";
import { getAccountSummary } from "@/lib/account/server";
import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type AdmissionMember = {
  authorizationKind: "account" | "guest";
  memberId: string;
  role: "host" | "guest";
};

// Page snapshots and live grants must agree even with a leftover guest cookie.
export async function resolveRoomMembership(
  roomId: string,
): Promise<AdmissionMember | null> {
  const account = await getAccountSummary();

  if (account.status === "signed-in") {
    if (account.accountStatus !== "active") {
      return null;
    }

    const admin = createSupabaseAdminClient();
    const [
      { data: room, error: roomError },
      { data: member, error: memberError },
    ] = await Promise.all([
      admin
        .from("rooms")
        .select("id, room_kind, owner_user_id")
        .eq("id", roomId)
        .eq("status", "open")
        .maybeSingle(),
      admin
        .from("room_members")
        .select("id, role")
        .eq("room_id", roomId)
        .eq("user_id", account.id)
        .maybeSingle(),
    ]);

    if (roomError || memberError) {
      throw roomError ?? memberError;
    }

    if (
      room?.room_kind === "personal" &&
      (room.owner_user_id !== account.id ||
        account.isAnonymous !== false ||
        !member)
    ) {
      return null;
    }
    if (
      room &&
      room.room_kind !== undefined &&
      room.room_kind !== "legacy" &&
      room.room_kind !== "personal" &&
      room.room_kind !== "shared" &&
      room.room_kind !== "themed" &&
      room.room_kind !== "temporary"
    )
      return null;

    if (
      room?.room_kind === "shared" &&
      (account.isAnonymous !== false || !member)
    )
      return null;
    if (room && member) {
      if (
        room.room_kind === "temporary" &&
        !(await accessTemporaryRoom({
          roomId,
          memberId: member.id,
          accountId: account.id,
        }))
      )
        return null;
      return {
        authorizationKind: "account",
        memberId: member.id,
        role: member.role === "host" ? "host" : "guest",
      };
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;
  const session = token
    ? await reclaimGuestMembership({ roomId, token })
    : null;

  if (
    !session ||
    session.room.status !== "open" ||
    (session.room.room_kind !== undefined &&
      session.room.room_kind !== "legacy" &&
      session.room.room_kind !== "themed" &&
      session.room.room_kind !== "temporary")
  ) {
    return null;
  }

  return {
    authorizationKind: "guest",
    memberId: session.member.id,
    role: session.member.role === "host" ? "host" : "guest",
  };
}
