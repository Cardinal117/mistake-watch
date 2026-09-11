import { after, NextResponse } from "next/server";
import { requireRecommendationRoomAccess } from "@/lib/recommendations/room-authorization";
import { readAccountListeningCounts } from "@/lib/recommendations/listener-receipts-service";
import { deliverRecommendationEventsInBackground } from "@/lib/recommendations/durable-outbox-drain";

export const maxDuration = 60;
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};
export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get("roomId")?.trim();
  const sources = [...new Set(url.searchParams.getAll("sourceId"))];
  if (
    !roomId ||
    roomId.length > 100 ||
    request.url.length > 16000 ||
    sources.length > 200 ||
    sources.some(
      (id) =>
        !/^(?:[a-f0-9]{64}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(
          id,
        ),
    )
  ) {
    return NextResponse.json(
      { status: "unavailable", reason: "Invalid listening count request." },
      { status: 400, headers },
    );
  }
  try {
    const authorization = await requireRecommendationRoomAccess(
      roomId,
      "preference-read",
    );
    if (!authorization.ok)
      return NextResponse.json(authorization.body, {
        status: authorization.status,
        headers,
      });
    if (
      authorization.access.kind !== "account" ||
      !authorization.access.accountUserId
    )
      return NextResponse.json(
        {
          status: "unavailable",
          reason: "An authenticated account is required.",
        },
        { status: 403, headers },
      );
    const counts = await readAccountListeningCounts(
      authorization.access.accountUserId,
      sources.length ? sources : undefined,
    );
    after(deliverRecommendationEventsInBackground);
    return NextResponse.json({ status: "available", ...counts }, { headers });
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        reason: "Account listening counts are temporarily unavailable.",
      },
      { status: 503, headers },
    );
  }
}
