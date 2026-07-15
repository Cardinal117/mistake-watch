import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  aggregateFor,
  deterministicCandidates,
  loadRanker,
  preferenceFor,
  rankingContext,
} from "./ranking-test-helpers.mjs";

const rankRecommendations = await loadRanker();

test("500-candidate deterministic ranking stays within the 50 ms p95 budget", (t) => {
  const candidates = deterministicCandidates(500);
  const aggregates = candidates.flatMap((item, index) => [
    aggregateFor(item, {
      averageCompletionRatioBps: 7_000 + (index % 30) * 100,
      completedCount: index % 8,
      lastEventAtMs: 1_799_000_000_000 + index * 1_000,
      lastPositiveEventAtMs: 1_799_000_000_000 + index * 1_000,
      playNextCount: index % 4,
      queueAddedCount: index % 11,
      queueRemovedCount: index % 3,
      replayedCount: index % 2,
      skippedCount: index % 5,
      sourceFailedCount: index % 7,
    }),
    aggregateFor(item, {
      completedCount: index % 3,
      lastEventAtMs: 1_798_000_000_000 + index * 1_000,
      lastPositiveEventAtMs: 1_798_000_000_000 + index * 1_000,
      scopeType: "room_session",
    }),
  ]);
  const preferences = candidates
    .filter((_item, index) => index % 17 === 0)
    .map((item) => preferenceFor(item));
  const input = {
    aggregates,
    candidates,
    context: rankingContext({
      activeContributorMemberIds: ["member-1", "member-4", "member-7"],
      currentMedia: {
        artist: "Artist 7",
        channelName: "Channel 7",
        mediaId: "current-fixture",
        playlistId: "playlist-7",
        sourceType: "youtube",
      },
      queuedMedia: candidates.slice(0, 8),
      recentHistory: candidates.slice(8, 20),
    }),
    limit: 100,
    preferences,
  };

  for (let index = 0; index < 12; index += 1) {
    rankRecommendations(input);
  }

  const samples = [];
  for (let index = 0; index < 60; index += 1) {
    const startedAt = performance.now();
    const result = rankRecommendations(input);
    samples.push(performance.now() - startedAt);
    assert.equal(result.ranked.length, 100);
  }

  samples.sort((left, right) => left - right);
  const percentileIndex = Math.ceil(samples.length * 0.95) - 1;
  const p95 = samples[percentileIndex];

  t.diagnostic(`500-candidate ranking p95: ${p95.toFixed(2)} ms`);

  assert.ok(
    p95 <= 50,
    `expected 500-candidate p95 <= 50 ms, measured ${p95.toFixed(2)} ms`,
  );
});
