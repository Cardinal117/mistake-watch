import { parseCatalogueRegion } from "./catalogue-region";
import {
  CATALOGUE_BATCH_SIZE,
  CATALOGUE_DAILY_LIMIT,
  CATALOGUE_MEDIA_ID,
  catalogueCount,
  catalogueObject,
  catalogueThumbnail,
  type CatalogueResult,
} from "./catalogue-contracts";

export type CatalogueWorkerDependencies = {
  prune: () => Promise<unknown>;
  claim: (limit: number) => Promise<unknown>;
  fetchBatch: (ids: string[]) => Promise<CatalogueResult[]>;
  complete: (token: string, results: CatalogueResult[]) => Promise<unknown>;
};
export function catalogueDailyLimit(value: string | undefined) {
  if (value === undefined) return CATALOGUE_DAILY_LIMIT;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0
    ? Math.min(parsed, CATALOGUE_DAILY_LIMIT)
    : 0;
}

export async function runCatalogueWorker(
  deps: CatalogueWorkerDependencies,
  limit = CATALOGUE_DAILY_LIMIT,
) {
  // Physical retention is independent of the provider and room transport.
  const pruned = await deps.prune();
  if (limit <= 0) return { status: "disabled", requested: 0, pruned };
  const claim = catalogueObject(
    await deps.claim(Math.min(limit, CATALOGUE_DAILY_LIMIT)),
  );
  if (
    !Array.isArray(claim.videoIds) ||
    claim.videoIds.length > CATALOGUE_BATCH_SIZE ||
    claim.videoIds.some(
      (id) => typeof id !== "string" || !CATALOGUE_MEDIA_ID.test(id),
    ) ||
    new Set(claim.videoIds).size !== claim.videoIds.length ||
    typeof claim.budgetExhausted !== "boolean"
  )
    throw new Error("Invalid catalogue claim");
  const ids = claim.videoIds as string[];
  if (!ids.length)
    return {
      status: claim.budgetExhausted ? "budget-exhausted" : "idle",
      requested: 0,
      pruned,
    };
  if (
    typeof claim.leaseToken !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(claim.leaseToken)
  )
    throw new Error("Invalid catalogue lease");
  let results: CatalogueResult[];
  try {
    results = await deps.fetchBatch(ids);
    if (
      results.length !== ids.length ||
      new Set(results.map((r) => r.mediaId)).size !== ids.length ||
      results.some((result) => !ids.includes(result.mediaId))
    )
      throw new Error("Incomplete catalogue batch");
  } catch {
    results = ids.map((mediaId) => ({ mediaId, status: "transient_failure" }));
  }
  const completed = await deps.complete(claim.leaseToken, results);
  return { status: "processed", requested: ids.length, completed, pruned };
}

// This adapter consumes only the provider response, never browser metadata.
export function normalizeCatalogueVideos(
  payload: unknown,
  ids: string[],
  duration: (value?: string) => number | null,
): CatalogueResult[] {
  const input = catalogueObject(payload);
  if (!Array.isArray(input.items) || input.items.length > CATALOGUE_BATCH_SIZE)
    throw new Error("Invalid YouTube catalogue response");
  const videos = new Map<string, Record<string, unknown>>();
  for (const value of input.items) {
    const row = catalogueObject(value);
    if (
      typeof row.id !== "string" ||
      !ids.includes(row.id) ||
      videos.has(row.id)
    )
      throw new Error("Invalid YouTube catalogue identity");
    videos.set(row.id, row);
  }
  return ids.map((mediaId) => {
    const row = videos.get(mediaId);
    if (!row) return { mediaId, status: "unavailable" };
    const status = row.status ? catalogueObject(row.status) : null;
    if (
      !status ||
      status.privacyStatus !== "public" ||
      status.embeddable !== true ||
      status.uploadStatus !== "processed"
    )
      return { mediaId, status: "unavailable" };
    const snippet = catalogueObject(row.snippet);
    if (
      typeof snippet.title !== "string" ||
      !snippet.title.trim() ||
      snippet.title.length > 500
    )
      return { mediaId, status: "transient_failure" };
    const channelTitle =
      typeof snippet.channelTitle === "string" &&
      snippet.channelTitle.length <= 200
        ? snippet.channelTitle
        : null;
    const details = row.contentDetails
      ? catalogueObject(row.contentDetails)
      : {};
    const rating = details.contentRating
      ? catalogueObject(details.contentRating)
      : {};
    const region = parseCatalogueRegion(details.regionRestriction);
    if (!region || rating.ytRating === "ytAgeRestricted")
      return { mediaId, status: "unavailable" };
    const durationSeconds = duration(
      typeof details.duration === "string" ? details.duration : undefined,
    );
    const thumbs = snippet.thumbnails
      ? catalogueObject(snippet.thumbnails)
      : {};
    const thumb = thumbs.high ?? thumbs.medium ?? thumbs.default;
    const url = thumb ? catalogueObject(thumb).url : null;
    const thumbnailUrl = catalogueThumbnail(url) ? url : null;
    const statistics = row.statistics ? catalogueObject(row.statistics) : {};
    return {
      mediaId,
      status: "public",
      ...region,
      title: snippet.title,
      channelTitle,
      durationSeconds: catalogueCount(durationSeconds) ? durationSeconds : null,
      thumbnailUrl,
      viewCount: count(statistics.viewCount),
      likeCount: count(statistics.likeCount),
    };
  });
}
function count(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return catalogueCount(number) ? number : null;
}

export async function maintainBeforeRoomDrain<T>(
  maintain: () => Promise<unknown>,
  drain: () => Promise<T>,
) {
  let catalogue: unknown;
  let maintenanceFailed = false;
  try {
    catalogue = await maintain();
  } catch {
    maintenanceFailed = true;
  }
  const result = await drain();
  if (maintenanceFailed)
    throw new Error("Catalogue maintenance failed; room events drained");
  return { ...result, catalogue };
}
