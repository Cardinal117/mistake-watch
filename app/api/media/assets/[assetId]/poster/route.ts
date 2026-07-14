import { NextResponse } from "next/server";

import {
  completeMediaPoster,
  getCatalogueAssetDelivery,
  MediaAssetError,
} from "@/lib/media/assets";
import { createPresignedR2GetUrl } from "@/lib/media/r2";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const delivery = await getCatalogueAssetDelivery({
      assetId,
      kind: "poster",
    });

    return new NextResponse(null, {
      headers: {
        "Cache-Control": "private, no-store",
        Location: createPresignedR2GetUrl({
          expiresSeconds: 5 * 60,
          objectKey: delivery.objectKey,
        }),
        "Referrer-Policy": "no-referrer",
      },
      status: 307,
    });
  } catch (error) {
    return handleMediaAssetError(error, "Poster could not be loaded.");
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const asset = await completeMediaPoster({ assetId });

    return NextResponse.json({ asset });
  } catch (error) {
    return handleMediaAssetError(error, "Poster could not be saved.");
  }
}

function handleMediaAssetError(error: unknown, fallback: string) {
  if (error instanceof MediaAssetError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("[media-assets:poster]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
