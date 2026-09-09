import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (n) => {
        if (n in mocks) return mocks[n];
        throw Error(n);
      },
    },
  );
  return exports;
}
const { runRoomCleanup } = load("lib/rooms/cleanup-core.ts");
test("failed live cleanup is never acknowledged and does not block other jobs", async () => {
  const acknowledged = [];
  const result = await runRoomCleanup({
    pending: async () => [
      { room_id: "fail", purge: true },
      { room_id: "good", purge: false },
    ],
    retire: async (id) => {
      if (id === "fail") throw Error("network");
    },
    finish: async (id) => {
      acknowledged.push(id);
      return true;
    },
  });
  assert.deepEqual(acknowledged, ["good"]);
  assert.equal(result.failed, 1);
  assert.equal(result.completed, 1);
});
test("failed durable acknowledgement is retried safely after live deletion", async () => {
  const calls = [];
  let accept = false;
  const deps = {
    pending: async () => [{ room_id: "room", purge: true }],
    retire: async () => calls.push("live"),
    finish: async () => {
      calls.push("ack");
      return accept;
    },
  };
  assert.equal((await runRoomCleanup(deps)).failed, 1);
  accept = true;
  assert.equal((await runRoomCleanup(deps)).completed, 1);
  assert.deepEqual(calls, ["live", "ack", "live", "ack"]);
});
const { retire_room } = load("spacetime/src/room-retirement.ts", {
  "spacetimedb/server": { t: { string: () => ({}), bool: () => ({}) } },
  "./module-schema": { spacetimedb: { reducer: (_, fn) => fn } },
  "./recommendation-authority": {
    isTrustedRecommendationAuthority: (ctx) => ctx.trusted,
  },
});
function table(rows = []) {
  const t = {
    rows,
    iter: () => rows,
    insert: (r) => rows.push(r),
    delete: (r) => rows.splice(rows.indexOf(r), 1),
  };
  t.room_id = {
    find: (id) => rows.find((r) => r.room_id === id),
    update: (r) => {
      const i = rows.findIndex((v) => v.room_id === r.room_id);
      rows[i] = r;
    },
  };
  return t;
}
function context() {
  const db = { retired_room: table() };
  for (const name of [
    "room_participant_session",
    "room_participant_presence",
    "room_participant",
    "room_permission",
    "room_seed_grant",
    "room_admission_grant",
    "room_session",
    "live_queue_item",
    "room_chat_message",
    "room_error",
    "room_kick",
    "room_member_revocation",
    "room_rhythm_profile",
    "guest_media_preference",
    "recommendation_event_outbox",
    "recommendation_event_overflow",
    "recommendation_playback_memory",
    "recommendation_playback_occurrence",
    "recommendation_processed_action",
    "recommendation_room_session",
  ])
    db[name] = table([
      { room_id: "temp", status: "playing" },
      { room_id: "persistent", status: "playing" },
    ]);
  return { trusted: true, db };
}
test("untrusted caller cannot retire a live room", () => {
  const ctx = context();
  ctx.trusted = false;
  assert.throws(
    () => retire_room(ctx, { room_id: "temp", purge: true }),
    /Trusted/,
  );
  assert.equal(ctx.db.room_session.rows.length, 2);
});
test("purge must not discard an explicit Like awaiting durable ingestion", () => {
  const ctx = context();
  ctx.db.recommendation_event_outbox.rows[0].event_type = "media_liked";
  assert.throws(
    () => retire_room(ctx, { room_id: "temp", purge: true }),
    /preferences/,
  );
  assert.equal(ctx.db.recommendation_event_outbox.rows.length, 2);
  assert.equal(ctx.db.room_session.rows.length, 2);
});
test("retirement removes authority and pauses playback; later purge deletes only that room data", () => {
  const ctx = context();
  retire_room(ctx, { room_id: "temp", purge: false });
  assert.equal(ctx.db.room_session.room_id.find("temp").status, "paused");
  assert.equal(ctx.db.room_participant_session.room_id.find("temp"), undefined);
  assert.equal(ctx.db.room_chat_message.rows.length, 2);
  retire_room(ctx, { room_id: "temp", purge: true });
  retire_room(ctx, { room_id: "temp", purge: true });
  for (const [name, t] of Object.entries(ctx.db)) {
    assert.equal(t.rows.length, 1, name);
    assert.equal(
      t.rows[0].room_id,
      name === "retired_room" ? "temp" : "persistent",
      name,
    );
  }
});
