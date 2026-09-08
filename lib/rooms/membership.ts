import "server-only";

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
        .select("id")
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

    if (room && member) {
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

  if (!session || session.room.status !== "open") {
    return null;
  }

  return {
    authorizationKind: "guest",
    memberId: session.member.id,
    role: session.member.role === "host" ? "host" : "guest",
  };
}
