import assert from "node:assert/strict";
import test from "node:test";

import { loadTypeScript } from "./persistence-test-helpers.mjs";

const reconciliation = await loadTypeScript(
  "lib/recommendations/media-preference-reconciliation.ts",
);

test("authoritative preference snapshots update and remove non-pending state", () => {
  const current = reconciliation.indexMediaPreferences([
    preference("youtube:old", true, 1),
    preference("youtube:changed", false, 1),
  ]);
  const incoming = reconciliation.indexMediaPreferences([
    preference("youtube:changed", true, 2),
    preference("youtube:new", true, 1),
  ]);

  const result = reconciliation.reconcileMediaPreferences({
    current,
    incoming,
    pendingKeys: new Set(),
  });

  assert.equal(result.changed, true);
  assert.deepEqual(Object.keys(result.preferences).sort(), [
    "youtube:changed",
    "youtube:new",
  ]);
  assert.equal(result.preferences["youtube:changed"].liked, true);
  assert.equal(result.preferences["youtube:changed"].revision, 2);
});

test("reconciliation preserves optimistic preferences while mutation is pending", () => {
  const optimistic = preference("youtube:pending", true, 3);
  const current = reconciliation.indexMediaPreferences([optimistic]);
  const incoming = reconciliation.indexMediaPreferences([
    preference("youtube:pending", false, 2),
  ]);

  const result = reconciliation.reconcileMediaPreferences({
    current,
    incoming,
    pendingKeys: new Set(["youtube:pending"]),
  });

  assert.equal(result.changed, false);
  assert.equal(result.preferences, current);
  assert.equal(result.preferences["youtube:pending"], optimistic);
});

test("identical snapshots preserve reference stability", () => {
  const current = reconciliation.indexMediaPreferences([
    preference("youtube:same", true, 4),
  ]);
  const incoming = reconciliation.indexMediaPreferences([
    preference("youtube:same", true, 4),
  ]);

  const result = reconciliation.reconcileMediaPreferences({
    current,
    incoming,
    pendingKeys: new Set(),
  });

  assert.equal(result.changed, false);
  assert.equal(result.preferences, current);
});

test("stale room, request, and mutation snapshots are rejected", () => {
  const base = {
    currentMutationGeneration: 4,
    currentRoomId: "room-a",
    latestRequestSequence: 8,
    requestMutationGeneration: 4,
    requestRoomId: "room-a",
    requestSequence: 8,
  };

  assert.equal(reconciliation.shouldApplyPreferenceSnapshot(base), true);
  assert.equal(
    reconciliation.shouldApplyPreferenceSnapshot({
      ...base,
      requestRoomId: "room-b",
    }),
    false,
  );
  assert.equal(
    reconciliation.shouldApplyPreferenceSnapshot({
      ...base,
      requestSequence: 7,
    }),
    false,
  );
  assert.equal(
    reconciliation.shouldApplyPreferenceSnapshot({
      ...base,
      requestMutationGeneration: 3,
    }),
    false,
  );
});

function preference(mediaKey, liked, revision) {
  const [sourceType, mediaId] = mediaKey.split(":");

  return { liked, mediaId, mediaKey, revision, sourceType };
}
