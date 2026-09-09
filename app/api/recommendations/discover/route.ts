import { NextResponse } from "next/server";
import { readBoundedJson } from "@/lib/recommendations/bounded-json";
import {
  normalizeDiscoverMutation,
  normalizeDiscoverRoomId,
} from "@/lib/recommendations/discover-contracts";
import {
  getPersonalDiscover,
  recordPersonalDiscover,
} from "@/lib/recommendations/discover-service";
import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
function unavailable(reason: string, status: number) {
  return NextResponse.json(
    { status: "unavailable", reason },
    { headers, status },
  );
}

export async function GET(request: Request) {
  const roomId = normalizeDiscoverRoomId(
    new URL(request.url).searchParams.get("roomId"),
  );
  if (!roomId) return unavailable("Invalid Personal room.", 400);
  const auth = await requireRecommendationRoomAccess(
    roomId,
    "recommendation-read",
  );
  if (!auth.ok) return unavailable(auth.body.reason, auth.status);
  if (auth.access.roomKind !== "personal" || !auth.access.accountUserId)
    return unavailable("Personal Discover requires your Personal room.", 403);
  try {
    return NextResponse.json(await getPersonalDiscover(auth.access), {
      headers,
    });
  } catch {
    return unavailable(
      "Your listening history is temporarily unavailable.",
      503,
    );
  }
}

export async function POST(request: Request) {
  const body = await readBoundedJson(request, 4096);
  if (!body.ok)
    return unavailable(
      "Invalid Discover feedback request.",
      body.reason === "too-large" ? 413 : 400,
    );
  const input = normalizeDiscoverMutation(body.value);
  if (!input) return unavailable("Invalid Discover feedback request.", 400);
  const auth = await requireRecommendationRoomAccess(
    input.roomId,
    input.kind === "feedback" ? "preference-write" : "discover-observation",
  );
  if (!auth.ok) return unavailable(auth.body.reason, auth.status);
  if (auth.access.roomKind !== "personal" || !auth.access.accountUserId)
    return unavailable("Personal Discover requires your Personal room.", 403);
  try {
    const result = await recordPersonalDiscover(auth.access, input);
    return NextResponse.json(result.body, { headers, status: result.status });
  } catch {
    return unavailable(
      "Your feedback could not be saved. Please try again.",
      503,
    );
  }
}
