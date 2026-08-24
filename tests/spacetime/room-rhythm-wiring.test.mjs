import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("public room rhythm schema contains only the bounded shared contract", async () => {
  const table = await source("spacetime/src/room-rhythm-table.ts");

  for (const field of [
    "room_id",
    "source_type",
    "media_id",
    "playback_occurrence_id",
    "bpm",
    "beat_interval_seconds",
    "media_beat_offset_seconds",
    "confidence",
    "algorithm_version",
    "revision",
    "published_ms",
    "expires_ms",
  ]) {
    assert.match(table, new RegExp(`\\b${field}\\b`));
  }

  for (const forbidden of [
    "source_url",
    "title",
    "extension_id",
    "account",
    "participant",
    "audio",
    "frequency",
    "spectrum",
    "waveform",
    "energy",
    "onset",
  ]) {
    assert.doesNotMatch(table, new RegExp(`\\b${forbidden}\\b`, "i"));
  }
});

test("publish and clear reducers enforce participant-sender authority through policy", async () => {
  const reducers = await source("spacetime/src/room-rhythm.ts");

  assert.match(reducers, /export const publish_room_rhythm_profile/);
  assert.match(reducers, /export const clear_room_rhythm_profile/);
  assert.match(reducers, /isParticipantSender\(ctx, actor\)/);
  assert.match(reducers, /evaluateRoomRhythmPublication/);
  assert.match(reducers, /evaluateRoomRhythmClear/);
  assert.doesNotMatch(reducers, /visual_frame|spectrum|waveform|energy|onset/i);
});

test("module, generated client, subscription, and snapshot expose room rhythm", async () => {
  const [moduleSchema, entrypoint, adapter, snapshot, clientTypes] =
    await Promise.all([
      source("spacetime/src/module-schema.ts"),
      source("spacetime/src/index.ts"),
      source("lib/spacetime/adapter.ts"),
      source("lib/spacetime/live-room/snapshot.ts"),
      source("lib/spacetime/live-room/client-types.ts"),
    ]);

  assert.match(moduleSchema, /room_rhythm_profile:\s*roomRhythmProfile/);
  assert.match(
    entrypoint,
    /clear_room_rhythm_profile,[\s\S]*publish_room_rhythm_profile,[\s\S]*from "\.\/room-rhythm"/,
  );
  assert.match(
    adapter,
    /SELECT \* FROM room_rhythm_profile WHERE room_id = '\$\{safeRoomId\}'/,
  );
  assert.match(snapshot, /roomRhythmProfile:/);
  assert.match(clientTypes, /room_rhythm_profile:/);
  assert.match(clientTypes, /publishRoomRhythmProfile/);
  assert.match(clientTypes, /clearRoomRhythmProfile/);
});

test("Listen host publisher is sequence-bounded and clears unusable profiles", async () => {
  const [publisher, layout] = await Promise.all([
    source("lib/audio-companion/use-room-rhythm-publication.ts"),
    source("components/room/listen/listen-mode-layout.tsx"),
  ]);

  assert.match(publisher, /lastProcessedSequenceRef/);
  assert.match(publisher, /selectRoomRhythmPublicationContext/);
  assert.match(publisher, /observeStableRoomRhythm/);
  assert.match(publisher, /publishRoomRhythmProfile/);
  assert.match(publisher, /clearRoomRhythmProfile/);
  assert.match(publisher, /ROOM_RHYTHM_REFRESH_MS/);
  assert.doesNotMatch(
    publisher,
    /setInterval\([^,]+,\s*(?:[0-9]{1,3}|1[0-9]{3})\s*\)/,
  );
  assert.match(layout, /useRoomRhythmPublication/);
});
