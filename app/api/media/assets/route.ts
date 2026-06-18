import { NextResponse } from "next/server";

import { listReadyMediaAssets } from "@/lib/media/assets";

export async function GET() {
  try {
    const library = await listReadyMediaAssets();

    return NextResponse.json(library);
  } catch (error) {
    console.error("[media-assets:list]", error);

    return NextResponse.json(
      { error: "Media assets could not be loaded." },
      { status: 500 },
    );
  }
}
