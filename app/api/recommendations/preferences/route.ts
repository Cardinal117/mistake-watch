import { NextResponse } from "next/server";

import {
  listAuthorizedPreferences,
  updateAuthorizedPreference,
} from "@/lib/recommendations/preference-service";
import { normalizePreferenceMutation } from "@/lib/recommendations/preference-contracts";
import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";
import { readBoundedJson } from "@/lib/recommendations/bounded-json";

const MAX_PREFERENCE_REQUEST_BYTES = 16 * 1024;

type PreferenceRouteDependencies = {
  authorize: typeof requireRecommendationRoomAccess;
  listPreferences: typeof listAuthorizedPreferences;
  updatePreference: typeof updateAuthorizedPreference;
};

function createRecommendationPreferenceRoutes(
  dependencies: PreferenceRouteDependencies = {
    authorize: requireRecommendationRoomAccess,
    listPreferences: listAuthorizedPreferences,
    updatePreference: updateAuthorizedPreference,
  },
) {
  async function GET(request: Request) {
    const roomId = new URL(request.url).searchParams.get("roomId")?.trim();

    if (!roomId) {
      return unavailable("Missing room context.", 400);
    }

    const authorization = await dependencies.authorize(
      roomId,
      "preference-read",
    );

    if (!authorization.ok) {
      return NextResponse.json(authorization.body, {
        headers: privateHeaders(authorization.retryAfterSeconds),
        status: authorization.status,
      });
    }

    try {
      const items = await dependencies.listPreferences(authorization.access);
      return NextResponse.json(
        { items, source: "private", status: "available" },
        { headers: privateHeaders() },
      );
    } catch {
      return unavailable("Preferences are temporarily unavailable.", 503);
    }
  }

  async function PUT(request: Request) {
    const body = await readBoundedJson(request, MAX_PREFERENCE_REQUEST_BYTES);

    if (!body.ok && body.reason === "too-large") {
      return unavailable("Preference request is too large.", 413);
    }

    const input = normalizePreferenceMutation(body.ok ? body.value : null);

    if (!input) {
      return unavailable("Invalid preference request.", 400);
    }

    const authorization = await dependencies.authorize(
      input.roomId,
      "preference-write",
    );

    if (!authorization.ok) {
      return NextResponse.json(authorization.body, {
        headers: privateHeaders(authorization.retryAfterSeconds),
        status: authorization.status,
      });
    }

    try {
      const result = await dependencies.updatePreference({
        access: authorization.access,
        input,
      });

      return NextResponse.json(
        result.item
          ? { item: result.item, source: "private", status: "available" }
          : {
              reason: result.reason,
              source: "private",
              status: "unavailable",
            },
        { headers: privateHeaders(), status: result.status },
      );
    } catch {
      return unavailable("Preference could not be updated.", 503);
    }
  }

  return { GET, PUT };
}

export const { GET, PUT } = createRecommendationPreferenceRoutes();

function unavailable(reason: string, status: number) {
  return NextResponse.json(
    { items: [], reason, source: "private", status: "unavailable" },
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
