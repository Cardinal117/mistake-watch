import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadRecommendationModule, root } from "./ranking-test-helpers.mjs";

const { normalizePreferenceMutation } = await loadRecommendationModule(
  "preference-contracts.ts",
);
const { normalizeRoomRecommendationRequest } =
  await loadRecommendationModule("room-contracts.ts");

test("room recommendation contract accepts opaque URL-free media", () => {
  const normalized = normalizeRoomRecommendationRequest(validRoomRequest());

  assert.equal(normalized.roomId, ROOM_ID);
  assert.equal(normalized.candidates[0].mediaId, "hmJPbHVK-co");
  assert.equal(normalized.limit, 8);
});

test("room contract rejects URLs and participant-controlled identities", () => {
  for (const forbidden of [
    { sourceUrl: "https://private.example/video" },
    { signedUrl: "https://r2.example/signed" },
    { memberId: "attacker-member" },
    { actorMemberId: "attacker-member" },
    { contributorMemberId: "attacker-member" },
    { userId: "00000000-0000-4000-8000-000000000099" },
    { guestIdentityId: "attacker-guest" },
  ]) {
    assert.equal(
      normalizeRoomRecommendationRequest({
        ...validRoomRequest(),
        ...forbidden,
      }),
      null,
    );
  }
});

test("room contract enforces candidate and context bounds", () => {
  assert.equal(
    normalizeRoomRecommendationRequest({
      ...validRoomRequest(),
      candidates: Array.from(
        { length: 161 },
        () => validRoomRequest().candidates[0],
      ),
    }),
    null,
  );
  assert.equal(
    normalizeRoomRecommendationRequest({
      ...validRoomRequest(),
      queuedMedia: Array.from({ length: 321 }, () => ({
        mediaId: "hmJPbHVK-co",
        sourceType: "youtube",
      })),
    }),
    null,
  );
});

test("preference contract rejects identity fields, URLs, and stale bounds", () => {
  assert.deepEqual(normalizePreferenceMutation(validPreference()), {
    actionId: "action-1",
    expectedRevision: 7,
    liked: true,
    mediaId: "hmJPbHVK-co",
    roomId: ROOM_ID,
    sourceType: "youtube",
  });

  for (const forbidden of [
    { sourceUrl: "https://private.example/video" },
    { memberId: "attacker-member" },
    { userId: "attacker-user" },
    { guestIdentityId: "attacker-guest" },
    { expectedRevision: -1 },
    { expectedRevision: 10_001 },
  ]) {
    assert.equal(
      normalizePreferenceMutation({ ...validPreference(), ...forbidden }),
      null,
    );
  }
});

test("routes resolve identity server-side and return private no-store responses", async () => {
  const [roomRoute, preferenceRoute, authorization] = await Promise.all([
    source("app/api/recommendations/room/route.ts"),
    source("app/api/recommendations/preferences/route.ts"),
    source("lib/recommendations/room-authorization.ts"),
  ]);

  assert.match(roomRoute, /dependencies\.authorize\(input\.roomId\)/);
  assert.match(preferenceRoute, /dependencies\.authorize\(input\.roomId\)/);
  assert.match(roomRoute, /Cache-Control["']?:?\s*["']private, no-store/);
  assert.match(preferenceRoute, /Cache-Control["']?:?\s*["']private, no-store/);
  assert.match(authorization, /serverClient\.auth\.getUser\(\)/);
  assert.match(authorization, /reclaimGuestMembership/);
  assert.match(authorization, /\.eq\("user_id", data\.user\.id\)/);
});

test("trusted preference route keeps mutation authority in SpacetimeDB", async () => {
  const [bridge, authority, service, policy] = await Promise.all([
    source("lib/recommendations/room-preference-bridge.ts"),
    source("spacetime/src/recommendation-authority.ts"),
    source("lib/recommendations/preference-service.ts"),
    source("lib/recommendations/preference-policy.ts"),
  ]);

  assert.match(bridge, /SPACETIME_SERVER_AUTH_TOKEN/);
  assert.match(bridge, /setVerifiedRoomMediaPreference/);
  assert.match(authority, /set_verified_room_media_preference/);
  assert.match(authority, /isTrustedRecommendationAuthority\(ctx\)/);
  assert.match(authority, /actor\.room_id !== room_id/);
  assert.match(authority, /expectedRevision: expected_revision/);
  assert.match(authority, /read_verified_room_media_preferences/);
  assert.match(authority, /record_neutral_without_current/);
  assert.match(service, /revision: 0/);
  assert.match(service, /shouldRecordDurableNeutral/);
  assert.match(service, /data\?\.preference_state === "liked"/);
  assert.doesNotMatch(service, /readRoomMediaPreferences\(access\)\.catch/);
  assert.match(service, /filterAuthorizedDurablePreferences/);
  assert.match(policy, /preference\.sourceType === "youtube"/);
  assert.match(policy, /asset\.status === "ready"/);
});

test("recommendation reads revalidate active Spacetime participation", async () => {
  const [service, route] = await Promise.all([
    source("lib/recommendations/room-service.ts"),
    source("app/api/recommendations/room/route.ts"),
  ]);

  assert.match(service, /await readRoomMediaPreferences\(access\)/);
  assert.match(service, /sessionPreferences/);
  assert.match(route, /Recommendations are temporarily unavailable/);
});

function validRoomRequest() {
  return {
    candidates: [
      {
        candidateId: "provider:hmJPbHVK-co",
        mediaId: "hmJPbHVK-co",
        sourceType: "youtube",
        title: "Fixture recommendation",
      },
    ],
    limit: 8,
    queuedMedia: [],
    recentHistory: [],
    revision: "room-1",
    roomId: ROOM_ID,
  };
}

function validPreference() {
  return {
    actionId: "action-1",
    expectedRevision: 7,
    liked: true,
    mediaId: "hmJPbHVK-co",
    roomId: ROOM_ID,
    sourceType: "youtube",
  };
}

function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const ROOM_ID = "00000000-0000-4000-8000-000000000003";
