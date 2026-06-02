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

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-cache-"));
const sourcePath = path.join(rootDir, "lib/youtube/cache.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "cache.mjs");

await writeFile(sourceModulePath, sourceJs);

const { InFlightRequestCache, TtlCache } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("TtlCache returns hits before expiry", () => {
  const cache = new TtlCache(60_000);

  cache.set("video-a", { title: "A" });

  assert.deepEqual(cache.get("video-a"), {
    status: "hit",
    value: { title: "A" },
  });
});

test("InFlightRequestCache de-dupes concurrent requests", async () => {
  const inFlight = new InFlightRequestCache();
  let calls = 0;

  const [first, second] = await Promise.all([
    inFlight.getOrCreate("playlist-a", async () => {
      calls += 1;
      return { itemCount: 20 };
    }),
    inFlight.getOrCreate("playlist-a", async () => {
      calls += 1;
      return { itemCount: 40 };
    }),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, { itemCount: 20 });
  assert.deepEqual(second, { itemCount: 20 });
});
