import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateFor,
  assertRankedEntry,
  candidate,
  deterministicCandidates,
  loadRanker,
  preferenceFor,
  rankingContext,
  resultByCandidateId,
} from "./ranking-test-helpers.mjs";

const rankRecommendations = await loadRanker();

test("empty and sparse inputs return honest deterministic results", () => {
  assert.deepEqual(
    rankRecommendations({ candidates: [], context: rankingContext() }),
    { exclusions: [], ranked: [] },
  );

  const onlyCandidate = candidate(1);
  const result = rankRecommendations({
    candidates: [onlyCandidate],
    context: rankingContext(),
  });

  assert.equal(result.exclusions.length, 0);
  assert.equal(result.ranked.length, 1);
  assert.equal(
    result.ranked[0].candidate.candidateId,
    onlyCandidate.candidateId,
  );
  assertRankedEntry(result.ranked[0]);
});

test("all hard exclusion classes are applied before scoring", () => {
  const unavailable = candidate(1, { isAvailable: false });
  const unauthorized = candidate(2, {
    catalogueAuthorized: false,
    mediaId: "00000000-0000-4000-8000-000000000002",
    sourceType: "uploaded",
  });
  const current = candidate(3);
  const queued = candidate(4);
  const recent = candidate(5);
  const invalid = candidate(6, { mediaId: "", title: "" });
  const result = rankRecommendations({
    candidates: [unavailable, unauthorized, current, queued, recent, invalid],
    context: rankingContext({
      currentMedia: current,
      queuedMedia: [queued],
      recentHistory: [recent],
    }),
  });

  assert.equal(result.ranked.length, 0);
  assert.deepEqual(
    new Set(result.exclusions.map(({ reason }) => reason)),
    new Set([
      "authorization_incompatible",
      "current_media",
      "invalid_candidate",
      "queued",
      "recent_history",
      "unavailable",
    ]),
  );
});

test("candidate order does not affect byte-stable output", () => {
  const candidates = deterministicCandidates(12);
  const preferences = [
    preferenceFor(candidates[3]),
    preferenceFor(candidates[8]),
  ];
  const aggregates = candidates.map((item, index) =>
    aggregateFor(item, {
      completedCount: index % 3,
      playNextCount: index % 2,
      replayedCount: index % 4 === 0 ? 1 : 0,
    }),
  );
  const input = {
    aggregates,
    candidates,
    context: rankingContext(),
    preferences,
  };
  const reversed = {
    aggregates: [...aggregates].reverse(),
    candidates: [...candidates].reverse(),
    context: rankingContext(),
    preferences: [...preferences].reverse(),
  };

  assert.equal(
    JSON.stringify(rankRecommendations(input)),
    JSON.stringify(rankRecommendations(reversed)),
  );
});

test("Like is stronger than one inferred positive and neutral equals missing", () => {
  const liked = candidate(10);
  const replayed = candidate(11);
  const neutral = candidate(12);
  const missing = candidate(13);
  const result = rankRecommendations({
    aggregates: [aggregateFor(replayed, { replayedCount: 1 })],
    candidates: [missing, neutral, replayed, liked],
    context: rankingContext(),
    preferences: [preferenceFor(liked), preferenceFor(neutral, "neutral")],
  });

  const likedResult = resultByCandidateId(result, liked.candidateId);
  const replayedResult = resultByCandidateId(result, replayed.candidateId);
  const neutralResult = resultByCandidateId(result, neutral.candidateId);
  const missingResult = resultByCandidateId(result, missing.candidateId);

  assert.ok(likedResult.totalScore > replayedResult.totalScore);
  assert.ok(
    likedResult.components.likeAffinity >
      replayedResult.components.replayAffinity,
  );
  assert.equal(neutralResult.components.likeAffinity, 0);
  assert.equal(missingResult.components.likeAffinity, 0);
});

test("Like remains the strongest individual component under custom weights", () => {
  const liked = candidate(14);
  const inferred = candidate(15);
  const result = rankRecommendations({
    aggregates: [aggregateFor(inferred, { replayedCount: 10_000 })],
    candidates: [inferred, liked],
    context: rankingContext(),
    preferences: [preferenceFor(liked)],
    weights: { explicitLike: 1, replayPerEvent: 1_000 },
  });
  const likedResult = resultByCandidateId(result, liked.candidateId);
  const inferredResult = resultByCandidateId(result, inferred.candidateId);

  assert.ok(
    likedResult.components.likeAffinity >
      inferredResult.components.replayAffinity,
  );
});

