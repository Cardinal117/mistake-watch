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
const tempDir = await mkdtemp(path.join(tmpdir(), "media-catalogue-window-"));
const sourcePath = path.join(rootDir, "lib/media/catalogue-window.ts");
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "catalogue-window.mjs");

await writeFile(modulePath, output);

const {
  GRID_CATALOGUE_BATCH_SIZE,
  LIST_CATALOGUE_BATCH_SIZE,
  getCatalogueResultRevision,
  getNextCatalogueCount,
  getProgressiveCatalogueWindow,
  summarizeCatalogue,
} = await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("grid and list modes expose the approved initial budgets", () => {
  assert.equal(GRID_CATALOGUE_BATCH_SIZE, 24);
  assert.equal(LIST_CATALOGUE_BATCH_SIZE, 12);

  for (const itemCount of [0, 24, 25, 250, 1000]) {
    const grid = getProgressiveCatalogueWindow({
      itemCount,
      requestedCount: GRID_CATALOGUE_BATCH_SIZE,
      viewMode: "grid",
    });
    const list = getProgressiveCatalogueWindow({
      itemCount,
      requestedCount: LIST_CATALOGUE_BATCH_SIZE,
      viewMode: "list",
    });

    assert.equal(grid.visibleCount, Math.min(itemCount, 24));
    assert.equal(list.visibleCount, Math.min(itemCount, 12));
    assert.equal(grid.hasMore, itemCount > 24);
    assert.equal(list.hasMore, itemCount > 12);
  }
});

test("progressive batches reach every item without exceeding the total", () => {
  for (const viewMode of ["grid", "list"]) {
    for (const itemCount of [25, 250, 1000]) {
      let visibleCount = 0;
      const observed = [];

      while (visibleCount < itemCount) {
        visibleCount = getNextCatalogueCount({
          currentCount: visibleCount,
          itemCount,
          viewMode,
        });
        observed.push(visibleCount);
      }

      assert.equal(observed.at(-1), itemCount);
      assert.equal(new Set(observed).size, observed.length);
      assert.ok(observed.every((count) => count > 0 && count <= itemCount));
    }
  }
});

test("invalid inputs clamp to a safe empty or first-batch window", () => {
  assert.deepEqual(
    getProgressiveCatalogueWindow({
      itemCount: Number.NaN,
      requestedCount: -100,
      viewMode: "grid",
    }),
    { batchSize: 24, hasMore: false, visibleCount: 0 },
  );
  assert.equal(
    getProgressiveCatalogueWindow({
      itemCount: 250.8,
      requestedCount: Number.NaN,
      viewMode: "list",
    }).visibleCount,
    12,
  );
});

test("the 250-item initial structural work falls by more than 75 percent", () => {
  const baselineCards = 250;
  const progressiveCards = getProgressiveCatalogueWindow({
    itemCount: baselineCards,
    requestedCount: GRID_CATALOGUE_BATCH_SIZE,
    viewMode: "grid",
  }).visibleCount;
  const reduction = 1 - progressiveCards / baselineCards;

  assert.ok(reduction >= 0.75);
  assert.equal(progressiveCards, 24);
});

test("catalogue badges are summarized in one stable pass", () => {
  const items = [
    { folderId: "folder-a", live: false, visibility: "owner_only" },
    { folderId: "folder-a", live: true, visibility: "public" },
    { folderId: "folder-b", live: false, visibility: "public" },
    { folderId: null, live: true, visibility: "owner_only" },
  ];
  const summary = summarizeCatalogue(items, (item) => item.live);

  assert.deepEqual(
    [...summary.folderCounts],
    [
      ["folder-a", 2],
      ["folder-b", 1],
    ],
  );
  assert.equal(summary.hiddenCount, 2);
  assert.equal(summary.liveCount, 2);
  assert.equal(summary.unsortedCount, 1);
});

test("result revision detects interior reorder with stable endpoints", () => {
  const original = ["first", "alpha", "beta", "last"].map((id) => ({ id }));
  const reordered = ["first", "beta", "alpha", "last"].map((id) => ({ id }));

  assert.notEqual(
    getCatalogueResultRevision(original),
    getCatalogueResultRevision(reordered),
  );
});
