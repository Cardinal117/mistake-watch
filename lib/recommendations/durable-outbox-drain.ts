import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withTrustedRecommendationOutbox } from "./outbox-bridge";
import { drainRecommendationEventBatch } from "./outbox-drain";
import {
  persistRecommendationEventBatch,
  pruneDurableRecommendationData,
} from "./persistence";

export async function drainDurableRecommendationOutbox(limit = 50) {
  const client = createSupabaseAdminClient();

  const result = await withTrustedRecommendationOutbox((transport) =>
    drainRecommendationEventBatch({
      consume: (events) =>
        persistRecommendationEventBatch({ client, events }).then(
          () => undefined,
        ),
      limit,
      transport,
    }),
  );

  const pruned = await pruneDurableRecommendationData(client);
  return { ...result, pruned };
}
