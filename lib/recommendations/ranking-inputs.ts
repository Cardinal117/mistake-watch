import {
  normalizeRecommendationMediaIdentity,
  recommendationMediaKey,
  type RecommendationMediaIdentity,
} from "./media-identity";
import {
  buildAggregateSignals,
  buildPreferenceMap,
  normalizeRecommendationWeights,
} from "./ranking-signals";
import type {
  RecommendationAggregate,
  RecommendationCandidate,
  RecommendationPreference,
  RecommendationSignals,
  RecommendationWeights,
} from "./scoring";

export type RecommendationMediaRef = RecommendationMediaIdentity;

export type RecommendationRankingContext = {
  activeContributorMemberIds?: string[];
  currentMedia?: RecommendationMediaRef & {
    artist?: string;
    channelName?: string;
    playlistId?: string;
  };
  nowMs: number;
  queuedMedia?: RecommendationMediaRef[];
  recentHistory?: RecommendationMediaRef[];
};

export type RecommendationExclusionReason =
  | "authorization_incompatible"
  | "current_media"
  | "duplicate"
  | "invalid_candidate"
  | "queued"
  | "recent_history"
  | "unavailable";

export type RecommendationExclusion = {
  candidateId: string;
  mediaKey?: string;
  reason: RecommendationExclusionReason;
};

export type PreparedRecommendationInputs = {
  activeContributorMemberIds: Set<string>;
  currentMedia: RecommendationRankingContext["currentMedia"];
  eligibleCandidates: RecommendationCandidate[];
  exclusions: RecommendationExclusion[];
  nowMs: number;
  preferenceByMediaKey: Map<string, "liked" | "neutral">;
  signalsByMediaKey: Map<string, RecommendationSignals>;
  weights: RecommendationWeights;
};

export function prepareRecommendationInputs({
  aggregates,
  candidates,
  context,
  preferences,
  weightOverrides,
}: {
  aggregates: RecommendationAggregate[];
  candidates: RecommendationCandidate[];
  context: RecommendationRankingContext;
  preferences: RecommendationPreference[];
  weightOverrides?: Partial<RecommendationWeights>;
}): PreparedRecommendationInputs {
  const exclusions: RecommendationExclusion[] = [];
  const normalizedCandidates = candidates
    .map((candidate) => {
      const normalized = normalizeCandidate(candidate);

      if (!normalized) {
        exclusions.push({
          candidateId: boundedText(candidate?.candidateId, 160) ?? "invalid",
          reason: "invalid_candidate",
        });
      }

      return normalized;
    })
    .filter((candidate): candidate is RecommendationCandidate =>
      Boolean(candidate),
    )
    .sort(compareCandidates);
  const currentMedia = normalizeCurrentMedia(context.currentMedia);
  const currentMediaKey = mediaRefKey(currentMedia);
  const queuedMediaKeys = mediaRefKeys(context.queuedMedia);
  const recentHistoryKeys = mediaRefKeys(context.recentHistory);
  const seenMediaKeys = new Set<string>();
  const eligibleCandidates: RecommendationCandidate[] = [];

  for (const candidate of normalizedCandidates) {
    const mediaKey = recommendationMediaKey(candidate);
    const exclusionReason = hardExclusionReason({
      candidate,
      currentMediaKey,
      mediaKey,
      queuedMediaKeys,
      recentHistoryKeys,
      seenMediaKeys,
    });

    if (exclusionReason) {
      exclusions.push(
        exclusionReason === "authorization_incompatible"
          ? { candidateId: "redacted", reason: exclusionReason }
          : {
              candidateId: candidate.candidateId,
              mediaKey,
              reason: exclusionReason,
            },
      );
      continue;
    }

    seenMediaKeys.add(mediaKey);
    eligibleCandidates.push(candidate);
  }

  return {
    activeContributorMemberIds: new Set(
      (context.activeContributorMemberIds ?? [])
        .map((memberId) => boundedText(memberId, 160))
        .filter((memberId): memberId is string => Boolean(memberId)),
    ),
    currentMedia,
    eligibleCandidates,
    exclusions: exclusions.sort(compareExclusions),
    nowMs: finiteNonnegative(context.nowMs) ?? 0,
    preferenceByMediaKey: buildPreferenceMap(preferences),
    signalsByMediaKey: buildAggregateSignals(aggregates),
    weights: normalizeRecommendationWeights(weightOverrides),
  };
}

