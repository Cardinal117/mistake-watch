import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-phase-"));
const sourcePath = path.join(root, "lib/audio-companion/room-rhythm.ts");
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const outputPath = path.join(tempDir, "room-rhythm.mjs");
await writeFile(outputPath, output);
const rhythm = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function frame(overrides = {}) {
  return {
    bass: 0.4,
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.1,
    bpm: 120,
    confidence: 0.9,
    energy: 0.5,
    highs: 0.2,
    mids: 0.3,
    onset: 0.8,
    sampledAtSeconds: 12,
    sequence: 4,
    version: 1,
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    algorithmVersion: "first-party-beat-v1",
    currentRevision: 0,
    mediaId: "abc123XYZ00",
    mediaPositionSeconds: 42.25,
    playbackOccurrenceId: "occurrence-1",
    ...overrides,
  };
}

test("capture beat lattice maps deterministically into media time", () => {
  assert.equal(
    rhythm.mapCaptureBeatOffsetToMediaTime({
      beatIntervalSeconds: 0.5,
      captureBeatOffsetSeconds: 0.1,
      captureSampledAtSeconds: 12,
      mediaPositionSeconds: 42.25,
    }),
    0.35,
  );
});

test("publication requires two consistent locked observations", () => {
  const first = rhythm.observeStableRoomRhythm(null, {
    context: context(),
    frame: frame(),
  });

  assert.equal(first.publication, null);
  assert.equal(first.state.consistentObservations, 1);

  const second = rhythm.observeStableRoomRhythm(first.state, {
    context: context({ mediaPositionSeconds: 42.5 }),
    frame: frame({ sampledAtSeconds: 12.25, sequence: 5 }),
  });

  assert.deepEqual(second.publication, {
    algorithmVersion: "first-party-beat-v1",
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.9,
    mediaBeatOffsetSeconds: 0.35,
    mediaId: "abc123XYZ00",
    playbackOccurrenceId: "occurrence-1",
    revision: 1,
    ttlMs: 12_000,
  });
});

test("publication attempts are immediate initially and bounded after acceptance", () => {
  assert.equal(
    rhythm.isRoomRhythmPublicationDue({
      hasPublishedProfile: false,
      lastAttemptMs: null,
      nowMs: 1_000,
    }),
    true,
  );
  assert.equal(
    rhythm.isRoomRhythmPublicationDue({
      hasPublishedProfile: false,
      lastAttemptMs: 1_000,
      nowMs: 2_999,
    }),
    false,
  );
  assert.equal(
    rhythm.isRoomRhythmPublicationDue({
      hasPublishedProfile: false,
      lastAttemptMs: 1_000,
      nowMs: 3_000,
    }),
    true,
  );
  assert.equal(
    rhythm.isRoomRhythmPublicationDue({
      hasPublishedProfile: true,
      lastAttemptMs: 3_000,
      nowMs: 8_999,
    }),
    false,
  );
  assert.equal(
    rhythm.isRoomRhythmPublicationDue({
      hasPublishedProfile: true,
      lastAttemptMs: 3_000,
      nowMs: 9_000,
    }),
    true,
  );
});

test("low confidence and changed occurrences reset stability", () => {
  const first = rhythm.observeStableRoomRhythm(null, {
    context: context(),
    frame: frame(),
  });
  const lowConfidence = rhythm.observeStableRoomRhythm(first.state, {
    context: context(),
    frame: frame({ confidence: 0.49, sequence: 5 }),
  });
  assert.equal(lowConfidence.publication, null);
  assert.equal(lowConfidence.state, null);

  const changed = rhythm.observeStableRoomRhythm(first.state, {
    context: context({
      mediaPositionSeconds: 0,
      playbackOccurrenceId: "occurrence-2",
    }),
    frame: frame({ sampledAtSeconds: 12.5, sequence: 6 }),
  });
  assert.equal(changed.publication, null);
  assert.equal(changed.state.consistentObservations, 1);
});

