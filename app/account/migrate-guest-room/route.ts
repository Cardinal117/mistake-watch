import { NextResponse, type NextRequest } from "next/server";

import { migrateCurrentGuestRoomToAccount } from "@/lib/account/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const roomId = requestUrl.searchParams.get("roomId");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!roomId) {
    return NextResponse.redirect(
      `${requestUrl.origin}${nextPath}?error=${encodeURIComponent(
        "Missing room for account migration.",
      )}`,
    );
  }

  try {
    await migrateCurrentGuestRoomToAccount(roomId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Guest room could not be attached to this account.";

    return NextResponse.redirect(
      `${requestUrl.origin}${nextPath}?error=${encodeURIComponent(message)}`,
    );
  }

  return NextResponse.redirect(
    `${requestUrl.origin}${nextPath}?notice=${encodeURIComponent(
      "guest-room-attached",
    )}`,
  );
}

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
