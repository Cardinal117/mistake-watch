import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { createPersonalDiscoverReader, parseDiscoverProjection } =
  await loadRecommendationModule("discover-service-core.ts");
const row = {
  mediaId: "track029abc",
  sourceType: "youtube",
  completedPlayCount: 3,
  lastCompletedAt: "2026-09-01T10:00:00Z",
  liked: true,
};
const projection = { items: [row], feedback: [], countWindowDays: 180 };

test("Discover hydrates known identities without creating provider recommendations", async () => {
  const requested = [];
  const reader = createPersonalDiscoverReader(
    async () => projection,
    async (id) => {
      requested.push(id);
      return {
        status: "available",
        metadata: {
          title: "Existing favourite",
          channelTitle: "Artist",
          thumbnailUrl: "https://i.ytimg.com/vi/track029abc/hqdefault.jpg",
          durationSeconds: 123,
        },
        availability: { playable: true },
      };
    },
  );
  const result = await reader();
  assert.deepEqual(requested, [row.mediaId]);
  assert.equal(result.items[0].title, "Existing favourite");
  assert.equal(result.items[0].completedPlayCount, 3);
  assert.equal(result.items[0].liked, true);
});

test("Discover metadata failure is explicit and unavailable recordings are excluded", async () => {
  const failed = createPersonalDiscoverReader(
    async () => projection,
    async () => {
      throw new Error("offline");
    },
  );
  assert.equal((await failed()).items[0].title, "Title unavailable");
  const unavailable = createPersonalDiscoverReader(
    async () => projection,
    async () => ({
      status: "not-found",
      metadata: null,
      availability: { playable: false },
    }),
  );
  assert.equal((await unavailable()).items.length, 0);
});

test("Discover respects the eight-request metadata concurrency bound", async () => {
  let running = 0,
    maximum = 0;
  const reader = createPersonalDiscoverReader(
    async () => ({
      ...projection,
      items: Array.from({ length: 24 }, (_, n) => ({
        ...row,
        mediaId: `track029-${n}`,
      })),
    }),
    async () => {
      running++;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 2));
      running--;
      return {
        status: "unavailable",
        metadata: null,
        availability: { playable: true },
      };
    },
  );
  assert.equal((await reader()).items.length, 24);
  assert.ok(maximum <= 8);
});

test("Discover malformed or oversized durable results fail closed", () => {
  for (const value of [
    null,
    {},
    { ...projection, countWindowDays: 999 },
    { ...projection, items: Array(25).fill(row) },
    { ...projection, items: [{ ...row, sourceType: "uploaded" }] },
    { ...projection, items: [{ ...row, completedPlayCount: -1 }] },
    {
      ...projection,
      feedback: [
        {
          mediaId: row.mediaId,
          state: "do_not_suggest",
          revision: 1,
          expiresAt: null,
          userId: "private",
        },
      ],
    },
  ])
    assert.throws(() => parseDiscoverProjection(value));
});
