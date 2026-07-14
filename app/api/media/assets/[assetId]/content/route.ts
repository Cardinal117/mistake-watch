import { NextResponse } from "next/server";

import { getCatalogueAssetDelivery, MediaAssetError } from "@/lib/media/assets";
import { createPresignedR2GetUrl } from "@/lib/media/r2";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const delivery = await getCatalogueAssetDelivery({
      assetId,
      kind: "content",
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
    if (error instanceof MediaAssetError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[media-assets:content]", error);
    return NextResponse.json(
      { error: "Media content could not be loaded." },
      { status: 500 },
    );
  }
}
