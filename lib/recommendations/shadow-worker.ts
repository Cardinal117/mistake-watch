import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { MBID } from "./musicbrainz-core";
import { createEnrichmentProviders } from "./enrichment-providers";
import { runShadowJob } from "./shadow-worker-core";

export async function runDurableShadowEnrichment(deadline: number) {
  const account = process.env.SHADOW_ENRICHMENT_ACCOUNT ?? "";
  if (process.env.SHADOW_ENRICHMENT_ENABLED !== "true" || !MBID.test(account))
    return;
  const client = createSupabaseAdminClient();
  return runShadowJob({
    enabled: true,
    account,
    now: Date.now,
    deadline,
    providers: createEnrichmentProviders({
      lastfmKey: process.env.LASTFM_API_KEY,
    }),
    store: {
      async enqueue(target_account, max_sources) {
        const r = await client
          .rpc("enqueue_shadow_enrichment_batch", {
            target_account,
            max_sources,
          })
          .abortSignal(AbortSignal.timeout(5000));
        if (r.error) throw Error("Shadow admission unavailable");
      },
      async claim() {
        const r = await client
          .rpc("claim_shadow_enrichment", {
            target_account: account,
            target_stage: "any",
          })
          .abortSignal(AbortSignal.timeout(5000));
        if (r.error) throw Error("Shadow claim unavailable");
        return r.data;
      },
      async complete(job_id, claim_token, outcome) {
        const r = await client
          .rpc("complete_shadow_enrichment", {
            job_id,
            claim_token,
            outcome: outcome as Json,
          })
          .abortSignal(AbortSignal.timeout(5000));
        if (r.error) throw Error("Shadow completion unavailable");
        return r.data === true;
      },
    },
  });
}
