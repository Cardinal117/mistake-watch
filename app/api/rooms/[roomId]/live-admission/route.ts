import { NextResponse } from "next/server";

import {
  createLiveRoomAdmission,
  LiveAdmissionError,
} from "@/lib/rooms/live-admission";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { roomId } = await context.params;
    const payload = (await request.json()) as { identityHex?: unknown };

    if (typeof payload.identityHex !== "string") {
      return NextResponse.json(
        { error: "Live connection identity is required." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await createLiveRoomAdmission({
        identityHex: payload.identityHex,
        roomId,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LiveAdmissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[live-room-admission]", error);
    return NextResponse.json(
      { error: "Live room admission could not be created." },
      { status: 500 },
    );
  }
}
