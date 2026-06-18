import { NextResponse, type NextRequest } from "next/server";

import {
  createMediaFolder,
  listMediaFolders,
  MediaAssetError,
} from "@/lib/media/assets";

export async function GET() {
  try {
    const folders = await listMediaFolders();

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("[media-folders:list]", error);

    return NextResponse.json(
      { error: "Media folders could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      folderType?: unknown;
      name?: unknown;
    };

    if (typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Folder name is required." },
        { status: 400 },
      );
    }

    const folder = await createMediaFolder({
      folderType:
        typeof body.folderType === "string" ? body.folderType : undefined,
      name: body.name,
    });

    return NextResponse.json({ folder });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-folders:create]", error);

    return NextResponse.json(
      { error: "Media folder could not be created." },
      { status: 500 },
    );
  }
}
