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

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-avatars-"));
const sourcePath = path.join(rootDir, "lib/identity/avatars.ts");
const sourceJs = ts.transpileModule(await readFile(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "avatars.mjs");

await writeFile(sourceModulePath, sourceJs);

const { avatarCatalog, getDeterministicAvatarKey, isAvatarKey } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("avatar catalog contains the fixed hardware set", () => {
  assert.deepEqual(avatarCatalog.map((avatar) => avatar.key).sort(), [
    "audio",
    "controller",
    "cooling",
    "memory",
    "network",
    "power",
    "processor",
    "storage",
  ]);
});

test("deterministic avatar keys are valid and stable", () => {
  const first = getDeterministicAvatarKey("member-a");
  const second = getDeterministicAvatarKey("member-a");

  assert.equal(first, second);
  assert.equal(isAvatarKey(first), true);
  assert.equal(isAvatarKey("unknown"), false);
});
