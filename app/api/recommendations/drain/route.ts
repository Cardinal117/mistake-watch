import { NextResponse, type NextRequest } from "next/server";

import { drainDurableRecommendationOutbox } from "@/lib/recommendations/durable-outbox-drain";

function isAuthorizedDrainRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedDrainRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await drainDurableRecommendationOutbox());
  } catch (error) {
    console.error("[recommendations:drain]", error);
    return NextResponse.json(
      { error: "Recommendation event drain could not run." },
      { status: 500 },
    );
  }
}

export const GET = POST;
