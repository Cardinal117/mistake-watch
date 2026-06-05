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

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-queue-"));
const queueSourcePath = path.join(rootDir, "lib/queue/model.ts");
const queueSource = await readFile(queueSourcePath, "utf8");
const queueJs = ts.transpileModule(queueSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: queueSourcePath,
}).outputText;
const queueModulePath = path.join(tempDir, "model.mjs");

await mkdir(path.dirname(queueModulePath), { recursive: true });
await writeFile(queueModulePath, queueJs);

const {
  getNextQueuedItemId,
  getNextQueueItemIdForMode,
  markQueueItemPlaying,
  nextQueuePosition,
  playNextQueuePosition,
  reorderQueuedItems,
  scoreSmartShuffleCandidate,
  smartShuffleQueue,
} = await import(pathToFileURL(queueModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("nextQueuePosition appends after active queue positions", () => {
  assert.equal(
    nextQueuePosition([
      { position: 0, queueItemId: "a", status: "played" },
      { position: 2, queueItemId: "b", status: "queued" },
      { position: 4, queueItemId: "c", status: "playing" },
    ]),
    5,
  );
});

test("playNextQueuePosition inserts after pinned and existing play-next items", () => {
  assert.equal(
    playNextQueuePosition([
      { position: 0, queueItemId: "pinned", status: "queued", isPinned: true },
      {
        position: 1,
        queueItemId: "existing-next",
        status: "queued",
        isPlayNext: true,
      },
      { position: 2, queueItemId: "normal", status: "queued" },
    ]),
    2,
  );
});

test("playNextQueuePosition inserts first when no pinned group exists", () => {
  assert.equal(
    playNextQueuePosition([
      { position: 0, queueItemId: "normal-a", status: "queued" },
      { position: 1, queueItemId: "normal-b", status: "queued" },
    ]),
    0,
  );
});

test("reorderQueuedItems moves a queued item and normalizes positions", () => {
  assert.deepEqual(
    reorderQueuedItems(
      [
        { position: 0, queueItemId: "a", status: "queued" },
        { position: 1, queueItemId: "b", status: "queued" },
        { position: 2, queueItemId: "c", status: "queued" },
      ],
      "c",
      0,
    ),
    [
      { position: 0, queueItemId: "c", status: "queued" },
      { position: 1, queueItemId: "a", status: "queued" },
      { position: 2, queueItemId: "b", status: "queued" },
    ],
  );
});

test("reorderQueuedItems ignores currently playing items", () => {
  assert.deepEqual(
    reorderQueuedItems(
      [
        { position: 0, queueItemId: "now", status: "playing" },
        { position: 4, queueItemId: "a", status: "queued" },
        { position: 8, queueItemId: "b", status: "queued" },
      ],
      "now",
      1,
    ),
    [
      { position: 0, queueItemId: "a", status: "queued" },
      { position: 1, queueItemId: "b", status: "queued" },
    ],
  );
});

test("markQueueItemPlaying advances the old playing item to played", () => {
  assert.deepEqual(
    markQueueItemPlaying(
      [
        { position: 0, queueItemId: "old", status: "playing" },
        { position: 1, queueItemId: "next", status: "queued" },
      ],
      "next",
    ),
    [
      { position: 0, queueItemId: "old", status: "played" },
      { position: 1, queueItemId: "next", status: "playing" },
    ],
  );
});

test("getNextQueuedItemId returns the first queued item by position", () => {
  assert.equal(
    getNextQueuedItemId([
      { position: 0, queueItemId: "active", status: "playing" },
      { position: 4, queueItemId: "later", status: "queued" },
      { position: 2, queueItemId: "next", status: "queued" },
      { position: 1, queueItemId: "old", status: "played" },
    ]),
    "next",
  );
});

test("getNextQueuedItemId skips known unavailable queued items", () => {
  assert.equal(
    getNextQueuedItemId([
      {
        isUnavailable: true,
        position: 0,
        queueItemId: "blocked",
        status: "queued",
      },
      { position: 1, queueItemId: "playable", status: "queued" },
    ]),
    "playable",
  );
});

test("getNextQueuedItemId ignores played and removed items", () => {
  assert.equal(
    getNextQueuedItemId([
      { position: 0, queueItemId: "old", status: "played" },
      { position: 1, queueItemId: "gone", status: "removed" },
    ]),
    undefined,
  );
});

test("getNextQueueItemIdForMode loops to the first played item", () => {
  assert.equal(
    getNextQueueItemIdForMode(
      [
        { position: 2, queueItemId: "later-old", status: "played" },
        { position: 0, queueItemId: "first-old", status: "played" },
      ],
      "loop",
    ),
    "first-old",
  );
});

test("getNextQueueItemIdForMode does not loop in normal mode", () => {
  assert.equal(
    getNextQueueItemIdForMode(
      [{ position: 0, queueItemId: "first-old", status: "played" }],
      "normal",
    ),
    undefined,
  );
});

test("scoreSmartShuffleCandidate penalizes repeated channel and artist", () => {
  const repeated = scoreSmartShuffleCandidate(
    {
      artist: "Same Artist",
      channelName: "Same Channel",
      position: 1,
      queueItemId: "next",
      status: "queued",
      title: "Different song",
      videoId: "video-b",
    },
    {
      artist: "Same Artist",
      channelName: "Same Channel",
      position: 0,
      queueItemId: "now",
      status: "playing",
      title: "First song",
      videoId: "video-a",
    },
  );
  const varied = scoreSmartShuffleCandidate(
    {
      artist: "Other Artist",
      channelName: "Other Channel",
      position: 1,
      queueItemId: "next",
      status: "queued",
      title: "Different song",
      videoId: "video-b",
    },
    {
      artist: "Same Artist",
      channelName: "Same Channel",
      position: 0,
      queueItemId: "now",
      status: "playing",
      title: "First song",
      videoId: "video-a",
    },
  );

  assert.ok(repeated > varied);
});

test("smartShuffleQueue keeps pinned and play-next items first", () => {
  const shuffled = smartShuffleQueue([
    {
      position: 0,
      queueItemId: "normal-a",
      status: "queued",
      title: "Normal A",
    },
    {
      isPinned: true,
      position: 1,
      queueItemId: "pinned",
      status: "queued",
      title: "Pinned",
    },
    {
      isPlayNext: true,
      position: 2,
      queueItemId: "play-next",
      status: "queued",
      title: "Play next",
    },
    {
      position: 3,
      queueItemId: "normal-b",
      status: "queued",
      title: "Normal B",
    },
  ]);

  assert.equal(shuffled[0].queueItemId, "pinned");
  assert.equal(shuffled[1].queueItemId, "play-next");
  assert.deepEqual(
    shuffled.map((item) => item.position),
    [0, 1, 2, 3],
  );
});
