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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-rhythm-"));

async function loadPolicy() {
  const sourcePath = path.join(root, "spacetime/src/room-rhythm-policy.ts");
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const outputPath = path.join(tempDir, "room-rhythm-policy.mjs");
  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}

const policy = await loadPolicy();

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function host(overrides = {}) {
  return {
    memberId: "host-1",
    role: "host",
    senderMatches: true,
    ...overrides,
  };
}

function session(overrides = {}) {
  return {
    hostMemberId: "host-1",
    playbackOccurrenceId: "occurrence-1",
    roomId: "room-1",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=abc123XYZ00",
    status: "playing",
    ...overrides,
  };
}

function candidate(overrides = {}) {
  return {
    algorithmVersion: "first-party-beat-v1",
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.88,
    mediaBeatOffsetSeconds: 0.125,
    mediaId: "abc123XYZ00",
    playbackOccurrenceId: "occurrence-1",
    revision: 1,
    roomId: "room-1",
    ttlMs: 12_000,
    ...overrides,
  };
}

function publish(overrides = {}) {
  return policy.evaluateRoomRhythmPublication({
    actor: host(),
    candidate: candidate(),
    current: null,
    nowMs: 10_000,
    session: session(),
    ...overrides,
  });
}

test("authoritative host publication produces the bounded public row", () => {
  assert.deepEqual(publish(), {
    accepted: true,
    row: {
      algorithmVersion: "first-party-beat-v1",
      beatIntervalSeconds: 0.5,
      bpm: 120,
      confidence: 0.88,
      expiresMs: 22_000,
      mediaBeatOffsetSeconds: 0.125,
      mediaId: "abc123XYZ00",
      playbackOccurrenceId: "occurrence-1",
      publishedMs: 10_000,
      revision: 1,
      roomId: "room-1",
      sourceType: "youtube",
    },
  });
});

test("guest, stale sender, and wrong host are denied", () => {
  for (const actor of [
    host({ role: "guest" }),
    host({ senderMatches: false }),
    host({ memberId: "other-host" }),
  ]) {
    assert.deepEqual(publish({ actor }), {
      accepted: false,
      reason: "permission_denied",
    });
  }
});

test("publication requires the exact active YouTube media occurrence", () => {
  const cases = [
    [session({ sourceType: "direct" }), candidate(), "source_mismatch"],
    [session({ status: "paused" }), candidate(), "playback_inactive"],
    [session(), candidate({ mediaId: "wrongVideo1" }), "media_mismatch"],
    [
      session(),
      candidate({ playbackOccurrenceId: "occurrence-old" }),
      "occurrence_mismatch",
    ],
    [session(), candidate({ roomId: "room-2" }), "room_mismatch"],
  ];

  for (const [activeSession, next, reason] of cases) {
    assert.deepEqual(publish({ candidate: next, session: activeSession }), {
      accepted: false,
      reason,
    });
  }
});

test("publication rejects malformed YouTube identities and lookalike hosts", () => {
  for (const sourceUrl of [
    "https://www.youtube.com/watch?v=short1",
    "https://notyoutube.com/watch?v=abc123XYZ00",
    "https://www.youtube.com.example/watch?v=abc123XYZ00",
  ]) {
    assert.deepEqual(publish({ session: session({ sourceUrl }) }), {
      accepted: false,
      reason: "media_mismatch",
    });
  }
});

test("publication rejects non-finite, out-of-range, and inconsistent rhythm", () => {
  const cases = [
    candidate({ bpm: Number.NaN }),
    candidate({ bpm: 39 }),
    candidate({ bpm: 241 }),
    candidate({ beatIntervalSeconds: Number.POSITIVE_INFINITY }),
    candidate({ beatIntervalSeconds: 0.7 }),
    candidate({ mediaBeatOffsetSeconds: -0.1 }),
    candidate({ mediaBeatOffsetSeconds: 0.5 }),
    candidate({ confidence: 0.49 }),
    candidate({ confidence: 1.01 }),
    candidate({ algorithmVersion: "" }),
    candidate({ algorithmVersion: "x".repeat(49) }),
    candidate({ ttlMs: 4_999 }),
    candidate({ ttlMs: 15_001 }),
  ];

  for (const next of cases) {
    assert.equal(publish({ candidate: next }).accepted, false);
  }
});

test("revision and rate limits reject stale or excessive updates", () => {
  const current = publish().row;

  assert.deepEqual(
    publish({
      candidate: candidate({ revision: 1 }),
      current,
      nowMs: 13_000,
    }),
    { accepted: false, reason: "revision_mismatch" },
  );
  assert.deepEqual(
    publish({
      candidate: candidate({ revision: 2 }),
      current,
      nowMs: 11_999,
    }),
    { accepted: false, reason: "rate_limited" },
  );
  assert.equal(
    publish({
      candidate: candidate({ revision: 2 }),
      current,
      nowMs: 12_000,
    }).accepted,
    true,
  );
});

test("new playback occurrence can replace a stale row without rate delay", () => {
  const current = publish().row;
  const nextSession = session({ playbackOccurrenceId: "occurrence-2" });
  const nextCandidate = candidate({
    playbackOccurrenceId: "occurrence-2",
    revision: 2,
  });

  assert.equal(
    publish({
      candidate: nextCandidate,
      current,
      nowMs: 10_500,
      session: nextSession,
    }).accepted,
    true,
  );
});

test("clear is host-only and stale-safe", () => {
  const current = publish().row;
  const base = {
    actor: host(),
    current,
    expectedPlaybackOccurrenceId: "occurrence-1",
    expectedRevision: 1,
    roomId: "room-1",
    session: session(),
  };

  assert.deepEqual(policy.evaluateRoomRhythmClear(base), { accepted: true });
  assert.deepEqual(
    policy.evaluateRoomRhythmClear({
      ...base,
      actor: host({ role: "guest" }),
    }),
    { accepted: false, reason: "permission_denied" },
  );
  assert.deepEqual(
    policy.evaluateRoomRhythmClear({ ...base, expectedRevision: 0 }),
    { accepted: false, reason: "revision_mismatch" },
  );
  assert.deepEqual(
    policy.evaluateRoomRhythmClear({
      ...base,
      expectedPlaybackOccurrenceId: "occurrence-old",
    }),
    { accepted: false, reason: "occurrence_mismatch" },
  );
});
