import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  candidate,
  loadRecommendationModule,
  rankingContext,
} from "./ranking-test-helpers.mjs";

const { BoundedTtlCache } = await loadRecommendationModule("bounded-cache.ts");
const { createRoomRecommendationService } = await loadRecommendationModule(
  "room-service-core.ts",
);

test("room service ranks bounded URL-free candidates for authorized principals", async () => {
  for (const kind of ["guest", "account", "owner"]) {
    const fixture = serviceFixture({ identityKey: `${kind}:identity` });
    const response = await fixture.service.getRecommendations({
      access: fixture.access,
      request: recommendationRequest(),
    });

    assert.equal(response.status, "available");
    assert.equal(response.items.length, 1);
    assertNoPrivateFields(response);
  }
});

test("cross-room contexts fail before aggregate and candidate reads", async () => {
  const fixture = serviceFixture();
  const response = await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest({ roomId: ROOM_B }),
  });

  assert.equal(response.status, "unavailable");
  assert.equal(fixture.calls.aggregates, 0);
  assert.equal(fixture.calls.preferences, 0);
  assert.equal(fixture.calls.uploads, 0);
});

test("private uploaded candidates are excluded without diagnostic leakage", async () => {
  const privateAssetId = "06f55f38-2f03-4a10-95b5-f343e6db8cc7";
  const fixture = serviceFixture({
    candidates: [
      candidate(1),
      {
        candidateId: privateAssetId,
        mediaId: privateAssetId,
        sourceType: "uploaded",
        title: "Private upload title",
      },
    ],
  });
  const response = await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest({ candidates: fixture.candidates }),
  });
  const serialized = JSON.stringify(response);

  assert.equal(response.items.length, 1);
  assert.doesNotMatch(serialized, new RegExp(privateAssetId, "i"));
  assert.doesNotMatch(serialized, /Private upload title/i);
  assertNoPrivateFields(response);
});

test("Like remains the strongest service-level preference signal", async () => {
  const liked = candidate(1);
  const inferred = candidate(2);
  const fixture = serviceFixture({
    aggregates: [
      {
        completedCount: 4,
        mediaId: inferred.mediaId,
        replayedCount: 2,
        scopeType: "account",
        sourceType: inferred.sourceType,
      },
    ],
    candidates: [inferred, liked],
    preferences: [
      {
        mediaId: liked.mediaId,
        sourceType: liked.sourceType,
        state: "liked",
      },
    ],
  });
  const response = await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest({ candidates: fixture.candidates }),
  });

  assert.equal(response.items[0].candidateId, liked.candidateId);
  assert.equal(response.items[0].reasons[0].code, "explicit_like");
});

test("cache keys isolate identity, room, and revision", async () => {
  const fixture = serviceFixture();

  await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest(),
  });
  const hit = await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest(),
  });
  await fixture.service.getRecommendations({
    access: fixture.access,
    request: recommendationRequest({ revision: "room-2" }),
  });
  await fixture.service.getRecommendations({
    access: { ...fixture.access, identityKey: "guest:other" },
    request: recommendationRequest({ revision: "room-2" }),
  });

  assert.equal(hit.cache, "hit");
  assert.equal(fixture.calls.aggregates, 3);
});

test("session preferences override durable state and invalidate warm ranking", async () => {
  const durableLiked = candidate(1);
  const sessionLiked = candidate(2);
  const fixture = serviceFixture({
    candidates: [durableLiked, sessionLiked],
    preferences: [
      {
        mediaId: durableLiked.mediaId,
        sourceType: durableLiked.sourceType,
        state: "liked",
      },
    ],
  });
  const request = recommendationRequest({ candidates: fixture.candidates });
  const durableResponse = await fixture.service.getRecommendations({
    access: fixture.access,
    request,
  });
  const sessionResponse = await fixture.service.getRecommendations({
    access: fixture.access,
    request,
    sessionPreferences: [
      {
        mediaId: durableLiked.mediaId,
        sourceType: durableLiked.sourceType,
        state: "neutral",
      },
      {
        mediaId: sessionLiked.mediaId,
        sourceType: sessionLiked.sourceType,
        state: "liked",
      },
    ],
  });

  assert.equal(durableResponse.items[0].candidateId, durableLiked.candidateId);
  assert.equal(sessionResponse.items[0].candidateId, sessionLiked.candidateId);
  assert.equal(sessionResponse.cache, "miss");
  assert.equal(fixture.calls.preferences, 2);
});

