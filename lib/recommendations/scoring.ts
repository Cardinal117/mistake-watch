import type { RecommendationMediaIdentity } from "./media-identity";

export type RecommendationCandidate = RecommendationMediaIdentity & {
  artist?: string;
  candidateId: string;
  catalogueAuthorized?: boolean;
  channelName?: string;
  contributorMemberId?: string;
  isAvailable?: boolean;
  playlistId?: string;
  publishedAtMs?: number;
  title: string;
};

export type RecommendationAggregate = RecommendationMediaIdentity & {
  averageCompletionRatioBps?: number;
  completedCount?: number;
  lastEventAtMs?: number;
  lastPositiveEventAtMs?: number;
  playNextCount?: number;
  queueAddedCount?: number;
  queueRemovedCount?: number;
  replayedCount?: number;
  scopeType: "account" | "room_session";
  skippedCount?: number;
  sourceFailedCount?: number;
};

export type RecommendationPreference = RecommendationMediaIdentity & {
  state: "liked" | "neutral";
};

export type RecommendationSignals = {
  averageCompletionRatioBps: number;
  completedCount: number;
  lastPositiveEventAtMs: number | null;
  playNextCount: number;
  preferenceState: "liked" | "neutral";
  queueAddedCount: number;
  queueRemovedCount: number;
  replayedCount: number;
  roomPositiveCount: number;
  skippedCount: number;
  sourceFailedCount: number;
};

export type RecommendationWeights = {
  activeContributor: number;
  artistDiversityPenalty: number;
  channelDiversityPenalty: number;
  completionPerEvent: number;
  completionRatioHigh: number;
  completionRatioMedium: number;
  currentArtist: number;
  currentChannel: number;
  currentPlaylist: number;
  explicitLike: number;
  freshCandidate: number;
  playNextPerEvent: number;
  queueAddedPerEvent: number;
  queueRemovedPenaltyPerEvent: number;
  recentInteraction: number;
  replayPerEvent: number;
  roomPositivePerEvent: number;
  skipPenaltyPerEvent: number;
  sourceDiversityPenalty: number;
};

export const defaultRecommendationWeights: RecommendationWeights = {
  activeContributor: 25,
  artistDiversityPenalty: 50,
  channelDiversityPenalty: 30,
  completionPerEvent: 25,
  completionRatioHigh: 50,
  completionRatioMedium: 25,
  currentArtist: 70,
  currentChannel: 45,
  currentPlaylist: 30,
  explicitLike: 400,
  freshCandidate: 20,
  playNextPerEvent: 30,
  queueAddedPerEvent: 10,
  queueRemovedPenaltyPerEvent: 35,
  recentInteraction: 30,
  replayPerEvent: 55,
  roomPositivePerEvent: 15,
  skipPenaltyPerEvent: 45,
  sourceDiversityPenalty: 10,
};

export type RecommendationScoreComponents = {
  completionAffinity: number;
  contributorContext: number;
  diversityPenalty: number;
  freshness: number;
  intentionalQueueAffinity: number;
  likeAffinity: number;
  recency: number;
  removePenalty: number;
  replayAffinity: number;
  roomAffinity: number;
  similarity: number;
  skipPenalty: number;
};

export type RecommendationReasonCode =
  | "active_contributor"
  | "available_candidate"
  | "completed_often"
  | "explicit_like"
  | "fresh_candidate"
  | "high_completion"
  | "play_next"
  | "recent_activity"
  | "replayed"
  | "room_affinity"
  | "similar_artist"
  | "similar_channel"
  | "same_playlist";

export type RecommendationReason = {
  code: RecommendationReasonCode;
  label: string;
};

export type RecommendationScore = {
  components: RecommendationScoreComponents;
  reasons: RecommendationReason[];
  totalScore: number;
};

