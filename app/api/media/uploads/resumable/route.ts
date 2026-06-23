import { NextResponse } from "next/server";

import {
  listResumableMediaUploads,
  MediaAssetError,
} from "@/lib/media/assets";

export async function GET() {
  try {
    return NextResponse.json(await listResumableMediaUploads());
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:resumable:list]", error);

    return NextResponse.json(
      { error: "Recoverable uploads could not be loaded." },
      { status: 500 },
    );
  }
}
