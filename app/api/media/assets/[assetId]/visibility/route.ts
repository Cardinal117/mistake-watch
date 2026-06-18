import { NextResponse, type NextRequest } from "next/server";

import { MediaAssetError, updateMediaAssetVisibility } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const body = (await request.json()) as {
      visibility?: unknown;
    };

    if (typeof body.visibility !== "string") {
      return NextResponse.json(
        { error: "Media visibility is required." },
        { status: 400 },
      );
    }

    const asset = await updateMediaAssetVisibility({
      assetId,
      visibility: body.visibility,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:update-visibility]", error);

    return NextResponse.json(
      { error: "Media asset visibility could not be updated." },
      { status: 500 },
    );
  }
}
