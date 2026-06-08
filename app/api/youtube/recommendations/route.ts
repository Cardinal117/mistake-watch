import { NextResponse } from "next/server";

import { requireRoomMemberRequestContext } from "@/lib/rooms/request-guards";
import {
  getYouTubeRecommendations,
  type YouTubeRecommendationKind,
} from "@/lib/youtube/recommendations";

const VALID_KINDS = new Set<YouTubeRecommendationKind>([
  "recommended",
]);

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
