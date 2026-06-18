import { NextResponse, type NextRequest } from "next/server";

import { MediaAssetError, moveMediaAssetToFolder } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const body = (await request.json()) as {
      folderId?: unknown;
    };
    const asset = await moveMediaAssetToFolder({
      assetId,
      folderId: typeof body.folderId === "string" ? body.folderId : null,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:move-folder]", error);

    return NextResponse.json(
      { error: "Media asset could not be moved." },
      { status: 500 },
    );
  }
}
