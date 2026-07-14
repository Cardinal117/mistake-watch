import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const sourcePath = path.join(
  rootDir,
  "components/room/shared/add-media/contracts.ts",
);
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const tempDir = await mkdtemp(path.join(tmpdir(), "playlist-selection-"));
const modulePath = path.join(tempDir, "contracts.mjs");

await writeFile(modulePath, output);

const {
  arePlaylistItemsSelected,
  playlistItemKey,
  playlistItemKeys,
  playlistItemsForSelection,
  updatePlaylistItemSelection,
} = await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const items = [
  playlistItem("duplicate-video", 0, "First occurrence"),
  playlistItem("duplicate-video", 4, "Second occurrence"),
  playlistItem("other-video", 7, "Other row"),
  playlistItem("unavailable-video", 9, "Unavailable", true),
];

test("default selection uses stable row keys and skips unavailable rows", () => {
  const selected = playlistItemKeys(items);

  assert.deepEqual(
    [...selected],
    ["duplicate-video:0", "duplicate-video:4", "other-video:7"],
  );
  assert.equal(selected.has("duplicate-video"), false);
});

test("duplicate video IDs remain independently selectable", () => {
  const selected = updatePlaylistItemSelection(new Set(), [items[1]], true);

  assert.equal(selected.has(playlistItemKey(items[0])), false);
  assert.equal(selected.has(playlistItemKey(items[1])), true);
  assert.deepEqual(playlistItemsForSelection(items, selected), [items[1]]);
});

test("filtered select and clear only change the visible rows", () => {
  const hiddenSelection = new Set([playlistItemKey(items[2])]);
  const visibleRows = items.slice(0, 2);
  const selected = updatePlaylistItemSelection(
    hiddenSelection,
    visibleRows,
    true,
  );

  assert.equal(arePlaylistItemsSelected(visibleRows, selected), true);
  assert.equal(selected.has(playlistItemKey(items[2])), true);

  const cleared = updatePlaylistItemSelection(selected, visibleRows, false);
  assert.equal(arePlaylistItemsSelected(visibleRows, cleared), false);
  assert.deepEqual([...cleared], [playlistItemKey(items[2])]);
});

test("selected import resolves only the selected playlist rows", () => {
  const selected = new Set([
    playlistItemKey(items[0]),
    playlistItemKey(items[2]),
  ]);

  assert.deepEqual(
    playlistItemsForSelection(items, selected).map((item) => item.title),
    ["First occurrence", "Other row"],
  );
});

test("Watch and Listen paths use the shared playlist selection contract", async () => {
  const paths = [
    "components/room/shared/add-media/use-add-media-controller.ts",
    "components/room/shared/add-media/preview-cards.tsx",
    "components/room/listen/add-media/add-media-popover.tsx",
    "components/room/listen/add-media/playlist-review-overlay.tsx",
  ];
  const sources = await Promise.all(
    paths.map((relativePath) =>
      readFile(path.join(rootDir, relativePath), "utf8"),
    ),
  );

  assert.equal(
    sources.every((text) => /playlistItem|PlaylistItem/.test(text)),
    true,
  );
  assert.match(sources[0], /playlistItemKeys\(payload\.items\)/);
  assert.match(sources[0], /playlistItemsForSelection/);
  assert.match(sources[1], /updatePlaylistItemSelection/);
  assert.match(sources[2], /playlistItemKeys\(payload\.items\)/);
  assert.match(sources[2], /playlistItemsForSelection/);
  assert.match(sources[3], /updatePlaylistItemSelection/);
});

function playlistItem(videoId, position, title, isUnavailable = false) {
  return {
    availability: isUnavailable ? "unavailable" : "available",
    channelTitle: "Test channel",
    durationSeconds: 180,
    isUnavailable,
    position,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: null,
    title,
    videoId,
  };
}
