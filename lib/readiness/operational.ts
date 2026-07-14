export const READINESS_TIMEOUT_MS = 2_000;

export type CoreReadinessStatus = "ready" | "not_configured" | "unavailable";

export type OperationalReadiness = {
  checks: {
    cloudconvert: { status: "configured" | "not_configured" };
    spacetime: { status: CoreReadinessStatus };
    supabase: { status: CoreReadinessStatus };
  };
  ok: boolean;
  service: "mistake-watch";
  status: "ready" | "not_ready";
};

type CoreDependencyCheck = {
  check(signal: AbortSignal): Promise<void>;
  configured: boolean;
};

export async function runOperationalReadiness({
  cloudconvertConfigured,
  spacetime,
  supabase,
  timeoutMs = READINESS_TIMEOUT_MS,
}: {
  cloudconvertConfigured: boolean;
  spacetime: CoreDependencyCheck;
  supabase: CoreDependencyCheck;
  timeoutMs?: number;
}): Promise<OperationalReadiness> {
  const [supabaseStatus, spacetimeStatus] = await Promise.all([
    runCoreCheck(supabase, timeoutMs),
    runCoreCheck(spacetime, timeoutMs),
  ]);
  const ok = supabaseStatus === "ready" && spacetimeStatus === "ready";

  return {
    checks: {
      cloudconvert: {
        status: cloudconvertConfigured ? "configured" : "not_configured",
      },
      spacetime: { status: spacetimeStatus },
      supabase: { status: supabaseStatus },
    },
    ok,
    service: "mistake-watch",
    status: ok ? "ready" : "not_ready",
  };
}

export function createOperationalReadinessResponse(
  readiness: OperationalReadiness,
) {
  return Response.json(readiness, {
    headers: { "Cache-Control": "no-store" },
    status: readiness.ok ? 200 : 503,
  });
}

async function runCoreCheck(
  dependency: CoreDependencyCheck,
  timeoutMs: number,
): Promise<CoreReadinessStatus> {
  if (!dependency.configured) {
    return "not_configured";
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      dependency.check(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Readiness check timed out."));
        }, timeoutMs);
      }),
    ]);
    return "ready";
  } catch {
    return "unavailable";
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
