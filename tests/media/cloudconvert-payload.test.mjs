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
  path.join(tmpdir(), "mistake-watch-cloudconvert-payload-"),
);
const sourcePath = path.join(rootDir, "lib/media/cloudconvert-payload.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "cloudconvert-payload.mjs");

await writeFile(sourceModulePath, sourceJs);

const { buildCloudConvertMediaJobPayload } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("CloudConvert MP4 job uses browser-safe stereo AAC", () => {
  const payload = buildCloudConvertMediaJobPayload({
    assetId: "asset-id",
    exportCredentials: {
      accessKeyId: "access-key",
      bucket: "watch2bucket",
      endpoint: "https://example.r2.cloudflarestorage.com",
      secretAccessKey: "secret-key",
    },
    posterObjectKey: "media-posters/asset-id.jpg",
    processedObjectKey: "media-processed/asset-id.mp4",
    sourceObjectKey: "media/source-file.mkv",
    webhookUrl: "https://watch.example.com/api/media/cloudconvert/webhook",
  });

  const convertTask = payload.tasks["convert-browser-mp4"];

  assert.equal(convertTask.engine, "ffmpeg");
  assert.equal(convertTask.operation, "command");
  assert.equal(convertTask.command, "ffmpeg");
  assert.equal(convertTask.capture_output, true);
  assert.match(convertTask.arguments, /\/input\/import-source\/source-file\.mkv/);
  assert.match(convertTask.arguments, /-c:a aac/);
  assert.match(convertTask.arguments, /-b:a 320k/);
  assert.match(convertTask.arguments, /-ac 2/);
  assert.match(convertTask.arguments, /-c:v libx264/);
  assert.equal(payload.webhook_url, "https://watch.example.com/api/media/cloudconvert/webhook");
});
