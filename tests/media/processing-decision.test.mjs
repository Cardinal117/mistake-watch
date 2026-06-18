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
  path.join(tmpdir(), "mistake-watch-processing-decision-"),
);
const sourcePath = path.join(rootDir, "lib/media/processing-decision.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "processing-decision.mjs");

await writeFile(sourceModulePath, sourceJs);

const { decideMediaProcessing, estimateCloudConvertCredits } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("browser-safe MP4 uses direct-ready strategy without CloudConvert", () => {
  const decision = decideMediaProcessing({
    clientInspection: {
      audioCodecs: ["mp4a"],
      container: "mp4",
      isBrowserSafe: true,
      videoCodecs: ["avc1"],
    },
    durationSeconds: 25 * 60,
    fileName: "episode-01.mp4",
    fileSizeBytes: 800 * 1024 * 1024,
    mimeType: "video/mp4",
  });

  assert.equal(decision.strategy, "direct_ready");
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.estimatedCredits, 25);
});

test("long HEVC MP4 requires owner approval before conversion", () => {
  const decision = decideMediaProcessing({
    clientInspection: {
      audioCodecs: ["mp4a"],
      container: "mp4",
      isBrowserSafe: false,
      videoCodecs: ["hvc1"],
    },
    durationSeconds: 96 * 60,
    fileName: "movie.mp4",
    fileSizeBytes: 2.2 * 1024 * 1024 * 1024,
    mimeType: "video/mp4",
  });

  assert.equal(decision.strategy, "needs_approval");
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.estimatedCredits, 96);
});

test("short unsupported container converts automatically", () => {
  const decision = decideMediaProcessing({
    durationSeconds: 12 * 60,
    fileName: "clip.mkv",
    fileSizeBytes: 220 * 1024 * 1024,
    mimeType: "video/x-matroska",
  });

  assert.equal(decision.strategy, "convert");
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.estimatedCredits, 12);
});

test("large unknown-duration upload requires approval", () => {
  const decision = decideMediaProcessing({
    durationSeconds: null,
    fileName: "unknown.avi",
    fileSizeBytes: 3 * 1024 * 1024 * 1024,
    mimeType: "video/avi",
  });

  assert.equal(decision.strategy, "needs_approval");
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.estimatedCredits, null);
});

test("credit estimate rounds duration up to whole minutes", () => {
  assert.equal(estimateCloudConvertCredits(61), 2);
  assert.equal(estimateCloudConvertCredits(null), null);
});
