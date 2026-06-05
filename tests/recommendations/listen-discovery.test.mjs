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
  path.join(tmpdir(), "mistake-watch-listen-discovery-"),
);
const sourcePath = path.join(rootDir, "lib/recommendations/listen-discovery.ts");
const source = (await readFile(sourcePath, "utf8")).replace(
  'import type { RoomQueueItem } from "@/lib/rooms";',
  "",
);
const outputPath = path.join(tempDir, "listen-discovery.mjs");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);

const { buildListenDiscoveryResult, buildListenSessionInsights } = await import(
  pathToFileURL(outputPath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const queueItems = [
  item({
    id: "now",
    status: "now",
    title: "Now",
  }),
  item({
    id: "next",
    isPlayNext: true,
    status: "queued",
    title: "Next",
  }),
  item({
    id: "pinned",
    isPinned: true,
    status: "queued",
    title: "Pinned",
  }),
  item({
    id: "blocked",
    isUnavailable: true,
    status: "queued",
    title: "Blocked",
  }),
  item({
    id: "played",
    status: "played",
    title: "Played",
  }),
];

test("for-you uses playable queue and history without blocked items", () => {
  const result = buildListenDiscoveryResult({
    activeTab: "for-you",
    currentItem: queueItems[0],
    items: queueItems,
  });

  assert.equal(result.source, "room-queue");
  assert.deepEqual(
    result.items.map((item) => item.id),
    ["next", "pinned", "played"],
  );
});

test("provider recommendations win only when provider rows exist", () => {
  const providerItem = item({
    id: "provider:abc",
    status: "queued",
    title: "Provider",
  });
  const result = buildListenDiscoveryResult({
    activeTab: "recommended",
    currentItem: queueItems[0],
    items: queueItems,
    providerItems: [providerItem],
  });

  assert.equal(result.source, "provider");
  assert.equal(result.sourceLabel, "YouTube search");
  assert.deepEqual(result.items, [providerItem]);
});

test("most listened is room-history based instead of provider trending", () => {
  const result = buildListenDiscoveryResult({
    activeTab: "top-listened",
    currentItem: queueItems[0],
    items: queueItems,
  });

  assert.equal(result.source, "room-history");
  assert.equal(result.sourceLabel, "Host room history");
  assert.ok(result.items.length > 0);
});

test("playlist tab does not claim account playlists before accounts exist", () => {
  const result = buildListenDiscoveryResult({
    activeTab: "playlist",
    currentItem: queueItems[0],
    items: queueItems,
  });

  assert.equal(result.source, "unavailable");
  assert.equal(result.sourceLabel, "Accounts required");
  assert.match(result.emptyMessage, /Account playlists/);
});

test("session insights are derived from real queue data", () => {
  const insights = buildListenSessionInsights(queueItems);

  assert.deepEqual(
    insights.map((insight) => insight.label),
    ["Session", "Pattern", "Contributors"],
  );
  assert.match(insights[0].value, /upcoming/);
});

function item(overrides) {
  return {
    addedBy: "Tester",
    artist: "Artist",
    channelName: "Artist - Topic",
    duration: "3:00",
    id: overrides.id,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${overrides.id}`,
    status: "queued",
    title: overrides.title,
    videoId: overrides.id,
    ...overrides,
  };
}
