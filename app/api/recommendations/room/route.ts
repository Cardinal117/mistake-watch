import { NextResponse } from "next/server";

import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";
import { readBoundedJson } from "@/lib/recommendations/bounded-json";
import { normalizeRoomRecommendationRequest } from "@/lib/recommendations/room-contracts";
import { getRoomRecommendations } from "@/lib/recommendations/room-service";

const MAX_REQUEST_BYTES = 128 * 1024;

type RoomRouteDependencies = {
  authorize: typeof requireRecommendationRoomAccess;
  getRecommendations: typeof getRoomRecommendations;
};

function createRoomRecommendationRoute(
  dependencies: RoomRouteDependencies = {
    authorize: requireRecommendationRoomAccess,
    getRecommendations: getRoomRecommendations,
  },
) {
  return async function roomRecommendationRoute(request: Request) {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES);

    if (!body.ok && body.reason === "too-large") {
      return unavailable("Recommendation request is too large.", 413);
    }

    const input = normalizeRoomRecommendationRequest(
      body.ok ? body.value : null,
    );

    if (!input) {
      return unavailable("Invalid recommendation request.", 400);
    }

    const authorization = await dependencies.authorize(
      input.roomId,
      "recommendation-read",
    );

    if (!authorization.ok) {
      return NextResponse.json(authorization.body, {
        headers: privateHeaders(authorization.retryAfterSeconds),
        status: authorization.status,
      });
    }

    try {
      const response = await dependencies.getRecommendations({
        access: authorization.access,
        request: input,
      });

      return NextResponse.json(response, { headers: privateHeaders() });
    } catch {
      return unavailable("Recommendations are temporarily unavailable.", 503);
    }
  };
}

export const POST = createRoomRecommendationRoute();

function unavailable(reason: string, status: number) {
  return NextResponse.json(
    { items: [], reason, source: "fallback", status: "unavailable" },
    { headers: privateHeaders(), status },
  );
}

function privateHeaders(retryAfterSeconds?: number) {
  return {
    "Cache-Control": "private, no-store",
    ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    "X-Content-Type-Options": "nosniff",
  };
}
