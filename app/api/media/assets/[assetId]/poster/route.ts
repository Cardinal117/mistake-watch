import { NextResponse, type NextRequest } from "next/server";

import { completeMediaPoster, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const body = (await request.json()) as {
      objectKey?: unknown;
    };

    if (typeof body.objectKey !== "string") {
      return NextResponse.json(
        { error: "Poster object key is required." },
        { status: 400 },
      );
    }

    const asset = await completeMediaPoster({
      assetId,
      objectKey: body.objectKey,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:poster-complete]", error);

    return NextResponse.json(
      { error: "Poster could not be saved." },
      { status: 500 },
    );
  }
}
