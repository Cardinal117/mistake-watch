import { NextResponse, type NextRequest } from "next/server";

import { MediaAssetError, updateMediaFolderSort } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    folderId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { folderId } = await context.params;

  try {
    const body = (await request.json()) as {
      sortDirection?: unknown;
      sortKey?: unknown;
    };

    if (
      typeof body.sortKey !== "string" ||
      typeof body.sortDirection !== "string"
    ) {
      return NextResponse.json(
        { error: "Folder sort key and direction are required." },
        { status: 400 },
      );
    }

    const folder = await updateMediaFolderSort({
      folderId,
      sortDirection: body.sortDirection,
      sortKey: body.sortKey,
    });

    return NextResponse.json({ folder });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-folders:update-sort]", error);

    return NextResponse.json(
      { error: "Media folder sort could not be updated." },
      { status: 500 },
    );
  }
}
