import assert from "node:assert/strict";
import test from "node:test";

import { loadRecommendationModule } from "./ranking-test-helpers.mjs";

const { filterDurablePreferencesForAccess } = await loadRecommendationModule(
  "preference-policy.ts",
);

test("durable preference reads exclude cross-room direct and HLS identities", () => {
  const result = filterDurablePreferencesForAccess({
    accountUserId: ACCOUNT_ID,
    assets: [],
    catalogueScope: "owner",
    preferences: [
      preference("youtube", "hmJPbHVK-co"),
      preference("direct", "queue:room-a-direct"),
      preference("hls", "queue:room-a-hls"),
    ],
  });

  assert.deepEqual(
    result.map((item) => item.sourceType),
    ["youtube"],
  );
});

test("uploaded durable preferences require current catalogue authorization", () => {
  const privateAssetId = "00000000-0000-4000-8000-000000000021";
  const publicAssetId = "00000000-0000-4000-8000-000000000022";
  const assets = [
    asset(privateAssetId, "owner_only", ACCOUNT_ID),
    asset(publicAssetId, "public", "another-owner"),
  ];
  const preferences = [
    preference("uploaded", privateAssetId),
    preference("uploaded", publicAssetId),
  ];

  assert.deepEqual(
    filterDurablePreferencesForAccess({
      accountUserId: null,
      assets,
      catalogueScope: "none",
      preferences,
    }),
    [],
  );
  assert.deepEqual(
    filterDurablePreferencesForAccess({
      accountUserId: "another-account",
      assets,
      catalogueScope: "allowlisted",
      preferences,
    }).map((item) => item.mediaId),
    [publicAssetId],
  );
  assert.deepEqual(
    filterDurablePreferencesForAccess({
      accountUserId: ACCOUNT_ID,
      assets,
      catalogueScope: "owner",
      preferences,
    }).map((item) => item.mediaId),
    [privateAssetId, publicAssetId],
  );
});

function preference(sourceType, mediaId) {
  return { liked: true, mediaId, revision: 0, sourceType };
}

function asset(id, visibility, ownerUserId) {
  return { id, ownerUserId, status: "ready", visibility };
}

const ACCOUNT_ID = "00000000-0000-4000-8000-000000000031";
