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
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-listen-up-next-"),
);
const sourcePath = path.join(
  rootDir,
  "components/room/listen/now-playing/up-next-presentation.ts",
);
const outputPath = path.join(tempDir, "up-next-presentation.mjs");

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

async function importPresentation() {
  const output = ts.transpileModule(await readFile(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}

test("the player rail exposes at most the first three queued identities", async () => {
  const { deriveListenUpNextPreview } = await importPresentation();
  const items = Array.from({ length: 6 }, (_, index) => ({
    id: `queue-${index + 1}`,
    title: `Track ${index + 1}`,
  }));

  const preview = deriveListenUpNextPreview(items);

  assert.deepEqual(
    preview.map((item) => item.id),
    ["queue-1", "queue-2", "queue-3"],
  );
  assert.equal(preview[0], items[0]);
  assert.equal(preview[2], items[2]);
});

test("preview derivation never mutates or duplicates the canonical queue", async () => {
  const { deriveListenUpNextPreview } = await importPresentation();
  const items = Object.freeze([
    Object.freeze({ id: "next", title: "Next" }),
    Object.freeze({ id: "later", title: "Later" }),
  ]);

  const preview = deriveListenUpNextPreview(items);

  assert.notEqual(preview, items);
  assert.deepEqual(preview, items);
  assert.equal(new Set(preview.map((item) => item.id)).size, preview.length);
});

test("empty and short queues preserve honest preview counts", async () => {
  const { deriveListenUpNextPreview } = await importPresentation();

  assert.deepEqual(deriveListenUpNextPreview([]), []);
  assert.equal(deriveListenUpNextPreview([{ id: "only" }]).length, 1);
});
