import { NextResponse } from "next/server";

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
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
    },
  });
}
