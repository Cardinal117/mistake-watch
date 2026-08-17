import { NextResponse } from "next/server";

import { listAccountRooms } from "@/lib/account/room-data";
import { getAccountSummary } from "@/lib/account/server";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

export async function GET() {
  try {
    const account = await getAccountSummary();

    if (account.status !== "signed-in") {
      return NextResponse.json(
        { error: "Sign in to view account rooms." },
        { headers: privateHeaders, status: 401 },
      );
    }

    return NextResponse.json(
      { rooms: await listAccountRooms(account.id) },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Account rooms could not be loaded." },
      { headers: privateHeaders, status: 500 },
    );
  }
}
