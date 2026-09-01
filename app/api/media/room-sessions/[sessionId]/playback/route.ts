import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { createMediaGatewayBootstrap } from "@/lib/media/range-gateway";
import { getMediaGatewayConfig } from "@/lib/media/range-gateway-config";
import {
  getRoomMediaPlaybackAccess,
  RoomMediaSessionError,
} from "@/lib/media/room-media-sessions";

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
      return NextResponse.json(
        { error: "Room id is required." },
        { status: 400 },
      );
    }

    const access = await getRoomMediaPlaybackAccess({
      roomId,
      sessionId,
    });

    if (
      !access.decision.allowed ||
      !access.session ||
      !access.asset ||
      !access.participant
    ) {
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

    const config = getMediaGatewayConfig();
    const expiresAt = new Date(access.session.expires_at);
    const bootstrap = createMediaGatewayBootstrap({
      cookieDomain: config.cookieDomain,
      expiresAt,
      gatewayOrigin: config.gatewayOrigin,
      memberId: access.participant.memberId,
      roomId: access.session.room_id,
      sessionId: access.session.id,
      signingSecret: config.signingSecret,
      tokenId: randomBytes(18).toString("base64url"),
    });
    const expiresInSeconds = Math.max(
      0,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    const response = NextResponse.json({
      expiresInSeconds,
      playbackUrl: bootstrap.playbackUrl,
      session: {
        assetId: access.session.media_asset_id,
        expiresAt: access.session.expires_at,
        id: access.session.id,
        roomId: access.session.room_id,
        status: access.session.status,
      },
      transport: "range-gateway",
    });

    response.cookies.set(bootstrap.cookie);

    return response;
  } catch (error) {
    if (error instanceof RoomMediaSessionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[media-room-sessions:playback]", error);

    return NextResponse.json(
      { error: "Uploaded media playback URL could not be created." },
      { status: 500 },
    );
  }
}
