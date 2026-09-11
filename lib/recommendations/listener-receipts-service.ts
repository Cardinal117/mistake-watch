import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withListenerAuthority } from "./listener-bridge";
import {
  durableListenerReceipt,
  type AccountListeningCounts,
} from "./listener-receipt-contracts";
import { drainRecommendationEventBatch } from "./outbox-drain";

// Called inside the existing recommendation-delivery lease, not one SQL write per observation.
export async function drainListenerReceipts({
  client = createSupabaseAdminClient(),
  limit = 100,
  onProgress,
}: {
  client?: ReturnType<typeof createSupabaseAdminClient>;
  limit?: number;
  onProgress?: (value: {
    status: "empty" | "partial";
    processed: number;
    oldestPendingMs: number | null;
  }) => void;
} = {}) {
  let progress: {
    status: "empty" | "partial";
    processed: number;
    oldestPendingMs: number | null;
  } = { status: "empty", processed: 0, oldestPendingMs: null };
  const result = await withListenerAuthority((authority) =>
    drainRecommendationEventBatch({
      limit,
      maxBatches: 4,
      maxDurationMs: 8000,
      onProgress: (value) => {
        progress = value;
        onProgress?.(value);
      },
      transport: {
        ...authority,
        read: async (count) =>
          (await authority.read(count)).map((receipt) => ({
            ...receipt,
            eventId: receipt.receiptId,
          })),
      },
      consume: async (receipts) => {
        const result = await client
          .rpc("ingest_listener_receipts", {
            receipt_batch: receipts.map(durableListenerReceipt),
          })
          .abortSignal(AbortSignal.timeout(8000));
        if (
          result.error ||
          !result.data ||
          typeof result.data !== "object" ||
          !("received" in result.data) ||
          result.data.received !== receipts.length
        )
          throw new Error(
            "Listener receipt persistence failed; pending receipts retained",
          );
      },
    }),
  );
  return { ...result, ...progress };
}
export async function readAccountListeningCounts(
  accountId: string,
  sourceIds?: string[],
): Promise<AccountListeningCounts> {
  const result = await createSupabaseAdminClient()
    .rpc("read_account_listening_counts", {
      target_account: accountId,
      source_ids: sourceIds ?? null,
    })
    .abortSignal(AbortSignal.timeout(8000));
  if (
    result.error ||
    !result.data ||
    typeof result.data !== "object" ||
    !("scope" in result.data) ||
    result.data.scope !== "account_listener"
  )
    throw new Error("Account listening counts are unavailable");
  return result.data as AccountListeningCounts;
}
export async function pruneListenerReceipts() {
  const result = await createSupabaseAdminClient()
    .rpc("prune_listener_receipts")
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw new Error("Listener receipt cleanup failed");
  return result.data;
}
