import { NextResponse, type NextRequest } from "next/server";

import { findReadyMediaMatches } from "@/lib/media/assets";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sources?: Array<{
        sourceId?: unknown;
        sourceType?: unknown;
      }>;
    };
    const sources =
      body.sources
        ?.map((source) => ({
          sourceId: typeof source.sourceId === "string" ? source.sourceId : "",
          sourceType: source.sourceType,
        }))
        .filter(
          (
            source,
          ): source is {
            sourceId: string;
            sourceType: "direct" | "hls" | "youtube";
          } =>
            Boolean(source.sourceId) &&
            (source.sourceType === "direct" ||
              source.sourceType === "hls" ||
              source.sourceType === "youtube"),
        ) ?? [];

    const assets = await findReadyMediaMatches(sources);

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("[media-source-matches:list]", error);

    return NextResponse.json(
      { error: "Media source matches could not be loaded." },
      { status: 500 },
    );
  }
}
