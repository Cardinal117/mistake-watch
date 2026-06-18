import { NextResponse } from "next/server";

import { createMediaPosterUpload, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const poster = await createMediaPosterUpload({ assetId });

    return NextResponse.json(poster);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:poster-upload]", error);

    return NextResponse.json(
      { error: "Poster upload could not be created." },
      { status: 500 },
    );
  }
}
