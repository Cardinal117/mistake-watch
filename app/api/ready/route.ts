import {
  createOperationalReadinessResponse,
  runOperationalReadiness,
} from "@/lib/readiness/operational";
import { DbConnection } from "@/lib/spacetime/generated";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const spacetimeUri = process.env.NEXT_PUBLIC_SPACETIME_URI?.trim();
  const spacetimeModule = process.env.NEXT_PUBLIC_SPACETIME_MODULE?.trim();
  const readiness = await runOperationalReadiness({
    cloudconvertConfigured: Boolean(process.env.CLOUDCONVERT_API_TOKEN?.trim()),
    spacetime: {
      check: (signal) =>
        checkSpacetime(signal, spacetimeUri ?? "", spacetimeModule ?? ""),
      configured: Boolean(spacetimeUri && spacetimeModule),
    },
    supabase: {
      check: (signal) =>
        checkSupabase(signal, supabaseUrl ?? "", supabaseKey ?? ""),
      configured: Boolean(supabaseUrl && supabaseKey),
    },
  });

  return createOperationalReadinessResponse(readiness);
}

async function checkSupabase(
  signal: AbortSignal,
  url: string,
  publishableKey: string,
) {
  const endpoint = new URL("/rest/v1/rooms?select=id&limit=0", url);
  const response = await fetch(endpoint, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Supabase is unavailable.");
  }
}

function checkSpacetime(
  signal: AbortSignal,
  uri: string,
  databaseName: string,
) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let handle: { disconnect(): void } | undefined;

    const settle = (result: "ready" | "unavailable") => {
      if (settled) {
        return;
      }

      settled = true;
      signal.removeEventListener("abort", handleAbort);

      if (result === "ready") {
        resolve();
      } else {
        reject(new Error("SpacetimeDB is unavailable."));
      }
    };
    const handleAbort = () => {
      handle?.disconnect();
      settle("unavailable");
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    handle = DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(databaseName)
      .onConnect((connected) => {
        settle("ready");
        connected.disconnect();
      })
      .onConnectError(() => settle("unavailable"))
      .onDisconnect(() => settle("unavailable"))
      .build();
  });
}
