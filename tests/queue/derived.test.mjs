import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { readSourceTree } from "../helpers/read-source-tree.mjs";
import { createQueueFixture, queueFixtureSizes } from "./fixtures.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-derived-queue-"));
const sourcePath = path.join(rootDir, "lib/queue/derived.ts");
const source = await readFile(sourcePath, "utf8");
const [listenLayoutSource, queuePanelSource] = await Promise.all([
  readSourceTree(
    rootDir,
    "components/room/listen-mode-layout.tsx",
    "components/room/listen/listen-mode-layout.tsx",
    "components/room/listen/queue",
  ),
  readFile(path.join(rootDir, "components/room/queue-panel.tsx"), "utf8"),
]);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "derived.mjs");

await mkdir(path.dirname(modulePath), { recursive: true });
await writeFile(modulePath, output);

const { deriveQueueState } = await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

for (const size of queueFixtureSizes) {
  test(`deriveQueueState partitions a deterministic ${size}-item fixture`, () => {
    const items = createQueueFixture(size);
    const derived = deriveQueueState(items);

    assert.equal(
      derived.upcomingItems.length + derived.playedItems.length,
      items.length,
    );
    assert.equal(derived.currentItem?.id ?? null, size > 0 ? "queue-0000" : null);
    assert.deepEqual(
      derived.queuedItems.map((item) => item.id),
      items.filter((item) => item.status === "queued").map((item) => item.id),
    );
  });
}

test("deriveQueueState sorts played items without mutating input order", () => {
  const items = [
    { id: "played-later", playedSequence: 8, status: "played" },
    { id: "now", status: "now" },
    { id: "played-first", playedSequence: 2, status: "played" },
    { id: "queued", status: "queued" },
  ];
  const originalIds = items.map((item) => item.id);
  const derived = deriveQueueState(items);

  assert.deepEqual(
    derived.playedItemsBySequence.map((item) => item.id),
    ["played-first", "played-later"],
  );
  assert.deepEqual(
    derived.playedItems.map((item) => item.id),
    ["played-later", "played-first"],
  );
  assert.deepEqual(items.map((item) => item.id), originalIds);
});

test("deriveQueueState creates direct queued indexes once per queue revision", () => {
  const derived = deriveQueueState(createQueueFixture(250));

  derived.queuedItems.forEach((item, index) => {
    assert.equal(derived.queuedIndexById.get(item.id), index);
  });
  assert.equal(derived.queuedIndexById.has("queue-0000"), false);
  assert.equal(derived.queuedIndexById.has("queue-0007"), false);
});

test("deriveQueueState preserves canonical upcoming order", () => {
  const items = createQueueFixture(10);
  const derived = deriveQueueState(items);

  assert.deepEqual(
    derived.upcomingItems.map((item) => item.id),
    items.filter((item) => item.status !== "played").map((item) => item.id),
  );
});

test("queue surfaces use shared derived indexes instead of per-row scans", () => {
  for (const componentSource of [listenLayoutSource, queuePanelSource]) {
    assert.match(componentSource, /deriveQueueState/);
    assert.match(componentSource, /queuedIndexById\.get\(item\.id\)/);
    assert.doesNotMatch(componentSource, /queuedItems\.findIndex/);
  }
});

test("closed listen queue drawer does not mount its heavy content", () => {
  assert.match(
    listenLayoutSource,
    /\{open \? \(\s*<div className="flex min-h-0 flex-1 translate-y-0/,
  );
  assert.doesNotMatch(listenLayoutSource, /aria-hidden=\{!open\}/);
  assert.doesNotMatch(
    listenLayoutSource,
    /pointer-events-none translate-y-3 opacity-0/,
  );
});
