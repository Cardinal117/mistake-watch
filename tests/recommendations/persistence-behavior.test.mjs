import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  loadTypeScript,
  recommendationEvent as event,
  root,
} from "./persistence-test-helpers.mjs";

const ingestedAt = new Date("2026-07-15T10:00:00.000Z");

test("normalization enforces attribution and bounded retention", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  const attribution = {
    memberId: "00000000-0000-4000-8000-000000000002",
    roomId: "00000000-0000-4000-8000-000000000003",
    userId: "00000000-0000-4000-8000-000000000001",
  };

  assert.deepEqual(persistence.recommendationRetentionDays, {
    account: 180,
    guest: 30,
    neutralPreference: 30,
  });
  const accountEvent = persistence.normalizeDurableRecommendationEvent(
    event(),
    attribution,
    ingestedAt,
  );
  assert.equal(accountEvent.account_user_id, attribution.userId);
  assert.equal(accountEvent.expires_at, "2027-01-11T10:00:00.000Z");
  const guestEvent = persistence.normalizeDurableRecommendationEvent(
    event({ eventId: "event-guest", idempotencyKey: "guest-event" }),
    { ...attribution, memberId: "00000000-0000-4000-8000-000000000004" },
    ingestedAt,
  );
  assert.equal(guestEvent.account_user_id, null);
  assert.equal(guestEvent.expires_at, "2026-08-14T10:00:00.000Z");
});

test("normalization rejects forbidden, unbounded, and malformed events", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  for (const forbiddenField of [
    "sourceUrl",
    "signedUrl",
    "publicUrl",
    "r2Url",
  ]) {
    assert.equal(
      persistence.normalizeDurableRecommendationEvent(
        event({ [forbiddenField]: "https://private.example/media" }),
        null,
        ingestedAt,
      ),
      null,
    );
  }
  for (const invalidEvent of [
    event({ mediaId: "https://private.example/media" }),
    event({ roomId: "" }),
    event({ sourceType: "x".repeat(25) }),
    event({ mediaId: "x".repeat(181) }),
    event({ reason: "x".repeat(81) }),
    event({ schemaVersion: 2 }),
  ]) {
    assert.equal(
      persistence.normalizeDurableRecommendationEvent(
        invalidEvent,
        null,
        ingestedAt,
      ),
      null,
    );
  }
});

test("opaque source identities survive without URLs", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  for (const [sourceType, mediaId] of [
    ["direct", "queue:direct-item-1"],
    ["hls", "queue:hls-item-1"],
    ["uploaded", "06f55f38-2f03-4a10-95b5-f343e6db8cc7"],
    ["youtube", "hmJPbHVK-co"],
  ]) {
    const normalized = persistence.normalizeDurableRecommendationEvent(
      event({
        eventId: `event-${sourceType}`,
        idempotencyKey: `identity:${sourceType}`,
        mediaId,
        sourceType,
      }),
      null,
      ingestedAt,
    );
    assert.equal(normalized.media_id, mediaId);
    assert.doesNotMatch(JSON.stringify(normalized), /https?:|\.m3u8|r2/i);
  }
});

test("batch normalization is stable and deduplicates retries", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  const events = [
    event({ createdMs: 30n, eventId: "event-c", idempotencyKey: "key-c" }),
    event({ createdMs: 10n, eventId: "event-b", idempotencyKey: "key-b" }),
    event({ createdMs: 10n, eventId: "event-a", idempotencyKey: "key-a" }),
    event({ createdMs: 10n, eventId: "event-b", idempotencyKey: "key-b" }),
  ];
  const first = persistence.normalizeRecommendationEventBatch(
    events,
    [],
    ingestedAt,
  );
  const second = persistence.normalizeRecommendationEventBatch(
    [...events].reverse(),
    [],
    ingestedAt,
  );
  assert.deepEqual(
    first.map((item) => item.idempotency_key),
    ["key-a", "key-b", "key-c"],
  );
  assert.deepEqual(second, first);
});

test("batch normalization rejects conflicting same-key events", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  assert.throws(
    () =>
      persistence.normalizeRecommendationEventBatch(
        [
          event({ eventId: "event-a", idempotencyKey: "shared-key" }),
          event({
            eventId: "event-b",
            eventType: "playback_skipped",
            idempotencyKey: "shared-key",
          }),
        ],
        [],
        ingestedAt,
      ),
    /conflicting authority events/,
  );
});

test("persistence rejects invalid rows and inconsistent RPC counts", async () => {
  const persistence = await loadTypeScript(
    "lib/recommendations/persistence.ts",
  );
  let rpcCalls = 0;
  const client = {
    from: () => ({
      select: () => ({ in: async () => ({ data: [], error: null }) }),
    }),
    rpc: async () => {
      rpcCalls += 1;
      return { data: { duplicates: 0, inserted: 0, received: 0 }, error: null };
    },
  };
  await assert.rejects(
    persistence.persistRecommendationEventBatch({
      client,
      events: [event({ sourceUrl: "https://private.example" })],
      ingestedAt,
    }),
    /invalid authority event/,
  );
  assert.equal(rpcCalls, 0);
  await assert.rejects(
    persistence.persistRecommendationEventBatch({
      client,
      events: [event()],
      ingestedAt,
    }),
    /inconsistent counts/,
  );
  assert.equal(rpcCalls, 1);
});

test("drain route uses the production cron-secret boundary", async () => {
  const [source, vercelConfig] = await Promise.all([
    readFile(path.join(root, "app/api/recommendations/drain/route.ts"), "utf8"),
    readFile(path.join(root, "vercel.json"), "utf8").then(JSON.parse),
  ]);
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /authorization.*Bearer/);
  assert.match(source, /status: 401/);
  assert.doesNotMatch(
    source,
    /SPACETIME_SERVER_AUTH_TOKEN|SUPABASE_SECRET_KEY/,
  );
  assert.deepEqual(vercelConfig.crons, [
    {
      path: "/api/recommendations/drain",
      schedule: "0 1 * * *",
    },
    {
      path: "/api/media/uploads/cleanup",
      schedule: "0 2 * * *",
    },
  ]);
});
