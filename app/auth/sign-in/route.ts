import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

const GOOGLE_IDENTITY_SCOPES = "openid email profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const appOrigin = getAppOrigin(request);
  const supabase = await createSupabaseServerClient();
  const redirectTo = `${appOrigin}/auth/callback?next=${encodeURIComponent(
    nextPath,
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo,
      scopes: GOOGLE_IDENTITY_SCOPES,
    },
    provider: "google",
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      `${appOrigin}/?error=${encodeURIComponent(
        "Google sign-in is not available right now.",
      )}`,
    );
  }

  return NextResponse.redirect(data.url);
}

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath?.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

function getAppOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nodeEnv: string | undefined = process.env.NODE_ENV;

  if (nodeEnv === "development") {
    return requestUrl.origin;
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch {
      // Fall back to the request origin when the configured URL is malformed.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return requestUrl.origin;
}