export function scoreRecommendationCandidate({
  activeContributorMemberIds,
  candidate,
  currentMedia,
  nowMs,
  signals,
  weights,
}: {
  activeContributorMemberIds: ReadonlySet<string>;
  candidate: RecommendationCandidate;
  currentMedia?: Pick<
    RecommendationCandidate,
    "artist" | "channelName" | "playlistId"
  >;
  nowMs: number;
  signals: RecommendationSignals;
  weights: RecommendationWeights;
}): RecommendationScore {
  const reasons: RecommendationReason[] = [];
  const likeAffinity =
    signals.preferenceState === "liked" ? weights.explicitLike : 0;

  if (likeAffinity > 0) {
    reasons.push({
      code: "explicit_like",
      label: "You liked this in Mistake Watch",
    });
  }

  const replayAffinity = Math.min(
    weights.replayPerEvent * signals.replayedCount,
    weights.replayPerEvent * 4,
  );

  if (replayAffinity > 0) {
    reasons.push({ code: "replayed", label: "Replayed in Mistake Watch" });
  }

  const completionRatioBonus =
    signals.averageCompletionRatioBps >= 9_000
      ? weights.completionRatioHigh
      : signals.averageCompletionRatioBps >= 7_500
        ? weights.completionRatioMedium
        : 0;
  const completionAffinity = Math.min(
    weights.completionPerEvent * signals.completedCount + completionRatioBonus,
    weights.completionPerEvent * 6 + weights.completionRatioHigh,
  );

  if (signals.completedCount > 0) {
    reasons.push({ code: "completed_often", label: "Previously completed" });
  }
  if (completionRatioBonus > 0) {
    reasons.push({ code: "high_completion", label: "High completion history" });
  }

  const intentionalQueueAffinity = Math.min(
    weights.playNextPerEvent * Math.min(signals.playNextCount, 3) +
      weights.queueAddedPerEvent * Math.min(signals.queueAddedCount, 6),
    weights.playNextPerEvent * 3 + weights.queueAddedPerEvent * 6,
  );

  if (signals.playNextCount > 0) {
    reasons.push({
      code: "play_next",
      label: "Previously chosen to play next",
    });
  }

  const roomAffinity = Math.min(
    weights.roomPositivePerEvent * signals.roomPositiveCount,
    weights.roomPositivePerEvent * 4,
  );

  if (roomAffinity > 0) {
    reasons.push({
      code: "room_affinity",
      label: "Previously chosen in this room",
    });
  }

  const similarity = scoreSimilarity(candidate, currentMedia, weights, reasons);
  const contributorContext =
    candidate.contributorMemberId &&
    activeContributorMemberIds.has(candidate.contributorMemberId)
      ? weights.activeContributor
      : 0;

  if (contributorContext > 0) {
    reasons.push({
      code: "active_contributor",
      label: "Added by an active room contributor",
    });
  }

  const positiveHistoryCount =
    signals.completedCount +
    signals.playNextCount +
    signals.queueAddedCount +
    signals.replayedCount;
  const recency =
    positiveHistoryCount > 0
      ? scoreRecency(signals.lastPositiveEventAtMs, nowMs, weights)
      : 0;

  if (recency > 0) {
    reasons.push({ code: "recent_activity", label: "Recent room activity" });
  }

  const hasHistory =
    positiveHistoryCount + signals.queueRemovedCount + signals.skippedCount > 0;
  const freshness = hasHistory ? 0 : weights.freshCandidate;

  if (freshness > 0) {
    reasons.push({ code: "fresh_candidate", label: "No recent room history" });
  }

  const skipPenalty = -Math.min(
    weights.skipPenaltyPerEvent * signals.skippedCount,
    weights.skipPenaltyPerEvent * 4,
  );
  const removePenalty = -Math.min(
    weights.queueRemovedPenaltyPerEvent * signals.queueRemovedCount,
    weights.queueRemovedPenaltyPerEvent * 4,
  );
  const components: RecommendationScoreComponents = {
    completionAffinity,
    contributorContext,
    diversityPenalty: 0,
    freshness,
    intentionalQueueAffinity,
    likeAffinity,
    recency,
    removePenalty,
    replayAffinity,
    roomAffinity,
    similarity,
    skipPenalty,
  };

  if (reasons.length === 0) {
    reasons.push({
      code: "available_candidate",
      label: "Available for this room",
    });
  }

  return {
    components,
    reasons,
    totalScore: sumComponents(components),
  };
}

export function sumComponents(components: RecommendationScoreComponents) {
  return Object.values(components).reduce((total, value) => total + value, 0);
}

function scoreSimilarity(
  candidate: RecommendationCandidate,
  currentMedia:
    | Pick<RecommendationCandidate, "artist" | "channelName" | "playlistId">
    | undefined,
  weights: RecommendationWeights,
  reasons: RecommendationReason[],
) {
  if (!currentMedia) {
    return 0;
  }

  let score = 0;

  if (sameMetadata(candidate.artist, currentMedia.artist)) {
    score += weights.currentArtist;
    reasons.push({
      code: "similar_artist",
      label: "Matches the current artist",
    });
  }
  if (sameMetadata(candidate.channelName, currentMedia.channelName)) {
    score += weights.currentChannel;
    reasons.push({
      code: "similar_channel",
      label: "Matches the current channel",
    });
  }
  if (sameMetadata(candidate.playlistId, currentMedia.playlistId)) {
    score += weights.currentPlaylist;
    reasons.push({ code: "same_playlist", label: "From the current playlist" });
  }

  return Math.min(score, 90);
}

function scoreRecency(
  lastEventAtMs: number | null,
  nowMs: number,
  weights: RecommendationWeights,
) {
  if (lastEventAtMs === null || lastEventAtMs > nowMs) {
    return 0;
  }

  const ageDays = (nowMs - lastEventAtMs) / (24 * 60 * 60 * 1_000);

  if (ageDays <= 7) {
    return weights.recentInteraction;
  }
  if (ageDays <= 30) {
    return Math.floor(weights.recentInteraction / 2);
  }

  return 0;
}

function sameMetadata(first?: string, second?: string) {
  const normalizedFirst = first?.trim().toLowerCase();
  const normalizedSecond = second?.trim().toLowerCase();
  return Boolean(
    normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond,
  );
}
