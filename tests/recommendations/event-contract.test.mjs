import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDirectory = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-recommendation-contract-"),
);

async function loadTypeScript(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const source = await readFile(sourcePath, "utf8");
  const outputPath = path.join(
    tempDirectory,
    path.basename(relativePath).replace(/\.ts$/, ".mjs"),
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}

const events = await loadTypeScript("lib/recommendations/events.ts");
const identities = await loadTypeScript(
  "lib/recommendations/media-identity.ts",
);
const preferences = await loadTypeScript("lib/recommendations/preferences.ts");
const authorityPolicy = await loadTypeScript(
  "spacetime/src/recommendation-policy.ts",
);
const outboxDrain = await loadTypeScript("lib/recommendations/outbox-drain.ts");

test.after(async () => {
  await rm(tempDirectory, { force: true, recursive: true });
});

test("event taxonomy contains transitions without progress ticks", () => {
  assert.deepEqual(events.recommendationEventTypes, [
    "queue_added",
    "queue_removed",
    "queue_reordered",
    "queue_play_next",
    "playback_started",
    "playback_completed",
    "playback_skipped",
    "playback_replayed",
    "source_failed",
    "media_liked",
    "media_unliked",
  ]);
  assert.equal(
    events.recommendationEventTypes.includes("playback_tick"),
    false,
  );
  assert.equal(
    events.forbiddenRecommendationEventFields.includes("sourceUrl"),
    true,
  );
  assert.equal(
    events.forbiddenRecommendationEventFields.includes("signedUrl"),
    true,
  );
});

test("media identities never retain direct or uploaded URLs", () => {
  assert.deepEqual(
    identities.recommendationMediaIdentity({
      queueItemId: "queue-1",
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=hmJPbHVK-co",
    }),
    { mediaId: "hmJPbHVK-co", sourceType: "youtube" },
  );
  assert.deepEqual(
    identities.recommendationMediaIdentity({
      queueItemId: "queue-2",
      sourceType: "direct",
      sourceUrl: "mw-uploaded-asset:asset-private-1",
    }),
    { mediaId: "asset-private-1", sourceType: "uploaded" },
  );
  assert.deepEqual(
    identities.recommendationMediaIdentity({
      queueItemId: "queue-3",
      sourceType: "hls",
      sourceUrl: "https://private.example/stream.m3u8",
    }),
    { mediaId: "queue:queue-3", sourceType: "hls" },
  );
});

test("completion needs an ended state or the 90 percent threshold", () => {
  assert.deepEqual(
    authorityPolicy.classifyPlaybackAdvance({
      autoplay: true,
      completionRatioBps: 8_999,
      playbackStatus: "playing",
    }),
    {
      outcome: "skipped",
      reason: "autoplay_before_completion_threshold",
    },
  );
  assert.equal(
    authorityPolicy.classifyPlaybackAdvance({
      autoplay: true,
      completionRatioBps: 9_000,
      playbackStatus: "playing",
    }).outcome,
    "completed",
  );
  assert.equal(
    authorityPolicy.classifyPlaybackAdvance({
      autoplay: true,
      playbackStatus: "ended",
    }).outcome,
    "completed",
  );
});

test("outbox batches are stable, oldest-first, and capped at 100", () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    created_ms: BigInt(index),
    event_id: `event-${String(index).padStart(3, "0")}`,
  })).reverse();
  const batch = authorityPolicy.selectRecommendationOutboxBatch(rows, 1_000);

  assert.equal(batch.length, 100);
  assert.equal(batch[0].event_id, "event-000");
  assert.equal(batch.at(-1).event_id, "event-099");
});

test("Like removal returns neutral and remains separately capped", () => {
  assert.equal(preferences.nextPreferenceState("neutral", true), "liked");
  assert.equal(preferences.nextPreferenceState("liked", false), "neutral");
  assert.equal(preferences.explicitLikeWeightCap, 4);
});

test("bridge acknowledges only after the consumer succeeds", async () => {
  const acknowledged = [];
  const event = { eventId: "event-1" };
  const transport = {
    acknowledge: async (ids) => acknowledged.push(...ids),
    close() {},
    read: async (limit) => {
      assert.equal(limit, 100);
      return [event];
    },
  };

  await assert.rejects(
    outboxDrain.drainRecommendationEventBatch({
      consume: async () => {
        throw new Error("durable write failed");
      },
      limit: 500,
      transport,
    }),
    /durable write failed/,
  );
  assert.deepEqual(acknowledged, []);

  const result = await outboxDrain.drainRecommendationEventBatch({
    consume: async () => {},
    limit: 500,
    transport,
  });
  assert.deepEqual(result, { acknowledged: 1, read: 1 });
  assert.deepEqual(acknowledged, ["event-1"]);
});
