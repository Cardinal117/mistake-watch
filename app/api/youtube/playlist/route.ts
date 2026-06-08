import { NextResponse } from "next/server";

import { requireRoomMemberRequestContext } from "@/lib/rooms/request-guards";
import { getYouTubePlaylistPreview } from "@/lib/youtube/playlist";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("url") ?? searchParams.get("playlistId");
  const context = await requireRoomMemberRequestContext(request, {
    limit: 12,
    windowMs: 60_000,
  });

  if (!context.ok) {
    return NextResponse.json(
      {
        items: [],
        playlistId: null,
        playlistTitle: null,
        reason: context.body.reason,
        skippedUnavailable: 0,
        status: context.body.status,
        totalCount: 0,
      },
      { status: context.status },
    );
  }

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

  if (input.length > 2048) {
    return NextResponse.json(
      {
        items: [],
        playlistId: null,
        playlistTitle: null,
        reason: "Playlist URL is too long.",
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
      "Cache-Control": "private, no-store",
    },
  });
}
