import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { createPersonalDiscoverReader } = await loadRecommendationModule(
  "discover-service-core.ts",
);
const now = Date.now();
const row = {
  mediaId: "catalogue001",
  sourceType: "youtube",
  liked: true,
  completedPlayCount: 3,
  lastCompletedAt: new Date(now - 864000000).toISOString(),
};
const metadata = {
  mediaId: row.mediaId,
  title: "Saved favourite",
  channelTitle: "Provider channel",
  durationSeconds: 180,
  thumbnailUrl: "https://i.ytimg.com/vi/catalogue001/hqdefault.jpg",
  fetchedAt: new Date(now - 1000).toISOString(),
  expiresAt: new Date(now + 86400000).toISOString(),
};
function snapshot(overrides = {}) {
  return {
    items: [row],
    feedback: [],
    countWindowDays: 180,
    candidates: [{ ...row, choiceCount: 0, lastChoiceAt: null }],
    metadata: [metadata],
    catalogue: { readyCount: 1, pendingCount: 0 },
    ...overrides,
  };
}

test("Personal catalogue read uses cached metadata and never calls foreground providers", async () => {
  let providerCalls = 0;
  const result = await createPersonalDiscoverReader(
    async () => snapshot(),
    async () => {
      providerCalls++;
      throw new Error("provider must not be called");
    },
  )();
  assert.equal(providerCalls, 0);
  assert.equal(result.items[0].title, "Saved favourite");
  assert.equal(result.recommendations[0].reason.code, "liked");
  assert.equal(result.recommendations[0].metadataExpiresAt, metadata.expiresAt);
});

test("Expired or missing metadata cannot become recommendations or stale regulars", async () => {
  const expired = {
    ...metadata,
    fetchedAt: new Date(now - 86400000).toISOString(),
    expiresAt: new Date(now - 1).toISOString(),
  };
  for (const rows of [[], [expired]]) {
    const result = await createPersonalDiscoverReader(async () =>
      snapshot({ metadata: rows }),
    )();
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.recommendations, []);
  }
});

test("Current durable exclusions take precedence over cached catalogue rows", async () => {
  for (const state of ["do_not_suggest", "wrong_version", "not_now"]) {
    const feedback = [
      {
        mediaId: row.mediaId,
        state,
        revision: 1,
        expiresAt:
          state === "not_now" ? new Date(now + 86400000).toISOString() : null,
      },
    ];
    const result = await createPersonalDiscoverReader(async () =>
      snapshot({ feedback }),
    )();
    assert.deepEqual(result.recommendations, []);
    assert.deepEqual(result.items, []);
  }
});

test("Reasons distinguish explicit choice from mere recorded history", async () => {
  const base = { ...row, liked: false };
  for (const [choiceCount, code] of [
    [2, "chosen"],
    [0, "history"],
  ]) {
    const result = await createPersonalDiscoverReader(async () =>
      snapshot({
        candidates: [
          {
            ...base,
            choiceCount,
            lastChoiceAt: choiceCount
              ? new Date(now - 5000).toISOString()
              : null,
          },
        ],
      }),
    )();
    assert.equal(result.recommendations[0].reason.code, code);
  }
});

test("Malformed catalogue data fails closed rather than using legacy search", async () => {
  for (const input of [
    snapshot({ candidates: Array(97).fill(row) }),
    snapshot({
      metadata: [
        { ...metadata, thumbnailUrl: "https://private.example/secret" },
      ],
    }),
    snapshot({
      metadata: [
        { ...metadata, fetchedAt: new Date(now + 86400000).toISOString() },
      ],
    }),
    snapshot({ candidates: [{ ...row, choiceCount: -1, lastChoiceAt: null }] }),
  ]) {
    await assert.rejects(createPersonalDiscoverReader(async () => input)());
  }
});
