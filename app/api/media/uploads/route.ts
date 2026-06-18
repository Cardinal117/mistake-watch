import { NextResponse, type NextRequest } from "next/server";

import { createMediaUpload, MediaAssetError } from "@/lib/media/assets";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      folderId?: unknown;
      folderName?: unknown;
      fileName?: unknown;
      fileSizeBytes?: unknown;
      mimeType?: unknown;
    };

    if (
      typeof body.fileName !== "string" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.mimeType !== "string"
    ) {
      return NextResponse.json(
        { error: "Upload request is missing file metadata." },
        { status: 400 },
      );
    }

    const upload = await createMediaUpload({
      folderId: typeof body.folderId === "string" ? body.folderId : null,
      folderName: typeof body.folderName === "string" ? body.folderName : null,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      mimeType: body.mimeType,
    });

    return NextResponse.json(upload);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:create]", error);

    return NextResponse.json(
      { error: "Upload could not be created." },
      { status: 500 },
    );
  }
}