test("replay, completion, and Play Next are positive ranking signals", () => {
  const baseline = candidate(20);
  const replayed = candidate(21);
  const completed = candidate(22);
  const playNext = candidate(23);
  const result = rankRecommendations({
    aggregates: [
      aggregateFor(replayed, { replayedCount: 1 }),
      aggregateFor(completed, {
        averageCompletionRatioBps: 9_500,
        completedCount: 1,
      }),
      aggregateFor(playNext, { playNextCount: 1 }),
    ],
    candidates: [baseline, replayed, completed, playNext],
    context: rankingContext(),
  });
  const baselineScore = resultByCandidateId(
    result,
    baseline.candidateId,
  ).totalScore;

  for (const positive of [replayed, completed, playNext]) {
    assert.ok(
      resultByCandidateId(result, positive.candidateId).totalScore >
        baselineScore,
      `${positive.candidateId} should receive a positive score`,
    );
  }
  assert.ok(
    resultByCandidateId(result, completed.candidateId).reasons.some(
      ({ label }) => label === "Previously completed",
    ),
  );
  assert.ok(
    resultByCandidateId(result, completed.candidateId).reasons.some(
      ({ label }) => label === "High completion history",
    ),
  );
});

test("skip and remove penalties are negative and bounded", () => {
  const baseline = candidate(30);
  const highPenalty = candidate(31);
  const extremePenalty = candidate(32);
  const result = rankRecommendations({
    aggregates: [
      aggregateFor(highPenalty, {
        queueRemovedCount: 10_000,
        skippedCount: 10_000,
      }),
      aggregateFor(extremePenalty, {
        queueRemovedCount: 1_000_000,
        skippedCount: 1_000_000,
      }),
    ],
    candidates: [baseline, highPenalty, extremePenalty],
    context: rankingContext(),
  });
  const baselineResult = resultByCandidateId(result, baseline.candidateId);
  const highResult = resultByCandidateId(result, highPenalty.candidateId);
  const extremeResult = resultByCandidateId(result, extremePenalty.candidateId);

  assert.ok(highResult.components.skipPenalty < 0);
  assert.ok(highResult.components.removePenalty < 0);
  assert.equal(
    extremeResult.components.skipPenalty,
    highResult.components.skipPenalty,
  );
  assert.equal(
    extremeResult.components.removePenalty,
    highResult.components.removePenalty,
  );
  assert.ok(
    highResult.components.skipPenalty + highResult.components.removePenalty <
      baselineResult.components.skipPenalty +
        baselineResult.components.removePenalty,
  );
});

test("source failures do not alter taste scores", () => {
  const baseline = candidate(40);
  const failed = candidate(41);
  const result = rankRecommendations({
    aggregates: [aggregateFor(failed, { sourceFailedCount: 999_999 })],
    candidates: [baseline, failed],
    context: rankingContext(),
  });

  assert.equal(
    resultByCandidateId(result, failed.candidateId).totalScore,
    resultByCandidateId(result, baseline.candidateId).totalScore,
  );
});

test("negative-only recent activity does not earn a recency boost", () => {
  const skipped = candidate(42);
  const result = rankRecommendations({
    aggregates: [
      aggregateFor(skipped, {
        lastEventAtMs: rankingContext().nowMs - 1_000,
        skippedCount: 1,
      }),
    ],
    candidates: [skipped],
    context: rankingContext(),
  });

  assert.equal(
    resultByCandidateId(result, skipped.candidateId).components.recency,
    0,
  );
});

test("room negatives survive account composition without failure recency", () => {
  const mixed = candidate(43);
  const nowMs = rankingContext().nowMs;
  const result = rankRecommendations({
    aggregates: [
      aggregateFor(mixed, {
        completedCount: 1,
        lastPositiveEventAtMs: nowMs - 60 * 24 * 60 * 60 * 1_000,
      }),
      aggregateFor(mixed, {
        lastEventAtMs: nowMs - 1_000,
        queueRemovedCount: 2,
        scopeType: "room_session",
        skippedCount: 3,
        sourceFailedCount: 1,
      }),
    ],
    candidates: [mixed],
    context: rankingContext(),
  });
  const ranked = resultByCandidateId(result, mixed.candidateId);

  assert.ok(ranked.components.skipPenalty < 0);
  assert.ok(ranked.components.removePenalty < 0);
  assert.equal(ranked.components.recency, 0);
});

