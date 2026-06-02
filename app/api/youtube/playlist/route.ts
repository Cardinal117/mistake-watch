import { NextResponse } from "next/server";

import { getYouTubePlaylistPreview } from "@/lib/youtube/playlist";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("url") ?? searchParams.get("playlistId");

  if (!input) {
    return NextResponse.json(
      {
        items: [],
        playlistId: null,
        playlistTitle: null,
        reason: "Missing YouTube playlist URL.",
        skippedUnavailable: 0,
        status: "unavailable",
        totalCount: 0,
      },
      { status: 400 },
    );
  }

  const response = await getYouTubePlaylistPreview(input);

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=3600",
    },
  });
}
