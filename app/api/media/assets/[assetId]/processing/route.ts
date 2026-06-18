import { NextResponse } from "next/server";

import {
  approveMediaAssetProcessing,
  getMediaAssetProcessingStatus,
  MediaAssetError,
} from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const status = await getMediaAssetProcessingStatus({ assetId });

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:processing]", error);

    return NextResponse.json(
      { error: "Media processing status could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  try {
    const asset = await approveMediaAssetProcessing({ assetId });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-assets:processing:approve]", error);

    return NextResponse.json(
      { error: "Media processing could not be started." },
      { status: 500 },
    );
  }
}
