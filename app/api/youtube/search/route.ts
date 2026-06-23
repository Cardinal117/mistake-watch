import { NextResponse } from "next/server";

import { requireRoomMemberRequestContext } from "@/lib/rooms/request-guards";
import { searchYouTubeVideos } from "@/lib/youtube/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const context = await requireRoomMemberRequestContext(request, {
    limit: 15,
    windowMs: 60_000,
  });

  if (!context.ok) {
    return NextResponse.json(
      {
        items: [],
        nextPageToken: null,
        quotaCostEstimate: 0,
        reason: context.body.reason,
        status: context.body.status,
      },
      { status: context.status },
    );
  }

  const type = searchParams.get("type") ?? "video";

  if (type !== "video") {
    return NextResponse.json(
      {
        items: [],
        nextPageToken: null,
        quotaCostEstimate: 0,
        reason: "Only YouTube video search is supported right now.",
        status: "unavailable",
      },
      { status: 400 },
    );
  }

  const query = searchParams.get("q") ?? "";
  const response = await searchYouTubeVideos({
    pageToken: searchParams.get("pageToken"),
    query,
  });

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, max-age=0, s-maxage=600",
    },
  });
}
