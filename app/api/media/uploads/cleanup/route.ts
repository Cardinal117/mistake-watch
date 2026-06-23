import { NextResponse, type NextRequest } from "next/server";

import {
  cleanupExpiredMultipartUploads,
  MediaAssetError,
} from "@/lib/media/assets";

function isAuthorizedCronRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await cleanupExpiredMultipartUploads());
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[media-upload:cleanup]", error);

    return NextResponse.json(
      { error: "Expired upload cleanup could not run." },
      { status: 500 },
    );
  }
}

export const POST = GET;
