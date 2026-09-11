import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { parseDiscoverProjection } = await loadRecommendationModule(
  "discover-service-core.ts",
);
const row = {
  mediaId: "track029abc",
  sourceType: "youtube",
  completedPlayCount: 3,
  lastCompletedAt: "2026-09-01T10:00:00Z",
  liked: true,
};
const projection = { items: [row], feedback: [], countWindowDays: 180 };

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
