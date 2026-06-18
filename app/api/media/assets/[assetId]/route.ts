import { NextResponse } from "next/server";

import { deleteMediaAsset, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    await deleteMediaAsset({ assetId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:delete]", error);

    return NextResponse.json(
      { error: "Media asset could not be deleted." },
      { status: 500 },
    );
  }
}
