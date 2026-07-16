import "server-only";

import { cookies } from "next/headers";

import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();

export type RoomMemberRequestContext =
  | {
      memberId: string;
      ok: true;
      roomId: string;
    }
  | {
      body: {
        reason: string;
        status: "unavailable";
      };
      ok: false;
      status: number;
    };

export async function requireRoomMemberRequestContext(
  request: Request,
  {
    limit,
    windowMs,
  }: {
    limit: number;
    windowMs: number;
  },
): Promise<RoomMemberRequestContext> {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId")?.trim();

  if (!roomId) {
    return {
      body: {
        reason: "Missing room context.",
        status: "unavailable",
      },
      ok: false,
      status: 400,
    };
  }

  const accountMemberId = await resolveAccountRoomMemberId(roomId);

  if (accountMemberId) {
    if (
      !consumeRateLimit({
        key: `${roomId}:${accountMemberId}`,
        limit,
        windowMs,
      })
    ) {
      return {
        body: {
          reason: "Too many provider requests for this room member.",
          status: "unavailable",
        },
        ok: false,
        status: 429,
      };
    }

    return {
      memberId: accountMemberId,
      ok: true,
      roomId,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (!token) {
    return {
      body: {
        reason: "Room membership is required.",
        status: "unavailable",
      },
      ok: false,
      status: 401,
    };
  }

  const session = await reclaimGuestMembership({ roomId, token });

  if (!session || session.room.status !== "open") {
    return {
      body: {
        reason: "Active room membership is required.",
        status: "unavailable",
      },
      ok: false,
      status: 403,
    };
  }

  if (
    !consumeRateLimit({
      key: `${roomId}:${session.member.id}`,
      limit,
      windowMs,
    })
  ) {
    return {
      body: {
        reason: "Too many provider requests for this room member.",
        status: "unavailable",
      },
      ok: false,
      status: 429,
    };
  }

  return {
    memberId: session.member.id,
    ok: true,
    roomId,
  };
}

async function resolveAccountRoomMemberId(roomId: string) {
  const serverClient = await createSupabaseServerClient();
  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const [{ data: room }, { data: member }] = await Promise.all([
    admin
      .from("rooms")
      .select("id")
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

  return room && member ? member.id : null;
}

function consumeRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = rateLimitEntries.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitEntries.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    pruneExpiredRateLimits(now);
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

function pruneExpiredRateLimits(now: number) {
  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) {
      rateLimitEntries.delete(key);
    }
  }
}
