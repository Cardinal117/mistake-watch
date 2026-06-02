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
  path.join(tmpdir(), "mistake-watch-youtube-autoplay-"),
);
const sourcePath = path.join(
  rootDir,
  "lib/player/youtube-autoplay-continuity.ts",
);
const outputPath = path.join(tempDir, "youtube-autoplay-continuity.mjs");
const js = ts.transpileModule(await readFile(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, js);

const {
  isNearYouTubeEnd,
  shouldFallbackAdvanceYouTubeQueue,
  YOUTUBE_ENDED_GRACE_SECONDS,
  YOUTUBE_NEAR_END_THRESHOLD_SECONDS,
} = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("near-end detection starts shortly before the YouTube duration ends", () => {
  assert.equal(
    isNearYouTubeEnd({
      durationSeconds: 180,
      expectedPositionSeconds: 180 - YOUTUBE_NEAR_END_THRESHOLD_SECONDS,
    }),
    true,
  );
  assert.equal(
    isNearYouTubeEnd({
      durationSeconds: 180,
      expectedPositionSeconds: 178,
    }),
    false,
  );
});

test("fallback advancement waits for the ended grace window", () => {
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({
      activeKey: "queue-item-1",
      alreadyAdvancedKey: null,
      canAdvance: true,
      durationSeconds: 180,
      expectedPositionSeconds: 180 + YOUTUBE_ENDED_GRACE_SECONDS - 0.1,
      hasNextItem: true,
      isPlaying: true,
      queueAutoplayEnabled: true,
    }),
    false,
  );
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({
      activeKey: "queue-item-1",
      alreadyAdvancedKey: null,
      canAdvance: true,
      durationSeconds: 180,
      expectedPositionSeconds: 180 + YOUTUBE_ENDED_GRACE_SECONDS,
      hasNextItem: true,
      isPlaying: true,
      queueAutoplayEnabled: true,
    }),
    true,
  );
});

test("fallback advancement requires playback authority and queue autoplay", () => {
  const baseInput = {
    activeKey: "queue-item-1",
    alreadyAdvancedKey: null,
    canAdvance: true,
    durationSeconds: 180,
    expectedPositionSeconds: 183,
    hasNextItem: true,
    isPlaying: true,
    queueAutoplayEnabled: true,
  };

  assert.equal(shouldFallbackAdvanceYouTubeQueue(baseInput), true);
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({ ...baseInput, canAdvance: false }),
    false,
  );
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({
      ...baseInput,
      queueAutoplayEnabled: false,
    }),
    false,
  );
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({ ...baseInput, hasNextItem: false }),
    false,
  );
});

test("fallback advancement only fires once for an active queue item", () => {
  assert.equal(
    shouldFallbackAdvanceYouTubeQueue({
      activeKey: "queue-item-1",
      alreadyAdvancedKey: "queue-item-1",
      canAdvance: true,
      durationSeconds: 180,
      expectedPositionSeconds: 183,
      hasNextItem: true,
      isPlaying: true,
      queueAutoplayEnabled: true,
    }),
    false,
  );
});
