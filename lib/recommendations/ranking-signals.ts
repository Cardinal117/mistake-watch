import {
  normalizeRecommendationMediaIdentity,
  recommendationMediaKey,
} from "./media-identity";
import {
  defaultRecommendationWeights,
  type RecommendationAggregate,
  type RecommendationPreference,
  type RecommendationSignals,
  type RecommendationWeights,
} from "./scoring";

type MutableSignals = Omit<RecommendationSignals, "preferenceState">;

type SignalAccumulator = {
  account: MutableSignals;
  hasAccount: boolean;
  hasRoom: boolean;
  room: MutableSignals;
};

export function buildAggregateSignals(aggregates: RecommendationAggregate[]) {
  const accumulators = new Map<string, SignalAccumulator>();

  for (const aggregate of aggregates) {
    const identity = normalizeRecommendationMediaIdentity(aggregate);

    if (
      !identity ||
      !["account", "room_session"].includes(aggregate.scopeType)
    ) {
      continue;
    }

    const mediaKey = recommendationMediaKey(identity);
    const accumulator = accumulators.get(mediaKey) ?? {
      account: emptyMutableSignals(),
      hasAccount: false,
      hasRoom: false,
      room: emptyMutableSignals(),
    };
    const target =
      aggregate.scopeType === "account"
        ? accumulator.account
        : accumulator.room;

    mergeAggregate(target, aggregate);
    accumulator.hasAccount ||= aggregate.scopeType === "account";
    accumulator.hasRoom ||= aggregate.scopeType === "room_session";
    accumulators.set(mediaKey, accumulator);
  }

  return new Map(
    [...accumulators.entries()].map(([mediaKey, accumulator]) => [
      mediaKey,
      composedSignals(accumulator),
    ]),
  );
}

export function buildPreferenceMap(preferences: RecommendationPreference[]) {
  const preferenceByMediaKey = new Map<string, "liked" | "neutral">();

  for (const preference of [...preferences].sort((left, right) => {
    const leftKey = mediaKeyFor(left) ?? "";
    const rightKey = mediaKeyFor(right) ?? "";
    return (
      compareText(leftKey, rightKey) || compareText(left.state, right.state)
    );
  })) {
    const mediaKey = mediaKeyFor(preference);

    if (!mediaKey || !["liked", "neutral"].includes(preference.state)) {
      continue;
    }

    const existing = preferenceByMediaKey.get(mediaKey);
    preferenceByMediaKey.set(
      mediaKey,
      existing === "liked" || preference.state === "liked"
        ? "liked"
        : "neutral",
    );
  }

  return preferenceByMediaKey;
}

export function emptyRecommendationSignals(): RecommendationSignals {
  return { ...emptyMutableSignals(), preferenceState: "neutral" };
}

export function normalizeRecommendationWeights(
  overrides?: Partial<RecommendationWeights>,
) {
  const weights = { ...defaultRecommendationWeights };

  for (const key of Object.keys(weights) as (keyof RecommendationWeights)[]) {
    const override = overrides?.[key];
    if (
      Number.isSafeInteger(override) &&
      override! >= 0 &&
      override! <= 1_000
    ) {
      weights[key] = override!;
    }
  }

  const strongestOtherPositiveComponent = Math.max(
    weights.replayPerEvent * 4,
    weights.completionPerEvent * 6 + weights.completionRatioHigh,
    weights.playNextPerEvent * 3 + weights.queueAddedPerEvent * 6,
    weights.roomPositivePerEvent * 4,
    weights.activeContributor,
    weights.recentInteraction,
    weights.freshCandidate,
    90,
  );
  weights.explicitLike = Math.max(
    weights.explicitLike,
    strongestOtherPositiveComponent + 1,
  );

  return weights;
}

function composedSignals(
  accumulator: SignalAccumulator,
): RecommendationSignals {
  const primary = accumulator.hasAccount
    ? accumulator.account
    : accumulator.room;
  const room = accumulator.room;

  return {
    ...primary,
    lastPositiveEventAtMs: latestTimestamp(
      primary.lastPositiveEventAtMs,
      room.lastPositiveEventAtMs ?? undefined,
    ),
    preferenceState: "neutral",
    queueRemovedCount: accumulator.hasRoom
      ? Math.max(primary.queueRemovedCount, room.queueRemovedCount)
      : primary.queueRemovedCount,
    roomPositiveCount: accumulator.hasRoom
      ? Math.min(
          room.completedCount + room.playNextCount + room.replayedCount,
          10_000,
        )
      : 0,
    skippedCount: accumulator.hasRoom
      ? Math.max(primary.skippedCount, room.skippedCount)
      : primary.skippedCount,
    sourceFailedCount: accumulator.hasRoom
      ? Math.max(primary.sourceFailedCount, room.sourceFailedCount)
      : primary.sourceFailedCount,
  };
}

function mergeAggregate(
  target: MutableSignals,
  aggregate: RecommendationAggregate,
) {
  target.completedCount = addCount(
    target.completedCount,
    aggregate.completedCount,
  );
  target.playNextCount = addCount(
    target.playNextCount,
    aggregate.playNextCount,
  );
  target.queueAddedCount = addCount(
    target.queueAddedCount,
    aggregate.queueAddedCount,
  );
  target.queueRemovedCount = addCount(
    target.queueRemovedCount,
    aggregate.queueRemovedCount,
  );
  target.replayedCount = addCount(
    target.replayedCount,
    aggregate.replayedCount,
  );
  target.skippedCount = addCount(target.skippedCount, aggregate.skippedCount);
  target.sourceFailedCount = addCount(
    target.sourceFailedCount,
    aggregate.sourceFailedCount,
  );
  target.averageCompletionRatioBps = Math.max(
    target.averageCompletionRatioBps,
    boundedInteger(aggregate.averageCompletionRatioBps, 0, 10_000),
  );
  target.lastPositiveEventAtMs = latestTimestamp(
    target.lastPositiveEventAtMs,
    aggregate.lastPositiveEventAtMs,
  );
}

function emptyMutableSignals(): MutableSignals {
  return {
    averageCompletionRatioBps: 0,
    completedCount: 0,
    lastPositiveEventAtMs: null,
    playNextCount: 0,
    queueAddedCount: 0,
    queueRemovedCount: 0,
    replayedCount: 0,
    roomPositiveCount: 0,
    skippedCount: 0,
    sourceFailedCount: 0,
  };
}

function mediaKeyFor(value: { mediaId: string; sourceType: string }) {
  const identity = normalizeRecommendationMediaIdentity(value);
  return identity ? recommendationMediaKey(identity) : null;
}

function boundedInteger(
  value: number | undefined,
  minimum: number,
  maximum = 10_000,
) {
  return Number.isSafeInteger(value) && value! >= minimum && value! <= maximum
    ? value!
    : 0;
}

function addCount(current: number, value?: number) {
  return Math.min(current + boundedCount(value), 10_000);
}

function boundedCount(value: number | undefined) {
  return Number.isSafeInteger(value) && value! >= 0
    ? Math.min(value!, 10_000)
    : 0;
}

function latestTimestamp(current: number | null, value?: number) {
  const normalized = finiteNonnegative(value);
  return normalized === undefined
    ? current
    : Math.max(current ?? 0, normalized);
}

function finiteNonnegative(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}
