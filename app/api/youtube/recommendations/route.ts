import { createSupabaseAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

import { requireRoomMemberRequestContext } from "@/lib/rooms/request-guards";
import {
  getYouTubeRecommendations,
  type YouTubeRecommendationKind,
} from "@/lib/youtube/recommendations";

const VALID_KINDS = new Set<YouTubeRecommendationKind>(["recommended"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as YouTubeRecommendationKind | null;
  const context = await requireRoomMemberRequestContext(request, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!context.ok) {
    return NextResponse.json(
      {
        items: [],
        reason: context.body.reason,
        source: "unavailable",
        status: context.body.status,
      },
      { status: context.status },
    );
  }

  if (!kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json(
      {
        items: [],
        reason: "Missing or invalid recommendation kind.",
        source: "unavailable",
        status: "unavailable",
      },
      { status: 400 },
    );
  }

  const { data: room, error } = await createSupabaseAdminClient()
    .from("rooms")
    .select("room_kind")
    .eq("id", context.roomId)
    .eq("status", "open")
    .maybeSingle();
  if (error || !room || room.room_kind === "themed" || room.room_kind === "temporary")
    return NextResponse.json(
      {
        items: [],
        reason:
          room?.room_kind === "temporary" ? "Automatic suggestions are not enabled for Temporary rooms." : "Theme-filtered recommendations are not available for this room.",
        source: "unavailable",
        status: "unavailable",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );

  const response = await getYouTubeRecommendations({
    kind,
    query: searchParams.get("query"),
  });

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
