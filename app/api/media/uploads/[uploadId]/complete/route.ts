import { NextResponse, type NextRequest } from "next/server";

import { completeMediaUpload, MediaAssetError } from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientInspection?: unknown;
      durationSeconds?: unknown;
      folderId?: unknown;
      multipartParts?: unknown;
      title?: unknown;
    };
    const asset = await completeMediaUpload({
      durationSeconds:
        typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      clientInspection:
        body.clientInspection &&
        typeof body.clientInspection === "object" &&
        !Array.isArray(body.clientInspection)
          ? body.clientInspection
          : null,
      folderId: typeof body.folderId === "string" ? body.folderId : null,
      multipartParts: Array.isArray(body.multipartParts)
        ? body.multipartParts
            .map((part) => {
              if (
                part &&
                typeof part === "object" &&
                "etag" in part &&
                "partNumber" in part &&
                typeof part.etag === "string" &&
                typeof part.partNumber === "number"
              ) {
                return {
                  etag: part.etag,
                  partNumber: part.partNumber,
                };
              }

              return null;
            })
            .filter((part): part is { etag: string; partNumber: number } =>
              Boolean(part),
            )
        : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      uploadId,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:complete]", error);

    return NextResponse.json(
      { error: "Upload could not be completed." },
      { status: 500 },
    );
  }
}
