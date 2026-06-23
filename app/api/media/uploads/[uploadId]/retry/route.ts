import { NextResponse } from "next/server";

import { MediaAssetError, resumeMediaUpload } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    return NextResponse.json(await resumeMediaUpload({ uploadId }));
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:retry]", error);

    return NextResponse.json(
      { error: "Upload could not be resumed." },
      { status: 500 },
    );
  }
}
