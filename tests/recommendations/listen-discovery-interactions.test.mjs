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
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-listen-discovery-interactions-"),
);
const sourcePath = path.join(
  rootDir,
  "lib/recommendations/listen-discovery-interactions.ts",
);
const source = (await readFile(sourcePath, "utf8")).replace(
  'import type { RoomQueueItem } from "@/lib/rooms";',
  "",
);
const outputPath = path.join(tempDir, "listen-discovery-interactions.mjs");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);

const { queueItemToDiscoveryQueueCommand, reduceListenDiscoveryBrowseState } =
  await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("explicit Discover queue commands allow the selected source again", () => {
  const command = queueItemToDiscoveryQueueCommand(item(), {
    isPlayNext: false,
  });

  assert.equal(command.allowDuplicate, true);
  assert.equal(command.isPlayNext, false);
  assert.equal(command.sourceUrl, "https://www.youtube.com/watch?v=abc123");
  assert.equal(command.sourceTitle, "Test song");
});

test("Play Next preserves duplicate intent and priority", () => {
  const command = queueItemToDiscoveryQueueCommand(item(), {
    isPlayNext: true,
  });

  assert.equal(command.allowDuplicate, true);
  assert.equal(command.isPlayNext, true);
});

test("Browse All state closes deterministically back to Discover", () => {
  const opened = reduceListenDiscoveryBrowseState(null, {
    shelfId: "room-picks",
    type: "open",
  });
  const closed = reduceListenDiscoveryBrowseState(opened, { type: "close" });

  assert.equal(opened, "room-picks");
  assert.equal(closed, null);
});

function item() {
  return {
    addedBy: "Tester",
    artist: "Artist",
    channelName: "Artist - Topic",
    duration: "3:00",
    durationSeconds: 180,
    id: "queued-item",
    playlistId: "playlist-a",
    playlistTitle: "Room mix",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    status: "queued",
    thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    title: "Test song",
    videoId: "abc123",
  };
}
