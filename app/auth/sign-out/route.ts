import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}${nextPath}`);
}

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
