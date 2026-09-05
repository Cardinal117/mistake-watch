type R2Range = {
  length?: number;
  offset?: number;
  suffix?: number;
};

type R2ObjectBodyLike = {
  body: BodyInit;
  httpEtag?: string;
  range?: {
    length: number;
    offset: number;
  };
  size: number;
  writeHttpMetadata(headers: Headers): void;
};

type R2BucketLike = {
  get(
    key: string,
    options?: { range?: R2Range },
  ): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<{ size: number } | null>;
};

export type UploadedMediaGatewayEnv = {
  AUTHORIZATION_ORIGIN: string;
  MEDIA_BUCKET: R2BucketLike;
  MEDIA_GATEWAY_ORIGIN_SECRET: string;
};

type GatewayDependencies = {
  fetch: typeof fetch;
  reportAuthorizationFailure?: (
    diagnostic: AuthorizationFailureDiagnostic,
  ) => void;
};

type AuthorizationFailureDiagnostic =
  | {
      kind: AuthorizationFetchExceptionKind;
      originHealth: AuthorizationOriginHealthDiagnostic;
      reason: "fetch_exception";
    }
  | { reason: "upstream_status"; status: number }
  | { reason: "malformed_success"; status: number };

type AuthorizationOriginHealthDiagnostic =
  | {
      outcome: "response";
      status: number;
    }
  | {
      kind: AuthorizationFetchExceptionKind;
      outcome: "fetch_exception";
    };

type AuthorizationFetchExceptionKind =
  | "invalid_fetch_receiver"
  | "network_connection_lost"
  | "worker_loop"
  | "same_zone_worker_fetch"
  | "host_access_denied"
  | "cloudflare_ip_blocked"
  | "runtime_unavailable"
  | "unsupported_cache_mode"
  | "unknown";

const authorizationTimeoutMs = 5_000;
const healthProbeTimeoutMs = 2_000;

const mediaCookieName = "__Secure-mw_media_access";

const uploadedMediaGateway = {
  fetch(request: Request, env: UploadedMediaGatewayEnv) {
    return handleRangeGatewayRequest(request, env);
  },
};

export default uploadedMediaGateway;

export async function handleRangeGatewayRequest(
  request: Request,
  env: UploadedMediaGatewayEnv,
  dependencies: GatewayDependencies = {
    // Native Worker fetch requires the global receiver, not this object.
    fetch: (...args) => globalThis.fetch(...args),
    reportAuthorizationFailure,
  },
) {
  if (request.method !== "GET") {
    return privateResponse("Method not allowed.", 405, {
      Allow: "GET",
    });
  }

  const requestUrl = new URL(request.url);
  const pathMatch = /^\/room-sessions\/([^/]+)\/content$/.exec(
    requestUrl.pathname,
  );

  if (!pathMatch) {
    return privateResponse("Not found.", 404);
  }

  const requestedRange = parseRangeHeader(request.headers.get("Range"));

  if (requestedRange === "invalid") {
    return privateResponse("Requested range is not supported.", 416);
  }

  let sessionId: string;

  try {
    sessionId = decodeURIComponent(pathMatch[1]);
  } catch {
    return privateResponse("Invalid media session path.", 400);
  }

  if (!sessionId || sessionId.length > 200) {
    return privateResponse("Invalid media session path.", 400);
  }

  const credential = readCookie(request.headers.get("Cookie"), mediaCookieName);

  if (!credential || credential.length > 4_096) {
    return privateResponse("Media authorization is required.", 401);
  }

  const authorization = await authorizeRequest({
    credential,
    dependencies,
    env,
    sessionId,
  });

  if (!authorization.allowed) {
    return privateResponse(
      authorization.status === 403
        ? "Media access is not allowed."
        : "Media authorization is unavailable.",
      authorization.status,
    );
  }

  let object: R2ObjectBodyLike | null;

  try {
    object = await env.MEDIA_BUCKET.get(authorization.objectKey, {
      range: requestedRange ?? undefined,
    });
  } catch (error) {
    if (requestedRange && isInvalidRangeError(error)) {
      const metadata = await env.MEDIA_BUCKET.head(
        authorization.objectKey,
      ).catch(() => null);

      return privateResponse("Media range could not be satisfied.", 416, {
        ...(metadata ? { "Content-Range": `bytes */${metadata.size}` } : {}),
      });
    }

    return privateResponse("Media storage is unavailable.", 502);
  }

  if (!object) {
    return privateResponse("Media object was not found.", 404);
  }

  const headers = privateHeaders();

  object.writeHttpMetadata(headers);
  // Stored object metadata must never make private media cacheable.
  for (const [name, value] of privateHeaders()) {
    headers.set(name, value);
  }
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(object.range?.length ?? object.size));
  headers.set("X-Content-Type-Options", "nosniff");

  if (!headers.has("Content-Type") && authorization.contentType) {
    headers.set("Content-Type", authorization.contentType);
  }

  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }

  if (requestedRange) {
    if (!object.range) {
      return privateResponse("Media range could not be satisfied.", 416, {
        "Content-Range": `bytes */${object.size}`,
      });
    }

    const end = object.range.offset + object.range.length - 1;
    headers.set(
      "Content-Range",
      `bytes ${object.range.offset}-${end}/${object.size}`,
    );
  }

  return new Response(object.body, {
    headers,
    status: requestedRange ? 206 : 200,
  });
}