test("failed reads expire faster than successful entries", async () => {
  let now = 10_000;
  let attempts = 0;
  const service = createRoomRecommendationService({
    cacheOptions: {
      capacity: 4,
      failureTtlMs: 10,
      now: () => now,
      successTtlMs: 100,
    },
    loadAggregates: async () => {
      attempts += 1;
      throw new Error("database unavailable");
    },
    loadPreferences: async () => [],
    loadUploadedAssets: async () => [],
    now: () => now,
  });

  const input = {
    access: recommendationAccess(),
    request: recommendationRequest(),
  };
  assert.equal((await service.getRecommendations(input)).cache, "miss");
  assert.equal((await service.getRecommendations(input)).cache, "hit");
  assert.equal(attempts, 1);

  now += 11;
  assert.equal((await service.getRecommendations(input)).cache, "miss");
  assert.equal(attempts, 2);
});

test("bounded TTL cache evicts least-recently-used entries", () => {
  const cache = new BoundedTtlCache(100, 2, () => 1_000);

  cache.set("a", 1);
  cache.set("b", 2);
  assert.equal(cache.get("a").value, 1);
  cache.set("c", 3);

  assert.equal(cache.size, 2);
  assert.equal(cache.get("b").value, null);
  assert.equal(cache.get("a").value, 1);
});

test("warm authorized service reads stay within the 250 ms p95 budget", async () => {
  const fixture = serviceFixture();
  const input = {
    access: fixture.access,
    request: recommendationRequest(),
  };

  await fixture.service.getRecommendations(input);
  const samples = [];

  for (let index = 0; index < 50; index += 1) {
    const startedAt = performance.now();
    await fixture.service.getRecommendations(input);
    samples.push(performance.now() - startedAt);
  }

  samples.sort((left, right) => left - right);
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  assert.ok(p95 <= 250, `expected p95 <= 250 ms, received ${p95} ms`);
  assert.equal(fixture.calls.aggregates, 1);
});

function serviceFixture(overrides = {}) {
  const calls = { aggregates: 0, preferences: 0, uploads: 0 };
  const candidates = overrides.candidates ?? [candidate(1)];
  const access = recommendationAccess(overrides);
  const service = createRoomRecommendationService({
    cacheOptions: { capacity: 8, successTtlMs: 1_000 },
    loadAggregates: async () => {
      calls.aggregates += 1;
      return overrides.aggregates ?? [];
    },
    loadPreferences: async () => {
      calls.preferences += 1;
      return overrides.preferences ?? [];
    },
    loadUploadedAssets: async () => {
      calls.uploads += 1;
      return overrides.uploadedAssets ?? [];
    },
    now: () => rankingContext().nowMs,
  });

  return { access, calls, candidates, service };
}

function recommendationAccess(overrides = {}) {
  return {
    accountUserId: null,
    catalogueScope: "none",
    identityKey: overrides.identityKey ?? "guest:identity",
    roomId: ROOM_A,
  };
}

function recommendationRequest(overrides = {}) {
  return {
    candidates: [candidate(1)],
    limit: 8,
    queuedMedia: [],
    recentHistory: [],
    revision: "room-1",
    roomId: ROOM_A,
    ...overrides,
  };
}

function assertNoPrivateFields(value) {
  assert.doesNotMatch(
    JSON.stringify(value),
    /email|oauth|token|guestIdentityId|userId|sourceUrl|signedUrl|publicUrl|r2Url|https?:/i,
  );
}

const ROOM_A = "00000000-0000-4000-8000-000000000003";
const ROOM_B = "00000000-0000-4000-8000-000000000004";
