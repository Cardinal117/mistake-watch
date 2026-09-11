import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";

const {
  normalizeDiscoverMutation,
  normalizeDiscoverRoomId,
  isDiscoverSuppressed,
} = await loadRecommendationModule("discover-contracts.ts");
const roomId = "02900000-0000-4000-8000-000000000001";
const base = {
  roomId,
  mediaId: "track029abc",
  actionId: "action-029",
  kind: "shown",
  surface: "recommended",
};

test("Decision correlation accepts only opaque recommended-surface IDs", () => {
  const decisionId = "03000000-0000-4000-8000-000000000001";
  assert.equal(
    normalizeDiscoverMutation({ ...base, decisionId }).decisionId,
    decisionId,
  );
  for (const extra of [
    { decisionId: "https://private.example" },
    { decisionId, surface: "regulars" },
    { decisionId, reason: "fabricated" },
  ])
    assert.equal(normalizeDiscoverMutation({ ...base, ...extra }), null);
});

test("Discover accepts bounded observations without asserting trusted playback", () => {
  for (const kind of [
    "shown",
    "add_requested",
    "queue_observed",
    "play_requested",
    "play_next_requested",
  ])
    assert.deepEqual(normalizeDiscoverMutation({ ...base, kind }), {
      ...base,
      kind,
    });
  assert.equal(normalizeDiscoverRoomId(roomId), roomId);
});

test("Discover denies forged identities, URLs, unknown actions and extra state", () => {
  for (const extra of [
    { userId: roomId },
    { sourceUrl: "https://private.test" },
    { state: "do_not_suggest" },
    { expectedRevision: 0 },
    { kind: "playback_completed" },
    { surface: "shared" },
    { mediaId: "https://youtube.com" },
    { actionId: "x".repeat(81) },
  ])
    assert.equal(normalizeDiscoverMutation({ ...base, ...extra }), null);
});

test("Discover feedback and undo require an explicit valid revision", () => {
  for (const state of ["neutral", "not_now", "do_not_suggest", "wrong_version"])
    assert.equal(
      normalizeDiscoverMutation({
        ...base,
        kind: "feedback",
        state,
        expectedRevision: 2,
      }).state,
      state,
    );
  for (const expectedRevision of [
    undefined,
    -1,
    0.5,
    "1",
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.equal(
      normalizeDiscoverMutation({
        ...base,
        kind: "feedback",
        state: "neutral",
        expectedRevision,
      }),
      null,
    );
});

test("Snooze expires, explicit video exclusions persist, and unlike is not suppression", () => {
  const now = Date.parse("2026-09-09T10:00:00Z");
  assert.equal(
    isDiscoverSuppressed({ state: "neutral", expiresAt: null }, now),
    false,
  );
  assert.equal(
    isDiscoverSuppressed({ state: "do_not_suggest", expiresAt: null }, now),
    true,
  );
  assert.equal(
    isDiscoverSuppressed({ state: "wrong_version", expiresAt: null }, now),
    true,
  );
  assert.equal(
    isDiscoverSuppressed(
      { state: "not_now", expiresAt: "2026-09-09T09:59:59Z" },
      now,
    ),
    false,
  );
  assert.equal(
    isDiscoverSuppressed(
      { state: "not_now", expiresAt: "2026-09-16T10:00:00Z" },
      now,
    ),
    true,
  );
});
