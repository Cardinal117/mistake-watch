import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { parseYouTubeDuration } from "@/lib/youtube/metadata";
import { catalogueObject, CATALOGUE_MEDIA_ID } from "./catalogue-contracts";
import {
  catalogueDailyLimit,
  normalizeCatalogueVideos,
  runCatalogueWorker,
} from "./catalogue-worker-core";
export { cataloguePreparationFailureStage } from "./catalogue-worker-core";

export async function preparePersonalCatalogue(
  roomId: string,
  accountUserId: string,
) {
  const client = createSupabaseAdminClient();
  const args = { target_room: roomId, target_account: accountUserId };
  const preview = await client.rpc("reconcile_personal_catalogue", args);
  if (preview.error) throw new Error("Catalogue reconciliation preview failed");
  const body = catalogueObject(preview.data);
  if (
    !Array.isArray(body.mediaIds) ||
    body.mediaIds.length > 128 ||
    body.mediaIds.some(
      (id) => typeof id !== "string" || !CATALOGUE_MEDIA_ID.test(id),
    )
  )
    throw new Error("Invalid catalogue reconciliation preview");
  if (body.mediaIds.length) {
    const applied = await client.rpc("reconcile_personal_catalogue", {
      ...args,
      preview_ids: body.mediaIds as string[],
    });
    if (applied.error) throw new Error("Catalogue reconciliation failed");
  }
  return runMusicCatalogueMaintenance();
}

export async function pruneMusicCatalogue() {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "prune_music_catalogue",
    {},
  );
  if (error) throw new Error("Catalogue cleanup failed");
  const shadow = await createSupabaseAdminClient()
    .rpc("prune_shadow_enrichment", {})
    .abortSignal(AbortSignal.timeout(5000));
  if (shadow.error) throw new Error("Shadow evidence cleanup failed");
  return data;
}

export async function runMusicCatalogueMaintenance() {
  const client = createSupabaseAdminClient();
  const key = process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY;
  const limit = key
    ? catalogueDailyLimit(process.env.MUSIC_CATALOGUE_METADATA_DAILY_LIMIT)
    : 0;
  return runCatalogueWorker(
    {
      prune: pruneMusicCatalogue,
      claim: async (request_limit) => {
        const result = await client.rpc("claim_music_catalogue_jobs", {
          request_limit,
        });
        if (result.error) throw new Error("Catalogue claim failed");
        return result.data;
      },
      fetchBatch: async (ids) => {
        const url = new URL("https://www.googleapis.com/youtube/v3/videos");
        url.searchParams.set("key", key!);
        url.searchParams.set("id", ids.join(","));
        url.searchParams.set(
          "part",
          "snippet,contentDetails,statistics,status",
        );
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Catalogue provider unavailable");
        return normalizeCatalogueVideos(
          await response.json(),
          ids,
          parseYouTubeDuration,
        );
      },
      complete: async (lease_token, results) => {
        const result = await client.rpc("complete_music_catalogue_jobs", {
          lease_token,
          results: results as unknown as Json,
        });
        if (result.error) throw new Error("Catalogue completion failed");
        return result.data;
      },
    },
    limit,
  );
}
