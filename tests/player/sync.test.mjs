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

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-sync-"));
const syncSourcePath = path.join(rootDir, "lib/player/sync.ts");
const syncSource = await readFile(syncSourcePath, "utf8");
const syncJs = ts.transpileModule(syncSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: syncSourcePath,
}).outputText;
const syncModulePath = path.join(tempDir, "sync.mjs");

await writeFile(syncModulePath, syncJs);

const { chooseSyncCorrection, DEFAULT_SYNC_THRESHOLDS, expectedPositionAt } =
  await import(pathToFileURL(syncModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function playbackState(overrides = {}) {
  return {
    activeQueueItemId: null,
    controllerMemberId: "member-host",
    hostMemberId: "member-host",
    mode: "watch",
    playbackRate: 1,
    positionSeconds: 10,
    roomId: "room-1",
    serverUpdatedAtMs: 1_000,
    source: {
      durationSeconds: 120,
      kind: "direct",
      url: "https://example.com/movie.mp4",
    },
    status: "playing",
    ...overrides,
  };
}

test("expectedPositionAt advances playing state from the server timestamp", () => {
  assert.equal(expectedPositionAt(playbackState(), 3_500), 12.5);
});

test("expectedPositionAt does not advance paused or buffering states", () => {
  assert.equal(
    expectedPositionAt(playbackState({ status: "paused" }), 3_500),
    10,
  );
  assert.equal(
    expectedPositionAt(playbackState({ status: "buffering" }), 3_500),
    10,
  );
});

test("expectedPositionAt clamps negative timestamps and media duration", () => {
  assert.equal(expectedPositionAt(playbackState(), 500), 10);
  assert.equal(
    expectedPositionAt(
      playbackState({
        positionSeconds: 119,
        source: {
          durationSeconds: 120,
          kind: "direct",
          url: "https://example.com/movie.mp4",
        },
      }),
      5_000,
    ),
    120,
  );
});

test("chooseSyncCorrection leaves a settled playing client alone", () => {
  assert.deepEqual(
    chooseSyncCorrection({
      clientNowMs: 3_000,
      local: {
        paused: false,
        playbackRate: 1,
        positionSeconds: 12.02,
      },
      state: playbackState(),
    }),
    {
      driftSeconds: -0.019999999999999574,
      kind: "none",
      targetPositionSeconds: 12,
    },
  );
});

test("chooseSyncCorrection uses rate correction for small drift", () => {
  const correction = chooseSyncCorrection({
    clientNowMs: 3_000,
    local: {
      paused: false,
      playbackRate: 1,
      positionSeconds: 11.8,
    },
    state: playbackState(),
  });

  assert.equal(correction.kind, "set-playback-rate");
  assert.equal(correction.targetPositionSeconds, 12);
  assert.ok(correction.playbackRate > 1);
  assert.ok(
    correction.playbackRate <= 1 + DEFAULT_SYNC_THRESHOLDS.maxRateCorrection,
  );
});

test("chooseSyncCorrection does not use rate correction for YouTube playback", () => {
  const correction = chooseSyncCorrection({
    clientNowMs: 3_000,
    local: {
      paused: false,
      playbackRate: 1,
      positionSeconds: 11.8,
    },
    state: playbackState({
      source: {
        durationSeconds: 120,
        kind: "youtube",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    }),
  });

  assert.equal(correction.kind, "none");
  assert.equal(correction.targetPositionSeconds, 12);
});

test("chooseSyncCorrection does not use rate correction in listen mode", () => {
  const correction = chooseSyncCorrection({
    clientNowMs: 3_000,
    local: {
      paused: false,
      playbackRate: 1,
      positionSeconds: 11.4,
    },
    state: playbackState({
      mode: "listen",
      source: {
        durationSeconds: 120,
        kind: "direct",
        url: "https://example.com/song.mp3",
      },
    }),
  });

  assert.equal(correction.kind, "none");
  assert.equal(correction.targetPositionSeconds, 12);
});

test("chooseSyncCorrection seeks listen mode only after meaningful drift", () => {
  const correction = chooseSyncCorrection({
    clientNowMs: 3_000,
    local: {
      paused: false,
      playbackRate: 1,
      positionSeconds: 11,
    },
    state: playbackState({
      mode: "listen",
      source: {
        durationSeconds: 120,
        kind: "direct",
        url: "https://example.com/song.mp3",
      },
    }),
  });

  assert.equal(correction.kind, "seek");
  assert.equal(correction.targetPositionSeconds, 12);
});

test("chooseSyncCorrection seeks for medium drift and hard-seeks for large drift", () => {
  assert.equal(
    chooseSyncCorrection({
      clientNowMs: 3_000,
      local: {
        paused: false,
        playbackRate: 1,
        positionSeconds: 11.4,
      },
      state: playbackState(),
    }).kind,
    "seek",
  );

  assert.equal(
    chooseSyncCorrection({
      clientNowMs: 3_000,
      local: {
        paused: false,
        playbackRate: 1,
        positionSeconds: 8,
      },
      state: playbackState(),
    }).kind,
    "hard-seek",
  );
});

test("chooseSyncCorrection pauses and aligns when the canonical state is paused", () => {
  assert.deepEqual(
    chooseSyncCorrection({
      clientNowMs: 3_000,
      local: {
        paused: false,
        playbackRate: 1,
        positionSeconds: 12,
      },
      state: playbackState({ status: "paused" }),
    }),
    {
      driftSeconds: -2,
      kind: "pause-and-seek",
      targetPositionSeconds: 10,
    },
  );
});

test("chooseSyncCorrection surfaces autoplay blocks without pretending sync succeeded", () => {
  assert.equal(
    chooseSyncCorrection({
      clientNowMs: 3_000,
      local: {
        autoplayBlocked: true,
        paused: true,
        playbackRate: 1,
        positionSeconds: 12,
      },
      state: playbackState(),
    }).kind,
    "user-interaction-required",
  );
});
