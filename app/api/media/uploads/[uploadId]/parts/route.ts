import { NextResponse, type NextRequest } from "next/server";

import {
  createMediaUploadPartUrls,
  MediaAssetError,
  recordMediaUploadParts,
} from "@/lib/media/assets";

type RouteContext = {
  params: Promise<{
    uploadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    const body = (await request.json()) as {
      partNumbers?: unknown;
    };

    if (!Array.isArray(body.partNumbers)) {
      return NextResponse.json(
        { error: "Upload parts request is missing part numbers." },
        { status: 400 },
      );
    }

    const payload = await createMediaUploadPartUrls({
      partNumbers: body.partNumbers.filter(
        (partNumber): partNumber is number => typeof partNumber === "number",
      ),
      uploadId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:parts:create]", error);

    return NextResponse.json(
      { error: "Upload parts could not be created." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { uploadId } = await context.params;

  try {
    const body = (await request.json()) as {
      parts?: unknown;
    };

    if (!Array.isArray(body.parts)) {
      return NextResponse.json(
        { error: "Upload progress request is missing completed parts." },
        { status: 400 },
      );
    }

    const payload = await recordMediaUploadParts({
      parts: body.parts
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
        ),
      uploadId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:parts:record]", error);

    return NextResponse.json(
      { error: "Upload progress could not be recorded." },
      { status: 500 },
    );
  }
}
