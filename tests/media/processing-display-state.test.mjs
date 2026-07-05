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
  path.join(tmpdir(), "mistake-watch-processing-display-state-"),
);
const statusTempDir = path.join(tempDir, "status");
const mediaTempDir = path.join(tempDir, "media");
await mkdir(statusTempDir, { recursive: true });
await mkdir(mediaTempDir, { recursive: true });

async function transpileToTemp(sourcePath, targetPath, transform = (value) => value) {
  const sourceText = transform(await readFile(sourcePath, "utf8"));
  const sourceJs = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  await writeFile(targetPath, sourceJs);
}

await transpileToTemp(
  path.join(rootDir, "lib/status/display-state.ts"),
  path.join(statusTempDir, "display-state.mjs"),
);
await transpileToTemp(
  path.join(rootDir, "lib/media/processing-display-state.ts"),
  path.join(mediaTempDir, "processing-display-state.mjs"),
  (source) =>
    source.replace(
      'from "../status/display-state"',
      'from "../status/display-state.mjs"',
    ),
);

const {
  resolveMediaAssetDisplayState,
  resolveRecoverableUploadDisplayState,
  resolveUploadProgressDisplayState,
} = await import(pathToFileURL(path.join(mediaTempDir, "processing-display-state.mjs")));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("upload progress exposes only real measured progress", () => {
  const state = resolveUploadProgressDisplayState({
    detail: "Uploading movie.mp4 (420 MB of 1 GB)",
    label: "Uploading",
    phase: "uploading",
    progressPercent: 42,
  });

  assert.equal(state.state, "uploading");
  assert.equal(state.label, "Uploading");
  assert.equal(state.progressPercent, 42);
});

test("ready converted media stays ready instead of converting", () => {
  const state = resolveMediaAssetDisplayState({
    processingStatus: "ready",
    processingStrategy: "convert",
    status: "ready",
    title: "Episode 2",
  });

  assert.equal(state.state, "ready");
  assert.equal(state.label, "Ready");
});

test("CloudConvert queued state does not expose fake progress", () => {
  const state = resolveMediaAssetDisplayState({
    processingStatus: "queued",
    processingStrategy: "convert",
    status: "processing",
    title: "Episode 1",
  });

  assert.equal(state.state, "queued");
  assert.equal(state.label, "Queued");
  assert.equal(state.progressPercent, undefined);
});

test("approval-required media maps to a blocked owner action", () => {
  const state = resolveMediaAssetDisplayState({
    processingDecisionReason: "Long HEVC file likely needs conversion.",
    processingEstimatedCredits: 96,
    processingRequiresApproval: true,
    processingStatus: "approval_required",
    processingStrategy: "needs_approval",
    title: "Movie",
  });

  assert.equal(state.state, "blocked");
  assert.equal(state.label, "Needs approval");
  assert.equal(state.primaryAction?.label, "Approve conversion");
});

test("failed media exposes retryable failure copy", () => {
  const state = resolveMediaAssetDisplayState({
    processingErrorMessage: "CloudConvert rejected the job.",
    processingStatus: "failed",
    status: "failed",
    title: "Broken upload",
  });

  assert.equal(state.state, "failed");
  assert.equal(state.tone, "danger");
  assert.match(state.detail, /CloudConvert rejected/);
  assert.equal(state.primaryAction?.label, "Retry conversion");
});

test("recoverable multipart sessions keep saved byte progress", () => {
  const state = resolveRecoverableUploadDisplayState({
    bytesUploaded: 512,
    fileName: "large.mkv",
    fileSizeBytes: 1024,
    resumable: true,
    resumableUntil: "tomorrow",
    status: "paused",
  });

  assert.equal(state.state, "recoverable");
  assert.equal(state.label, "Paused");
  assert.equal(state.progressPercent, 50);
  assert.equal(state.primaryAction?.label, "Resume");
});

test("expired multipart sessions become failed cleanup states", () => {
  const state = resolveRecoverableUploadDisplayState({
    bytesUploaded: 512,
    fileName: "large.mkv",
    fileSizeBytes: 1024,
    resumable: false,
    status: "expired",
  });

  assert.equal(state.state, "failed");
  assert.equal(state.label, "Expired");
  assert.equal(state.secondaryAction?.label, "Cancel upload");
});
