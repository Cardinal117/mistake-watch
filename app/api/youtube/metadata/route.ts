import { NextResponse } from "next/server";

import { getYouTubeMetadata } from "@/lib/youtube/metadata";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("videoId") ?? searchParams.get("url");

  if (!input) {
    return NextResponse.json(
      {
        metadata: null,
        reason: "Missing YouTube video id or URL.",
        status: "unavailable",
      },
      { status: 400 },
    );
  }

  const response = await getYouTubeMetadata(input);

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
