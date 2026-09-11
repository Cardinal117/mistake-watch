import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const {
  runCatalogueWorker,
  normalizeCatalogueVideos,
  catalogueDailyLimit,
  maintainBeforeRoomDrain,
} = await loadRecommendationModule("catalogue-worker-core.ts");
const token = "03000000-0000-4000-8000-000000000001";
const ids = ["catalogue01", "catalogue02"];
const publicVideo = {
  id: ids[0],
  status: {
    privacyStatus: "public",
    embeddable: true,
    uploadStatus: "processed",
  },
  snippet: {
    title: "Provider title",
    channelTitle: "Channel",
    thumbnails: {
      high: { url: "https://i.ytimg.com/vi/catalogue01/hqdefault.jpg" },
    },
  },
  contentDetails: { duration: "PT3M" },
  statistics: { likeCount: "42", viewCount: "1000" },
};
const duration = (input) => (input === "PT3M" ? 180 : null);
test("Catalogue admission requires explicit public, embeddable and processed status", () => {
  const result = normalizeCatalogueVideos(
    { items: [publicVideo] },
    ids,
    duration,
  );
  assert.equal(result[0].status, "public");
  assert.equal(result[0].title, "Provider title");
  assert.equal(result[1].status, "unavailable");
  for (const status of [
    { ...publicVideo.status, privacyStatus: "unlisted" },
    { ...publicVideo.status, privacyStatus: "private" },
    { embeddable: true },
    { ...publicVideo.status, embeddable: false },
    { ...publicVideo.status, uploadStatus: "rejected" },
  ]) {
    assert.equal(
      normalizeCatalogueVideos(
        { items: [{ ...publicVideo, status }] },
        [ids[0]],
        duration,
      )[0].status,
      "unavailable",
    );
  }
});
test("Malformed or foreign provider identities cannot evict unrelated cached records", () => {
  for (const payload of [
    {},
    { items: [publicVideo, publicVideo] },
    { items: [{ ...publicVideo, id: "otherUser01" }] },
  ])
    assert.throws(() => normalizeCatalogueVideos(payload, ids, duration));
});

test("Unprocessed and explicitly restricted sources are excluded without changing manual playback", () => {
  for (const row of [
    {
      ...publicVideo,
      status: { ...publicVideo.status, uploadStatus: "uploaded" },
    },
    { ...publicVideo, contentDetails: { regionRestriction: { allowed: [] } } },
    {
      ...publicVideo,
      contentDetails: { regionRestriction: { blocked: ["ZA"] } },
    },
    {
      ...publicVideo,
      contentDetails: { contentRating: { ytRating: "ytAgeRestricted" } },
    },
  ]) {
    assert.equal(
      normalizeCatalogueVideos({ items: [row] }, [ids[0]], duration)[0].status,
      "unavailable",
    );
  }
});
test("One claimed batch is fetched and completed; failure does not renew metadata", async () => {
  const calls = [];
  const result = await runCatalogueWorker({
    prune: async () => {
      calls.push("prune");
      return {};
    },
    claim: async (limit) => {
      calls.push(["claim", limit]);
      return { leaseToken: token, videoIds: ids, budgetExhausted: false };
    },
    fetchBatch: async (batch) => {
      calls.push(["fetch", batch]);
      throw new Error("secret URL should not escape");
    },
    complete: async (lease, rows) => {
      calls.push(["complete", lease, rows]);
      return {};
    },
  });
  assert.equal(result.requested, 2);
  assert.deepEqual(calls, [
    "prune",
    ["claim", 100],
    ["fetch", ids],
    [
      "complete",
      token,
      ids.map((mediaId) => ({ mediaId, status: "transient_failure" })),
    ],
  ]);
});
test("Disabled and exhausted workers still prune without a provider request", async () => {
  for (const limit of [0, 1]) {
    let pruned = 0,
      fetched = 0;
    const result = await runCatalogueWorker(
      {
        prune: async () => ++pruned,
        claim: async () => ({
          videoIds: [],
          leaseToken: null,
          budgetExhausted: true,
        }),
        fetchBatch: async () => {
          fetched++;
          return [];
        },
        complete: async () => assert.fail("no work"),
      },
      limit,
    );
    assert.equal(pruned, 1);
    assert.equal(fetched, 0);
    assert.equal(result.status, limit ? "budget-exhausted" : "disabled");
  }
});
test("Maintenance executes before a failed room transport", async () => {
  let cleaned = false;
  await assert.rejects(
    maintainBeforeRoomDrain(
      async () => {
        cleaned = true;
      },
      async () => {
        throw new Error("transport");
      },
    ),
  );
  assert.equal(cleaned, true);
});
test("Catalogue failure cannot prevent trusted room-event persistence", async () => {
  let drained = false;
  await assert.rejects(
    maintainBeforeRoomDrain(
      async () => {
        throw new Error("catalogue unavailable");
      },
      async () => {
        drained = true;
        return {};
      },
    ),
  );
  assert.equal(drained, true);
});
test("Global worker configuration cannot exceed the database budget", () => {
  assert.equal(catalogueDailyLimit(undefined), 100);
  assert.equal(catalogueDailyLimit("500"), 100);
  assert.equal(catalogueDailyLimit("20"), 20);
  assert.equal(catalogueDailyLimit("invalid"), 0);
  assert.equal(catalogueDailyLimit("-1"), 0);
});
