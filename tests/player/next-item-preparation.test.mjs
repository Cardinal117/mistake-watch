import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-preload-"));

async function transpileSource(sourcePath, outputName, transform = (source) => source) {
  const source = transform(await readFile(sourcePath, "utf8"));
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const outputPath = path.join(tempDir, outputName);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, js);

  return import(pathToFileURL(outputPath));
}

await transpileSource(
  path.join(rootDir, "lib/queue/model.ts"),
  "queue-model.mjs",
);
await transpileSource(
  path.join(rootDir, "lib/player/source.ts"),
  "source.mjs",
);
await writeFile(
  path.join(tempDir, "iframe-api.mjs"),
  "export function loadYouTubeIframeApi() { return Promise.resolve({}); }\n",
);

const {
  getNextItemInvalidationKey,
  getNextItemPreparationCacheKey,
  predictNextQueueItem,
  toNextItemPreparationTarget,
} = await transpileSource(
  path.join(rootDir, "lib/player/next-item-preparation.ts"),
  "next-item-preparation.mjs",
  (source) =>
    source
      .replace('from "../queue/model"', 'from "./queue-model.mjs"')
      .replace('from "./source"', 'from "./source.mjs"')
      .replace('from "../youtube/iframe-api"', 'from "./iframe-api.mjs"'),
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("predictNextQueueItem chooses the first queued item in normal mode", () => {
  const snapshot = createSnapshot({
    queue: [
      queueItem("now", 0, "playing"),
      queueItem("later", 4, "queued"),
      queueItem("next", 2, "queued"),
    ],
  });

  assert.equal(predictNextQueueItem(snapshot)?.queueItemId, "next");
});

test("predictNextQueueItem respects loop mode when no queued item remains", () => {
  const snapshot = createSnapshot({
    queueMode: "loop",
    queue: [
      queueItem("played-b", 2, "played"),
      queueItem("played-a", 0, "played"),
    ],
  });

  assert.equal(predictNextQueueItem(snapshot)?.queueItemId, "played-a");
});

test("toNextItemPreparationTarget rejects unavailable or empty items", () => {
  assert.equal(toNextItemPreparationTarget(null), null);
  assert.equal(
    toNextItemPreparationTarget({
      ...queueItem("bad", 0, "queued"),
      isUnavailable: true,
    }),
    null,
  );
});

test("toNextItemPreparationTarget derives YouTube thumbnails", () => {
  const target = toNextItemPreparationTarget({
    ...queueItem("yt", 0, "queued"),
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  assert.equal(
    target?.thumbnailUrl,
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("invalidation key changes when queue order or active item changes", () => {
  const first = createSnapshot({
    activeQueueItemId: "now",
    queue: [queueItem("now", 0, "playing"), queueItem("next", 1, "queued")],
  });
  const reordered = createSnapshot({
    activeQueueItemId: "now",
    queue: [queueItem("now", 0, "playing"), queueItem("next", 2, "queued")],
  });
  const switched = createSnapshot({
    activeQueueItemId: "next",
    queue: [queueItem("now", 0, "played"), queueItem("next", 1, "playing")],
  });

  assert.notEqual(
    getNextItemInvalidationKey(first),
    getNextItemInvalidationKey(reordered),
  );
  assert.notEqual(
    getNextItemInvalidationKey(first),
    getNextItemInvalidationKey(switched),
  );
});

test("preparation cache key separates source changes for the same queue item", () => {
  const first = {
    durationSeconds: null,
    queueItemId: "item",
    sourceType: "direct",
    sourceUrl: "https://example.com/first.mp4",
    thumbnailUrl: null,
    title: "First",
  };
  const second = {
    ...first,
    sourceUrl: "https://example.com/second.mp4",
  };

  assert.notEqual(
    getNextItemPreparationCacheKey(first),
    getNextItemPreparationCacheKey(second),
  );
});

function createSnapshot({
  activeQueueItemId = "now",
  queue = [],
  queueMode = "normal",
} = {}) {
  return {
    chatMessages: [],
    connection: { connected: true },
    errors: [],
    kicks: [],
    participants: [],
    permissions: [],
    queue,
    session: {
      activeQueueItemId,
      controllerIdentity: null,
      hostMemberId: "host",
      mode: "watch",
      playbackRate: 1,
      positionSeconds: 0,
      queueAutoplayEnabled: true,
      queueMode,
      roomId: "room",
      roomName: "Room",
      serverUpdatedMs: 0,
      sourceDurationSeconds: null,
      sourceTitle: null,
      sourceType: null,
      sourceUrl: null,
      status: "playing",
      supabaseRoomId: "room",
    },
  };
}

function queueItem(queueItemId, position, status) {
  return {
    addedByMemberId: "host",
    artist: null,
    channelName: null,
    durationSeconds: null,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: false,
    playlistId: null,
    playlistTitle: null,
    position,
    queueItemId,
    roomId: "room",
    sourceType: "direct",
    sourceUrl: `https://example.com/${queueItemId}.mp4`,
    status,
    thumbnailUrl: null,
    title: queueItemId,
  };
}
