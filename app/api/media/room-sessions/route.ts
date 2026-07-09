import { NextResponse } from "next/server";

import {
  createUploadedRoomMediaSession,
  RoomMediaSessionError,
} from "@/lib/media/room-media-sessions";

type CreateRoomMediaSessionBody = {
  assetId?: unknown;
  roomId?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateRoomMediaSessionBody;

    if (typeof body.assetId !== "string" || !body.assetId.trim()) {
      return NextResponse.json(
        { error: "Uploaded media asset id is required." },
        { status: 400 },
      );
    }

    if (typeof body.roomId !== "string" || !body.roomId.trim()) {
      return NextResponse.json(
        { error: "Room id is required." },
        { status: 400 },
      );
    }

    const session = await createUploadedRoomMediaSession({
      assetId: body.assetId.trim(),
      roomId: body.roomId.trim(),
    });

    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof RoomMediaSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-room-sessions:create]", error);

    return NextResponse.json(
      { error: "Uploaded media session could not be created." },
      { status: 500 },
    );
  }
}