export function normalizeRecommendationLimit(limit: number) {
  return Number.isSafeInteger(limit) ? Math.max(0, Math.min(limit, 100)) : 20;
}

function hardExclusionReason({
  candidate,
  currentMediaKey,
  mediaKey,
  queuedMediaKeys,
  recentHistoryKeys,
  seenMediaKeys,
}: {
  candidate: RecommendationCandidate;
  currentMediaKey: string | null;
  mediaKey: string;
  queuedMediaKeys: Set<string>;
  recentHistoryKeys: Set<string>;
  seenMediaKeys: Set<string>;
}): RecommendationExclusionReason | null {
  if (
    candidate.catalogueAuthorized === false ||
    (candidate.sourceType === "uploaded" &&
      candidate.catalogueAuthorized !== true)
  ) {
    return "authorization_incompatible";
  }
  if (candidate.isAvailable === false) {
    return "unavailable";
  }
  if (mediaKey === currentMediaKey) {
    return "current_media";
  }
  if (queuedMediaKeys.has(mediaKey)) {
    return "queued";
  }
  if (recentHistoryKeys.has(mediaKey)) {
    return "recent_history";
  }
  if (seenMediaKeys.has(mediaKey)) {
    return "duplicate";
  }

  return null;
}

function normalizeCandidate(
  candidate: RecommendationCandidate | undefined,
): RecommendationCandidate | null {
  if (!candidate) {
    return null;
  }

  const identity = normalizeRecommendationMediaIdentity(candidate);
  const candidateId = boundedText(candidate.candidateId, 160);
  const title = boundedText(candidate.title, 300);

  if (
    !identity ||
    !candidateId ||
    !title ||
    !validOptionalText(candidate.artist, 160) ||
    !validOptionalText(candidate.channelName, 160) ||
    !validOptionalText(candidate.playlistId, 160) ||
    !validOptionalText(candidate.contributorMemberId, 160) ||
    !validOptionalBoolean(candidate.catalogueAuthorized) ||
    !validOptionalBoolean(candidate.isAvailable)
  ) {
    return null;
  }

  return {
    ...identity,
    artist: boundedText(candidate.artist, 160),
    candidateId,
    catalogueAuthorized: candidate.catalogueAuthorized,
    channelName: boundedText(candidate.channelName, 160),
    contributorMemberId: boundedText(candidate.contributorMemberId, 160),
    isAvailable: candidate.isAvailable,
    playlistId: boundedText(candidate.playlistId, 160),
    publishedAtMs: finiteNonnegative(candidate.publishedAtMs),
    title,
  };
}

function normalizeCurrentMedia(
  currentMedia: RecommendationRankingContext["currentMedia"],
): RecommendationRankingContext["currentMedia"] {
  const identity = currentMedia
    ? normalizeRecommendationMediaIdentity(currentMedia)
    : null;

  if (!identity) {
    return undefined;
  }

  return {
    ...identity,
    artist: boundedText(currentMedia?.artist, 160),
    channelName: boundedText(currentMedia?.channelName, 160),
    playlistId: boundedText(currentMedia?.playlistId, 160),
  };
}

function mediaRefKeys(refs?: RecommendationMediaRef[]) {
  return new Set(
    (refs ?? [])
      .map(mediaRefKey)
      .filter((mediaKey): mediaKey is string => Boolean(mediaKey)),
  );
}

function mediaRefKey(ref?: RecommendationMediaRef) {
  const identity = ref ? normalizeRecommendationMediaIdentity(ref) : null;
  return identity ? recommendationMediaKey(identity) : null;
}

function compareCandidates(
  left: RecommendationCandidate,
  right: RecommendationCandidate,
) {
  return (
    compareText(recommendationMediaKey(left), recommendationMediaKey(right)) ||
    compareText(left.candidateId, right.candidateId)
  );
}

function compareExclusions(
  left: RecommendationExclusion,
  right: RecommendationExclusion,
) {
  return (
    compareText(left.candidateId, right.candidateId) ||
    compareText(left.reason, right.reason) ||
    compareText(left.mediaKey ?? "", right.mediaKey ?? "")
  );
}

function validOptionalText(value: string | undefined, maxLength: number) {
  return value === undefined || value.trim().length <= maxLength;
}

function validOptionalBoolean(value: boolean | undefined) {
  return value === undefined || typeof value === "boolean";
}

function boundedText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function finiteNonnegative(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
