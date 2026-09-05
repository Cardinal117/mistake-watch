import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
const source = readFileSync("spacetime/src/prepared-youtube.ts", "utf8");
function run(name, patch = {}, argsPatch = {}) {
  const calls = [];
  const session = {
    room_id: "room",
    source_url: "old",
    active_queue_item_id: "old-item",
    playback_occurrence_id: "occurrence",
    queue_autoplay_enabled: true,
    status: "paused",
    position_seconds: 0,
    server_updated_ms: 100,
    source_type: "youtube",
    ...patch,
  };
  const next = {
    queue_item_id: "next",
    source_type: "youtube",
    source_url: "next-url",
    is_unavailable: false,
  };
  const mod = { exports: {} };
  const type = {
    default() {
      return this;
    },
  };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: mod,
      exports: mod.exports,
      t: { string: () => type, f64: () => type, option: () => type },
      spacetimedb: { reducer: (_, fn) => fn },
      require(spec) {
        if (spec === "spacetimedb/server")
          return {
            t: { string: () => type, f64: () => type, option: () => type },
          };
        if (spec === "./module-schema")
          return { spacetimedb: { reducer: (_, fn) => fn } };
        if (spec === "./recommendation-events")
          return {
            classifyPlaybackAdvance: () => ({}),
            completionRatioBps: () => 10000,
          };
        throw new Error(spec);
      },
    },
  );
  const registered = mod.exports.registerPreparedYouTubeReducers({
    getAuthorizedPlaybackActor: () => (patch.denied ? null : { session }),
    nextPlaybackQueueItem: () => next,
    commitQueueAdvance: (...args) =>
      calls.push({ kind: "prepare", status: args[4] }),
    classifyPlaybackAdvance: () => ({}),
    applyPlaybackUpdate: (...args) =>
      calls.push({ kind: "start", position: args[2], status: args[4] }),
  });
  registered[name === "prepare_youtube_autoplay" ? "prepare" : "start"](
    {},
    {
      actor_member_id: "host",
      room_id: "room",
      expected_source_url: "old",
      expected_active_queue_item_id: "old-item",
      expected_playback_occurrence_id: "occurrence",
      expected_next_queue_item_id: "next",
      expected_server_updated_ms: 100,
      position_seconds: 0.1,
      ...argsPatch,
    },
  );
  return calls;
}
test("prepare selects the verified next YouTube item without advancing its clock", () =>
  assert.deepEqual(run("prepare_youtube_autoplay"), [
    { kind: "prepare", status: "paused" },
  ]));
for (const patch of [
  { denied: true },
  { server_updated_ms: 101 },
  { queue_autoplay_enabled: false },
  { source_url: "changed" },
  { playback_occurrence_id: "new" },
])
  test(
    "prepare rejects denied or stale authority " + JSON.stringify(patch),
    () => assert.deepEqual(run("prepare_youtube_autoplay", patch), []),
  );
test("ready starts only the still-current paused source", () =>
  assert.deepEqual(run("start_prepared_youtube"), [
    { kind: "start", position: 0.1, status: "playing" },
  ]));
for (const patch of [
  { denied: true },
  { queue_autoplay_enabled: false },
  { server_updated_ms: 101 },
  { status: "playing" },
  { position_seconds: 25 },
  { source_url: "changed" },
])
  test(
    "late ready cannot overwrite newer command " + JSON.stringify(patch),
    () => assert.deepEqual(run("start_prepared_youtube", patch), []),
  );
