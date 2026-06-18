import { NextResponse } from "next/server";

import { abortMediaUpload, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    const payload = await abortMediaUpload({ uploadId });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:abort]", error);

    return NextResponse.json(
      { error: "Upload could not be aborted." },
      { status: 500 },
    );
  }
}
