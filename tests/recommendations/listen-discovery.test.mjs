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
const sourcePath = path.join(
  rootDir,
  "lib/recommendations/listen-discovery.ts",
);
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

const {
  buildListenDiscoveryResult,
  buildListenDiscoveryShelves,
  buildListenSessionInsights,
} = await import(pathToFileURL(outputPath));

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

test("an authoritative empty ranking does not restore excluded room items", () => {
  const result = buildListenDiscoveryResult({
    activeTab: "recommended",
    currentItem: queueItems[0],
    items: queueItems,
    providerItems: [],
    providerRankedEmpty: true,
  });

  assert.equal(result.source, "provider");
  assert.equal(result.sourceLabel, "Mistake Watch ranking");
  assert.deepEqual(result.items, []);
  assert.match(result.emptyMessage, /No new recommendations/);
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

test("multi-shelf discovery preserves the approved order and honest labels", () => {
  const current = item({
    id: "current",
    playlistId: "playlist-a",
    playlistTitle: "Room Mix",
    status: "now",
    title: "Current Song",
  });
  const related = item({
    id: "related",
    artist: current.artist,
    status: "queued",
    title: "Related Song",
  });
  const played = item({
    id: "history",
    status: "played",
    title: "History Song",
  });
  const playlist = item({
    id: "playlist",
    playlistId: "playlist-a",
    playlistTitle: "Room Mix",
    status: "played",
    title: "Playlist Song",
  });
  const provider = item({
    id: "provider:new",
    sourceUrl: "https://www.youtube.com/watch?v=provider-new",
    title: "Provider Song",
    videoId: "provider-new",
  });

  const shelves = buildListenDiscoveryShelves({
    currentItem: current,
    items: [current, related, played, playlist],
    providerItems: [provider],
    roomName: "Duno",
  });

  assert.deepEqual(
    shelves.map((shelf) => shelf.id),
    [
      "room-picks",
      "because-listened",
      "recently-played",
      "room-playlists",
      "most-listened",
    ],
  );
  assert.equal(shelves[1].title, "Because you listened to Current Song");
  assert.equal(shelves[2].title, "Recently played in Duno");
  assert.equal(shelves[3].title, "From playlists in this room");
  assert.doesNotMatch(shelves[3].title, /your playlists/i);
});

test("each shelf deduplicates playable sources without changing ranked order", () => {
  const duplicateSource = "https://www.youtube.com/watch?v=duplicate";
  const first = item({
    id: "first",
    sourceUrl: duplicateSource,
    videoId: "duplicate",
  });
  const duplicate = item({
    id: "second",
    sourceUrl: duplicateSource,
    videoId: "duplicate",
  });
  const third = item({ id: "third" });
  const shelves = buildListenDiscoveryShelves({
    currentItem: null,
    items: [first, duplicate, third],
    providerItems: [first, duplicate, third],
    roomName: "Duno",
  });

  for (const shelf of shelves) {
    const keys = shelf.items.map(
      (entry) => entry.videoId ?? entry.sourceUrl ?? entry.id,
    );
    assert.equal(new Set(keys).size, keys.length);
  }

  assert.deepEqual(
    shelves
      .find((shelf) => shelf.id === "because-listened")
      ?.items.map((entry) => entry.id),
    ["first", "third"],
  );
});

test("provider failure stays isolated and falls back to honest room results", () => {
  const current = item({ id: "current", status: "now" });
  const related = item({
    id: "related",
    artist: current.artist,
    status: "played",
  });
  const shelves = buildListenDiscoveryShelves({
    currentItem: current,
    items: [current, related],
    providerUnavailable: true,
    roomName: "Duno",
  });
  const contextual = shelves.find((shelf) => shelf.id === "because-listened");

  assert.ok(shelves.some((shelf) => shelf.id === "recently-played"));
  assert.equal(contextual?.source, "provider-limited");
  assert.match(contextual?.message ?? "", /room history/i);
  assert.deepEqual(
    contextual?.items.map((entry) => entry.id),
    ["related"],
  );
});

test("later shelves suppress repeats only when an honest alternative remains", () => {
  const queued = item({ id: "queued", status: "queued" });
  const repeatedProvider = item({
    id: "provider:repeat",
    sourceUrl: queued.sourceUrl,
    videoId: queued.videoId,
  });
  const providerAlternative = item({ id: "provider:alternative" });

  const withAlternative = buildListenDiscoveryShelves({
    currentItem: null,
    items: [queued],
    providerItems: [repeatedProvider, providerAlternative],
    roomName: "Duno",
  });
  const withoutAlternative = buildListenDiscoveryShelves({
    currentItem: null,
    items: [queued],
    providerItems: [repeatedProvider],
    roomName: "Duno",
  });

  assert.deepEqual(
    withAlternative
      .find((shelf) => shelf.id === "because-listened")
      ?.items.map((entry) => entry.id),
    ["provider:alternative"],
  );
  assert.deepEqual(
    withoutAlternative
      .find((shelf) => shelf.id === "because-listened")
      ?.items.map((entry) => entry.id),
    ["provider:repeat"],
  );
});

test("empty discovery returns no decorative shelves", () => {
  assert.deepEqual(
    buildListenDiscoveryShelves({
      currentItem: null,
      items: [],
      roomName: "Empty Room",
    }),
    [],
  );
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
