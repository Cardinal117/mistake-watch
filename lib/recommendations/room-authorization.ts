import "server-only";

import { cookies } from "next/headers";

import { getAccountSummary } from "@/lib/account/server";
import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import { getUploadedCatalogueAccess } from "@/lib/media/uploaded-catalogue-access";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";
import { BoundedTtlCache } from "./bounded-cache";
import {
  consumeFixedWindowRequest,
  recommendationRequestLimits,
  type RecommendationRequestKind,
  type RequestBudgetState,
} from "./request-budget";

const REQUEST_WINDOW_MS = 60_000;
const requestCounts = new BoundedTtlCache<RequestBudgetState>(
  REQUEST_WINDOW_MS,
  5_000,
);

export type RecommendationRoomAccess = {
  accountUserId: string | null;
  catalogueScope: "allowlisted" | "none" | "owner";
  identityKey: string;
  kind: "account" | "guest";
  memberId: string;
  roomId: string;
};

export type RecommendationRoomAccessResult =
  | { access: RecommendationRoomAccess; ok: true }
  | {
      body: { reason: string; status: "unavailable" };
      ok: false;
      retryAfterSeconds?: number;
      status: number;
    };

export async function requireRecommendationRoomAccess(
  roomId: string,
  requestKind: RecommendationRequestKind,
): Promise<RecommendationRoomAccessResult> {
  const accountAccess = await resolveAccountAccess(roomId);
  const access = accountAccess ?? (await resolveGuestAccess(roomId));

  if (!access) {
    return denied(
      403,
      "Active room membership is required for recommendations.",
    );
  }

  const budget = consumeRequest(access.identityKey, requestKind);

  if (!budget.allowed) {
    return denied(
      429,
      "Too many recommendation requests for this room member.",
      budget.retryAfterSeconds,
    );
  }

  return { access, ok: true };
}

async function resolveAccountAccess(
  roomId: string,
): Promise<RecommendationRoomAccess | null> {
  const serverClient = await createSupabaseServerClient();
  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const [{ data: room }, { data: member }] = await Promise.all([
    admin
      .from("rooms")
      .select("id,status")
      .eq("id", roomId)
      .eq("status", "open")
      .maybeSingle(),
    admin
      .from("room_members")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", data.user.id)
      .maybeSingle(),
  ]);

  if (!room || !member) {
    return null;
  }

  const account = await getAccountSummary();

  if (account.status !== "signed-in" || account.id !== data.user.id) {
    return null;
  }

  const catalogue = await getUploadedCatalogueAccess(account);

  return {
    accountUserId: data.user.id,
    catalogueScope: catalogue.allowed ? catalogue.scope : "none",
    identityKey: `account:${roomId}:${data.user.id}`,
    kind: "account",
    memberId: member.id,
    roomId,
  };
}

async function resolveGuestAccess(
  roomId: string,
): Promise<RecommendationRoomAccess | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (!token) {
    return null;
  }

  const session = await reclaimGuestMembership({ roomId, token });

  if (!session || session.room.status !== "open") {
    return null;
  }

  return {
    accountUserId: null,
    catalogueScope: "none",
    identityKey: `guest:${roomId}:${session.member.id}`,
    kind: "guest",
    memberId: session.member.id,
    roomId,
  };
}

function consumeRequest(
  identityKey: string,
  requestKind: RecommendationRequestKind,
) {
  const key = `${requestKind}:${identityKey}`;
  const result = consumeFixedWindowRequest({
    current: requestCounts.get(key).value,
    limit: recommendationRequestLimits[requestKind],
    now: Date.now(),
    windowMs: REQUEST_WINDOW_MS,
  });

  requestCounts.set(key, result.state, result.ttlMs);
  return result;
}

function denied(
  status: number,
  reason: string,
  retryAfterSeconds?: number,
): RecommendationRoomAccessResult {
  return {
    body: { reason, status: "unavailable" },
    ok: false,
    retryAfterSeconds,
    status,
  };
}