test("current-media similarity is factual and raises related candidates", () => {
  const related = candidate(50, {
    artist: "Julien Journet",
    channelName: "Epic Music World",
  });
  const unrelated = candidate(51, {
    artist: "Different Artist",
    channelName: "Different Channel",
  });
  const result = rankRecommendations({
    candidates: [unrelated, related],
    context: rankingContext({
      currentMedia: {
        artist: "Julien Journet",
        channelName: "Epic Music World",
        mediaId: "currently-playing",
        sourceType: "youtube",
      },
    }),
  });

  assert.ok(
    resultByCandidateId(result, related.candidateId).totalScore >
      resultByCandidateId(result, unrelated.candidateId).totalScore,
  );
});

test("greedy diversity prevents one creator filling the top positions", () => {
  const sameCreator = Array.from({ length: 5 }, (_, index) =>
    candidate(60 + index, {
      artist: "Repeated Artist",
      channelName: "Repeated Channel",
    }),
  );
  const alternatives = [
    candidate(70, { artist: "Alternative One", channelName: "Channel One" }),
    candidate(71, { artist: "Alternative Two", channelName: "Channel Two" }),
  ];
  const candidates = [...sameCreator, ...alternatives];
  const result = rankRecommendations({
    candidates,
    context: rankingContext(),
    preferences: candidates.map((item) => preferenceFor(item)),
  });
  const topThreeCreators = result.ranked
    .slice(0, 3)
    .map(({ candidate: item }) => item.artist ?? item.channelName);

  assert.ok(new Set(topThreeCreators).size > 1);
});

test("duplicates and private uploaded candidates are diagnosed, not leaked", () => {
  const original = candidate(80);
  const duplicate = candidate(81, {
    mediaId: original.mediaId,
    sourceType: original.sourceType,
  });
  const privateUpload = candidate(82, {
    catalogueAuthorized: false,
    mediaId: "00000000-0000-4000-8000-000000000082",
    sourceType: "uploaded",
  });
  const unverifiedUpload = candidate(84, {
    mediaId: "00000000-0000-4000-8000-000000000084",
    sourceType: "uploaded",
  });
  const unavailable = candidate(83, { isAvailable: false });
  const result = rankRecommendations({
    candidates: [
      duplicate,
      privateUpload,
      unavailable,
      unverifiedUpload,
      original,
    ],
    context: rankingContext(),
  });

  assert.equal(result.ranked.length, 1);
  assert.equal(result.ranked[0].candidate.candidateId, original.candidateId);
  assert.deepEqual(
    new Set(result.exclusions.map(({ reason }) => reason)),
    new Set(["authorization_incompatible", "duplicate", "unavailable"]),
  );
  assert.equal(
    result.exclusions.filter(
      ({ reason }) => reason === "authorization_incompatible",
    ).length,
    2,
  );
});

test("unauthorized unavailable uploads are redacted before availability", () => {
  const privateMediaId = "00000000-0000-4000-8000-000000000085";
  const privateCandidateId = "private-upload-candidate";
  const result = rankRecommendations({
    candidates: [
      candidate(85, {
        candidateId: privateCandidateId,
        catalogueAuthorized: false,
        isAvailable: false,
        mediaId: privateMediaId,
        sourceType: "uploaded",
      }),
    ],
    context: rankingContext(),
  });

  assert.deepEqual(result, {
    exclusions: [
      { candidateId: "redacted", reason: "authorization_incompatible" },
    ],
    ranked: [],
  });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(privateMediaId));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(privateCandidateId));
});

test("1,000 candidates produce a bounded unique stable ranking", () => {
  const candidates = deterministicCandidates(1_000);
  const input = {
    aggregates: candidates.map((item, index) =>
      aggregateFor(item, {
        completedCount: index % 7,
        playNextCount: index % 5,
        queueRemovedCount: index % 3,
        replayedCount: index % 2,
        skippedCount: index % 4,
      }),
    ),
    candidates,
    context: rankingContext(),
    limit: 1_000,
  };
  const result = rankRecommendations(input);
  const reversed = rankRecommendations({
    ...input,
    aggregates: [...input.aggregates].reverse(),
    candidates: [...candidates].reverse(),
  });
  const mediaKeys = result.ranked.map(({ mediaKey }) => mediaKey);

  assert.equal(result.ranked.length, 100, "result limit must be capped at 100");
  assert.equal(new Set(mediaKeys).size, mediaKeys.length);
  assert.equal(result.exclusions.length, 0);
  assert.deepEqual(result, reversed);
  result.ranked.forEach(assertRankedEntry);
});
