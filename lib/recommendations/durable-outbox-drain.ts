import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withTrustedRecommendationOutbox } from "./outbox-bridge";
import { drainRecommendationEventBatch } from "./outbox-drain";
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
    return {
      ...result,
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
  return { ...result, pruned };
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
