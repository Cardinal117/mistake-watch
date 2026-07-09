import { NextResponse } from "next/server";

import { createPresignedR2GetUrl } from "@/lib/media/r2";
import {
  getRoomMediaPlaybackAccess,
  RoomMediaSessionError,
} from "@/lib/media/room-media-sessions";

const playbackUrlExpiresSeconds = 30 * 60;

type PlaybackRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(request: Request, context: PlaybackRouteContext) {
  try {
    const { sessionId } = await context.params;
    const roomId = new URL(request.url).searchParams.get("roomId")?.trim();

    if (!roomId) {
      return NextResponse.json({ error: "Room id is required." }, { status: 400 });
    }

    const access = await getRoomMediaPlaybackAccess({
      roomId,
      sessionId,
    });

    if (!access.decision.allowed || !access.session || !access.asset) {
      return NextResponse.json(
        { error: "No permission to play uploaded media in this room." },
        { status: 403 },
      );
    }

    const objectKey =
      access.asset.processed_object_key ?? access.asset.r2_object_key;

    if (!objectKey) {
      return NextResponse.json(
        { error: "Uploaded media object is not available." },
        { status: 404 },
      );
    }

    const playbackUrl = createPresignedR2GetUrl({
      expiresSeconds: playbackUrlExpiresSeconds,
      objectKey,
    });

    return NextResponse.json({
      expiresInSeconds: playbackUrlExpiresSeconds,
      playbackUrl,
      session: {
        assetId: access.session.media_asset_id,
        expiresAt: access.session.expires_at,
        id: access.session.id,
        roomId: access.session.room_id,
        status: access.session.status,
      },
    });
  } catch (error) {
    if (error instanceof RoomMediaSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-room-sessions:playback]", error);

    return NextResponse.json(
      { error: "Uploaded media playback URL could not be created." },
      { status: 500 },
    );
  }
}
