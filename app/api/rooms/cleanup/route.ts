import { NextResponse, type NextRequest } from "next/server";
import { cleanupPersistentRooms } from "@/lib/rooms/persistent-retirement";
import { cleanupTemporaryRooms } from "@/lib/rooms/temporary-cleanup";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const results = await Promise.allSettled([
      cleanupTemporaryRooms(),
      cleanupPersistentRooms(),
    ]);
    const completed = results.reduce(
      (sum, result) =>
        sum + (result.status === "fulfilled" ? result.value.completed : 0),
      0,
    );
    const failed = results.reduce(
      (sum, result) =>
        sum + (result.status === "fulfilled" ? result.value.failed : 1),
      0,
    );
    return NextResponse.json(
      { completed, failed },
      { status: failed ? 503 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Room cleanup unavailable" },
      { status: 503 },
    );
  }
}
export const GET = POST;