test("unstable tempo does not publish", () => {
  const first = rhythm.observeStableRoomRhythm(null, {
    context: context(),
    frame: frame(),
  });
  const second = rhythm.observeStableRoomRhythm(first.state, {
    context: context({ mediaPositionSeconds: 42.5 }),
    frame: frame({
      beatIntervalSeconds: 60 / 132,
      bpm: 132,
      sampledAtSeconds: 12.25,
      sequence: 5,
    }),
  });

  assert.equal(second.publication, null);
  assert.equal(second.state.consistentObservations, 1);
});

test("a shifted beat lattice resets stability even when BPM is unchanged", () => {
  const first = rhythm.observeStableRoomRhythm(null, {
    context: context(),
    frame: frame(),
  });
  const shifted = rhythm.observeStableRoomRhythm(first.state, {
    context: context({ mediaPositionSeconds: 42.65 }),
    frame: frame({ sampledAtSeconds: 12.25, sequence: 5 }),
  });

  assert.equal(shifted.publication, null);
  assert.equal(shifted.state.consistentObservations, 1);
});

test("shared profile requires exact media, occurrence, version, and freshness", () => {
  const profile = {
    algorithmVersion: "first-party-beat-v1",
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.9,
    expiresMs: 30_000,
    mediaBeatOffsetSeconds: 0.35,
    mediaId: "abc123XYZ00",
    playbackOccurrenceId: "occurrence-1",
    publishedMs: 20_000,
    revision: 1,
    roomId: "room-1",
    sourceType: "youtube",
  };
  const active = {
    algorithmVersion: "first-party-beat-v1",
    mediaId: "abc123XYZ00",
    nowMs: 29_999,
    playbackOccurrenceId: "occurrence-1",
  };

  assert.equal(rhythm.isUsableRoomRhythmProfile(profile, active), true);
  assert.equal(
    rhythm.isUsableRoomRhythmProfile(profile, {
      ...active,
      mediaId: "different01",
    }),
    false,
  );
  assert.equal(
    rhythm.isUsableRoomRhythmProfile(profile, {
      ...active,
      playbackOccurrenceId: "occurrence-2",
    }),
    false,
  );
  assert.equal(
    rhythm.isUsableRoomRhythmProfile(profile, {
      ...active,
      algorithmVersion: "future-v2",
    }),
    false,
  );
  assert.equal(
    rhythm.isUsableRoomRhythmProfile(profile, { ...active, nowMs: 30_000 }),
    false,
  );
});

test("participants reconstruct phase from the shared playback clock", () => {
  assert.equal(
    rhythm.roomRhythmPhase({
      beatIntervalSeconds: 0.5,
      mediaBeatOffsetSeconds: 0.35,
      mediaPositionSeconds: 42.475,
    }),
    0.25,
  );
});

test("host publication context requires admitted connected YouTube playback", () => {
  const valid = {
    algorithmVersion: "first-party-beat-v1",
    canManageAuthority: true,
    connectionStatus: "connected",
    currentRevision: 2,
    mediaId: "abc123XYZ00",
    mediaPositionSeconds: 18.5,
    playbackOccurrenceId: "occurrence-1",
    playbackStatus: "playing",
    sourceType: "youtube",
  };

  assert.deepEqual(rhythm.selectRoomRhythmPublicationContext(valid), {
    algorithmVersion: "first-party-beat-v1",
    currentRevision: 2,
    mediaId: "abc123XYZ00",
    mediaPositionSeconds: 18.5,
    playbackOccurrenceId: "occurrence-1",
  });

  for (const blocked of [
    { ...valid, canManageAuthority: false },
    { ...valid, connectionStatus: "disconnected" },
    { ...valid, mediaId: null },
    { ...valid, playbackOccurrenceId: null },
    { ...valid, playbackStatus: "paused" },
    { ...valid, sourceType: "direct" },
  ]) {
    assert.equal(rhythm.selectRoomRhythmPublicationContext(blocked), null);
  }
});
