import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const appOrigin = getAppOrigin(request);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appOrigin}${nextPath}`);
    }

    console.error("Google sign-in callback failed", {
      message: error.message,
      name: error.name,
      status: error.status,
    });

    const detail =
      process.env.NODE_ENV === "development"
        ? ` Google sign-in error: ${error.message}`
        : "";

    return NextResponse.redirect(
      `${appOrigin}/?error=${encodeURIComponent(
        `Google sign-in could not be completed.${detail}`,
      )}`,
    );
  }

  return NextResponse.redirect(
    `${appOrigin}/?error=${encodeURIComponent(
      "Google sign-in could not be completed. Missing OAuth code.",
    )}`,
  );
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
