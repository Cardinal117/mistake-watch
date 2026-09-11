import {
  isDiscoverSuppressed,
  type DiscoverItem,
  type DiscoverRecommendation,
  type DiscoverResponse,
} from "./discover-contracts";
import {
  CATALOGUE_MEDIA_ID,
  catalogueCount,
  catalogueDate,
  catalogueObject,
  parseCatalogueMetadata,
} from "./catalogue-contracts";
import type { DiscoverProjection } from "./discover-service-core";

type Candidate = DiscoverProjection["items"][number] & {
  choiceCount: number;
  lastChoiceAt: string | null;
};

export function catalogueReason(
  code: unknown,
): DiscoverRecommendation["reason"] {
  if (code === "liked") return { code, label: "You liked this" };
  if (code === "chosen") return { code, label: "You chose this before" };
  if (code === "history") return { code, label: "From your listening history" };
  throw new Error("Invalid catalogue reason");
}

export function catalogueDiscovery(
  value: unknown,
  projection: DiscoverProjection,
  now = Date.now(),
): DiscoverResponse {
  const snapshot = catalogueObject(value);
  if (
    !Array.isArray(snapshot.candidates) ||
    snapshot.candidates.length > 96 ||
    !Array.isArray(snapshot.metadata) ||
    snapshot.metadata.length > 120
  )
    throw new Error("Invalid catalogue snapshot");
  const candidates = snapshot.candidates.map(parseCandidate);
  const metadata = new Map(
    snapshot.metadata.map((entry) => {
      const parsed = parseCatalogueMetadata(entry, now);
      return [parsed.mediaId, parsed] as const;
    }),
  );
  if (
    metadata.size !== snapshot.metadata.length ||
    new Set(candidates.map((c) => c.mediaId)).size !== candidates.length
  )
    throw new Error("Duplicate catalogue identity");
  const state = catalogueObject(snapshot.catalogue);
  if (!catalogueCount(state.readyCount) || !catalogueCount(state.pendingCount))
    throw new Error("Invalid catalogue readiness");
  const blocked = new Set(
    projection.feedback
      .filter((f) => isDiscoverSuppressed(f, now))
      .map((f) => f.mediaId),
  );
  function hydrate(
    item: DiscoverProjection["items"][number],
  ): DiscoverItem | null {
    const cached = metadata.get(item.mediaId);
    if (
      !cached ||
      Date.parse(cached.expiresAt) <= now ||
      blocked.has(item.mediaId)
    )
      return null;
    return {
      mediaId: item.mediaId,
      sourceType: "youtube",
      liked: item.liked,
      completedPlayCount: item.completedPlayCount,
      lastCompletedAt: item.lastCompletedAt,
      title: cached.title,
      ...(cached.channelTitle ? { artist: cached.channelTitle } : {}),
      ...(cached.thumbnailUrl ? { thumbnailUrl: cached.thumbnailUrl } : {}),
      ...(cached.durationSeconds !== null
        ? { durationSeconds: cached.durationSeconds }
        : {}),
      metadataExpiresAt: cached.expiresAt,
    };
  }
  const items = projection.items.flatMap((item) => {
    const hydrated = hydrate(item);
    return hydrated ? [hydrated] : [];
  });
  // Explicit evidence is strongest; completed history is a familiar fallback,
  // never converted into a Like, a skip judgment or attention/genre inference.
  const ordered = [...candidates].sort(
    (a, b) =>
      Number(b.liked) - Number(a.liked) ||
      Number(b.choiceCount > 0) - Number(a.choiceCount > 0) ||
      Date.parse(a.lastCompletedAt ?? a.lastChoiceAt ?? "1970-01-01") -
        Date.parse(b.lastCompletedAt ?? b.lastChoiceAt ?? "1970-01-01") ||
      a.mediaId.localeCompare(b.mediaId),
  );
  const recommendations: DiscoverRecommendation[] = ordered.flatMap(
    (candidate) => {
      if (
        !candidate.liked &&
        candidate.choiceCount === 0 &&
        candidate.completedPlayCount === 0
      )
        return [];
      const item = hydrate(candidate);
      if (!item) return [];
      const reason = catalogueReason(
        candidate.liked
          ? "liked"
          : candidate.choiceCount > 0
            ? "chosen"
            : "history",
      );
      return [{ ...item, reason }];
    },
  );
  return {
    status: "available",
    items,
    feedback: projection.feedback,
    countWindowDays: projection.countWindowDays,
    recommendations,
    catalogue: {
      pendingCount: state.pendingCount,
      status:
        state.pendingCount > 0
          ? "warming"
          : recommendations.length
            ? "ready"
            : "limited",
    },
  };
}

function parseCandidate(value: unknown): Candidate {
  const row = catalogueObject(value);
  const keys = [
    "mediaId",
    "sourceType",
    "liked",
    "completedPlayCount",
    "lastCompletedAt",
    "choiceCount",
    "lastChoiceAt",
  ];
  if (
    Object.keys(row).some((k) => !keys.includes(k)) ||
    typeof row.mediaId !== "string" ||
    !CATALOGUE_MEDIA_ID.test(row.mediaId) ||
    row.sourceType !== "youtube" ||
    typeof row.liked !== "boolean" ||
    !catalogueCount(row.choiceCount) ||
    !catalogueCount(row.completedPlayCount) ||
    !(row.lastChoiceAt === null || catalogueDate(row.lastChoiceAt)) ||
    !(row.lastCompletedAt === null || catalogueDate(row.lastCompletedAt))
  )
    throw new Error("Invalid catalogue candidate");
  return row as Candidate;
}
