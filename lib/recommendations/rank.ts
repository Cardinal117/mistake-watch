import { recommendationMediaKey } from "./media-identity";
import {
  normalizeRecommendationLimit,
  prepareRecommendationInputs,
  type RecommendationExclusion,
  type RecommendationRankingContext,
} from "./ranking-inputs";
import { emptyRecommendationSignals } from "./ranking-signals";
import {
  scoreRecommendationCandidate,
  sumComponents,
  type RecommendationAggregate,
  type RecommendationCandidate,
  type RecommendationPreference,
  type RecommendationReason,
  type RecommendationScoreComponents,
  type RecommendationWeights,
} from "./scoring";

export type {
  RecommendationExclusion,
  RecommendationExclusionReason,
  RecommendationMediaRef,
  RecommendationRankingContext,
} from "./ranking-inputs";
export type {
  RecommendationAggregate,
  RecommendationCandidate,
  RecommendationPreference,
  RecommendationReason,
  RecommendationReasonCode,
  RecommendationScoreComponents,
  RecommendationWeights,
} from "./scoring";

export type RankedRecommendation = {
  candidate: RecommendationCandidate;
  components: RecommendationScoreComponents;
  mediaKey: string;
  reasons: RecommendationReason[];
  totalScore: number;
};

export type RecommendationRankingResult = {
  exclusions: RecommendationExclusion[];
  ranked: RankedRecommendation[];
};

type ScoredRecommendation = RankedRecommendation & {
  diversityKeys: {
    artist: string;
    channel: string;
    source: string;
  };
};

export function rankRecommendations({
  aggregates = [],
  candidates,
  context,
  limit = 20,
  preferences = [],
  weights: weightOverrides,
}: {
  aggregates?: RecommendationAggregate[];
  candidates: RecommendationCandidate[];
  context: RecommendationRankingContext;
  limit?: number;
  preferences?: RecommendationPreference[];
  weights?: Partial<RecommendationWeights>;
}): RecommendationRankingResult {
  const prepared = prepareRecommendationInputs({
    aggregates,
    candidates,
    context,
    preferences,
    weightOverrides,
  });
  const scored = prepared.eligibleCandidates.map((candidate) => {
    const mediaKey = recommendationMediaKey(candidate);
    const signals =
      prepared.signalsByMediaKey.get(mediaKey) ?? emptyRecommendationSignals();
    signals.preferenceState =
      prepared.preferenceByMediaKey.get(mediaKey) ?? "neutral";
    const score = scoreRecommendationCandidate({
      activeContributorMemberIds: prepared.activeContributorMemberIds,
      candidate,
      currentMedia: prepared.currentMedia,
      nowMs: prepared.nowMs,
      signals,
      weights: prepared.weights,
    });

    return {
      candidate,
      diversityKeys: {
        artist: normalizedMetadata(candidate.artist),
        channel: normalizedMetadata(candidate.channelName),
        source: candidate.sourceType,
      },
      mediaKey,
      ...score,
    };
  });

  return {
    exclusions: prepared.exclusions,
    ranked: selectDiverseRecommendations(
      scored,
      normalizeRecommendationLimit(limit),
      prepared.weights,
    ),
  };
}

function selectDiverseRecommendations(
  scored: ScoredRecommendation[],
  limit: number,
  weights: RecommendationWeights,
) {
  const remaining = [...scored];
  const ranked: RankedRecommendation[] = [];
  const artistCounts = new Map<string, number>();
  const channelCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  while (remaining.length > 0 && ranked.length < limit) {
    let selectedIndex = 0;
    let selected = remaining[0];
    let selectedPenalty = diversityPenalty(
      selected,
      artistCounts,
      channelCounts,
      sourceCounts,
      weights,
    );

    for (let index = 1; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const candidatePenalty = diversityPenalty(
        candidate,
        artistCounts,
        channelCounts,
        sourceCounts,
        weights,
      );

      if (
        compareRanked(candidate, candidatePenalty, selected, selectedPenalty) <
        0
      ) {
        selected = candidate;
        selectedIndex = index;
        selectedPenalty = candidatePenalty;
      }
    }

    remaining.splice(selectedIndex, 1);
    const { diversityKeys, ...recommendation } = selected;
    const components = {
      ...recommendation.components,
      diversityPenalty: selectedPenalty,
    };
    ranked.push({
      ...recommendation,
      components,
      totalScore: sumComponents(components),
    });
    incrementCount(artistCounts, diversityKeys.artist);
    incrementCount(channelCounts, diversityKeys.channel);
    incrementCount(sourceCounts, diversityKeys.source);
  }

  return ranked;
}

function diversityPenalty(
  recommendation: ScoredRecommendation,
  artistCounts: Map<string, number>,
  channelCounts: Map<string, number>,
  sourceCounts: Map<string, number>,
  weights: RecommendationWeights,
) {
  const artistCount = countFor(
    artistCounts,
    recommendation.diversityKeys.artist,
  );
  const channelCount = countFor(
    channelCounts,
    recommendation.diversityKeys.channel,
  );
  const sourceCount = countFor(
    sourceCounts,
    recommendation.diversityKeys.source,
  );
  return -(
    Math.min(artistCount, 3) * weights.artistDiversityPenalty +
    Math.min(channelCount, 3) * weights.channelDiversityPenalty +
    Math.min(Math.max(sourceCount - 2, 0), 5) * weights.sourceDiversityPenalty
  );
}

function compareRanked(
  left: ScoredRecommendation,
  leftPenalty: number,
  right: ScoredRecommendation,
  rightPenalty: number,
) {
  return (
    right.totalScore + rightPenalty - (left.totalScore + leftPenalty) ||
    compareText(left.mediaKey, right.mediaKey)
  );
}

function countFor(counts: Map<string, number>, key: string) {
  return key ? (counts.get(key) ?? 0) : 0;
}

function incrementCount(counts: Map<string, number>, key: string) {
  if (key) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}

function normalizedMetadata(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
