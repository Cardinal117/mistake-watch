import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withTrustedRecommendationOutbox } from "./outbox-bridge";
import { drainRecommendationEventBatch } from "./outbox-drain";
import {
  drainListenerReceipts,
  pruneListenerReceipts,
} from "./listener-receipts-service";
import {
  persistRecommendationEventBatch,
  pruneDurableRecommendationData,
} from "./persistence";

export async function deliverRecommendationEvents(limit = 100) {
  const client = createSupabaseAdminClient();
  const claim = await client
    .rpc("claim_recommendation_delivery")
    .abortSignal(AbortSignal.timeout(10_000));
  if (claim.error) throw new Error("Recommendation delivery claim failed");
  if (!claim.data) return { status: "busy" as const, read: 0, acknowledged: 0 };
  const token = claim.data;
  let progress: {
    status: "empty" | "partial" | "failed";
    processed: number;
    oldestPendingMs: number | null;
  } = {
    status: "failed",
    processed: 0,
    oldestPendingMs: null,
  };
  try {
    const result = await withTrustedRecommendationOutbox((transport) =>
      drainRecommendationEventBatch({
        consume: async (events) => {
          await persistRecommendationEventBatch({ client, events });
        },
        limit,
        maxBatches: 20,
        transport,
        onProgress: (value) => {
          progress = value;
        },
      }),
    );
    const operationalProgress = { ...progress };
    const listenerResult = await drainListenerReceipts({
      client,
      limit,
      onProgress: (value) => {
        const oldest = [
          operationalProgress.oldestPendingMs,
          value.oldestPendingMs,
        ].filter((at): at is number => at !== null);
        progress = {
          status:
            operationalProgress.status === "partial" ||
            value.status === "partial"
              ? "partial"
              : "empty",
          processed: operationalProgress.processed + value.processed,
          oldestPendingMs: oldest.length ? Math.min(...oldest) : null,
        };
      },
    });
    return {
      read: result.read + listenerResult.read,
      acknowledged: result.acknowledged + listenerResult.acknowledged,
      status: progress.status,
      oldestPendingMs: progress.oldestPendingMs,
    };
  } catch {
    progress.status = "failed";
    throw new Error(
      "Recommendation event delivery failed; unacknowledged events retained",
    );
  } finally {
    const finish = await client
      .rpc("finish_recommendation_delivery", {
        claim_token: token,
        outcome: progress.status,
        processed: progress.processed,
        oldest_pending_ms: progress.oldestPendingMs,
      })
      .abortSignal(AbortSignal.timeout(10_000));
    if (finish.error || !finish.data)
      throw new Error("Recommendation delivery lease completion failed");
  }
}

// Maintenance/cleanup retain pruning. Interactive delivery is event-only.
export async function drainDurableRecommendationOutbox(limit = 100) {
  const result = await deliverRecommendationEvents(limit);
  const pruned = await pruneDurableRecommendationData();
  const listenerPruned = await pruneListenerReceipts();
  return { ...result, pruned, listenerPruned };
}

export async function deliverRecommendationEventsInBackground() {
  try {
    const result = await deliverRecommendationEvents();
    if (result.status === "partial")
      console.warn(
        "[recommendations:delivery] Backlog remains after bounded run",
      );
  } catch {
    console.warn(
      "[recommendations:delivery] Delivery failed; pending events retained",
    );
  }
}