async function authorizeRequest(input: {
  credential: string;
  dependencies: GatewayDependencies;
  env: UploadedMediaGatewayEnv;
  sessionId: string;
}): Promise<
  | {
      allowed: true;
      contentType: string | null;
      objectKey: string;
    }
  | {
      allowed: false;
      status: 403 | 503;
    }
> {
  let response: Response;

  try {
    response = await input.dependencies.fetch(
      new URL(
        "/api/internal/media/range-authorize",
        input.env.AUTHORIZATION_ORIGIN,
      ),
      {
        body: JSON.stringify({
          credential: input.credential,
          sessionId: input.sessionId,
        }),
        headers: {
          Authorization: `Bearer ${input.env.MEDIA_GATEWAY_ORIGIN_SECRET}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(authorizationTimeoutMs),
      },
    );
  } catch (error) {
    input.dependencies.reportAuthorizationFailure?.({
      kind: classifyAuthorizationFetchException(error),
      originHealth: await probeAuthorizationOriginHealth({
        dependencies: input.dependencies,
        origin: input.env.AUTHORIZATION_ORIGIN,
      }),
      reason: "fetch_exception",
    });

    return { allowed: false, status: 503 };
  }

  if (!response.ok) {
    if (response.status !== 401 && response.status !== 403) {
      input.dependencies.reportAuthorizationFailure?.({
        reason: "upstream_status",
        status: response.status,
      });
    }

    return {
      allowed: false,
      status: response.status === 401 || response.status === 403 ? 403 : 503,
    };
  }

  const payload = (await response.json().catch(() => null)) as {
    contentType?: unknown;
    objectKey?: unknown;
  } | null;

  if (!payload || typeof payload.objectKey !== "string" || !payload.objectKey) {
    input.dependencies.reportAuthorizationFailure?.({
      reason: "malformed_success",
      status: response.status,
    });

    return { allowed: false, status: 503 };
  }

  return {
    allowed: true,
    contentType:
      typeof payload.contentType === "string" && payload.contentType
        ? payload.contentType
        : null,
    objectKey: payload.objectKey,
  };
}

async function probeAuthorizationOriginHealth(input: {
  dependencies: GatewayDependencies;
  origin: string;
}): Promise<AuthorizationOriginHealthDiagnostic> {
  try {
    const response = await input.dependencies.fetch(
      new URL("/api/health", input.origin),
      { method: "GET", signal: AbortSignal.timeout(healthProbeTimeoutMs) },
    );

    return { outcome: "response", status: response.status };
  } catch (error) {
    return {
      kind: classifyAuthorizationFetchException(error),
      outcome: "fetch_exception",
    };
  }
}

function parseRangeHeader(value: string | null): R2Range | "invalid" | null {
  if (!value) {
    return null;
  }

  if (value.includes(",")) {
    return "invalid";
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());

  if (!match || (!match[1] && !match[2])) {
    return "invalid";
  }

  if (!match[1]) {
    const suffix = Number(match[2]);

    return Number.isSafeInteger(suffix) && suffix > 0 ? { suffix } : "invalid";
  }

  const offset = Number(match[1]);

  if (!Number.isSafeInteger(offset) || offset < 0) {
    return "invalid";
  }

  if (!match[2]) {
    return { offset };
  }

  const end = Number(match[2]);

  if (!Number.isSafeInteger(end) || end < offset) {
    return "invalid";
  }

  return { length: end - offset + 1, offset };
}

function readCookie(header: string | null, name: string) {
  if (!header) {
    return null;
  }

  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");

    if (separator < 0) {
      continue;
    }

    const candidateName = entry.slice(0, separator).trim();

    if (candidateName === name) {
      return entry.slice(separator + 1).trim() || null;
    }
  }

  return null;
}

function privateResponse(
  body: string,
  status: number,
  additionalHeaders?: HeadersInit,
) {
  const headers = privateHeaders();

  for (const [name, value] of new Headers(additionalHeaders)) {
    headers.set(name, value);
  }

  return new Response(body, { headers, status });
}

function privateHeaders() {
  return new Headers({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    Vary: "Cookie, Range",
  });
}

function reportAuthorizationFailure(
  diagnostic: AuthorizationFailureDiagnostic,
) {
  console.warn("[media-gateway] authorization unavailable", diagnostic);
}

function classifyAuthorizationFetchException(
  error: unknown,
): AuthorizationFetchExceptionKind {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (/illegal invocation/i.test(message)) {
    return "invalid_fetch_receiver";
  }

  if (/network connection lost/i.test(message)) {
    return "network_connection_lost";
  }

  if (/\b1019\b|loop limit/i.test(message)) {
    return "worker_loop";
  }

  if (/\b1042\b|same[- ]zone.+worker/i.test(message)) {
    return "same_zone_worker_fetch";
  }

  if (/\b1021\b|host (?:it )?cannot access/i.test(message)) {
    return "host_access_denied";
  }

  if (/\b1024\b|cloudflare-owned ip/i.test(message)) {
    return "cloudflare_ip_blocked";
  }

  if (/daemondown/i.test(message)) {
    return "runtime_unavailable";
  }

  if (/unsupported cache mode/i.test(message)) {
    return "unsupported_cache_mode";
  }

  return "unknown";
}

function isInvalidRangeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };

  return (
    candidate.code === 10039 ||
    (typeof candidate.message === "string" &&
      /InvalidRange|10039|range.+416/i.test(candidate.message))
  );
}
