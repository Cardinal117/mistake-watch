import { NextResponse, type NextRequest } from "next/server";

import { failMediaUpload, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      message?: unknown;
    };
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "Upload failed. You can retry before the recovery window expires.";

    return NextResponse.json(await failMediaUpload({ message, uploadId }));
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:fail]", error);

    return NextResponse.json(
      { error: "Upload failure could not be recorded." },
      { status: 500 },
    );
  }
}
