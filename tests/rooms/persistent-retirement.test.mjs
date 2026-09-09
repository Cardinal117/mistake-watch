import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
function load(file, mocks) {
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
      require(name) {
        if (name === "server-only") return {};
        if (name in mocks) return mocks[name];
        throw Error(name);
      },
    },
  );
  return exports;
}
const core = load("lib/rooms/cleanup-core.ts", {});
function worker({
  jobs = [],
  failLive = false,
  failDrain = false,
  rejectAck = false,
} = {}) {
  const calls = [];
  const api = load("lib/rooms/persistent-retirement.ts", {
    "./cleanup-core": core,
    "./shared-live-revocation": {
      retireLiveRoom: async (id, purge) => {
        calls.push(["retire", id, purge]);
        if (failLive) throw Error("offline");
      },
    },
    "@/lib/recommendations/durable-outbox-drain": {
      drainDurableRecommendationOutbox: async () => {
        calls.push(["drain"]);
        if (failDrain) throw Error("offline");
      },
    },
    "@/lib/supabase": {
      createSupabaseAdminClient: () => ({
        rpc: async (name, args) => {
          calls.push([name, args]);
          return {
            error: null,
            data:
              name === "pending_persistent_room_retirements"
                ? jobs
                : !rejectAck,
          };
        },
      }),
    },
  });
  return { calls, run: api.cleanupPersistentRooms };
}
test("unknown/open room cannot be retired just by supplying an ID", async () => {
  const w = worker();
  assert.equal((await w.run("open")).completed, 0);
  assert.equal(w.calls.length, 1);
});
test("live outage leaves the durable job unacknowledged", async () => {
  const w = worker({
    jobs: [{ room_id: "closed", purge: false }],
    failLive: true,
  });
  assert.equal((await w.run()).failed, 1);
  assert.equal(
    w.calls.some(([n]) => n === "finish_persistent_room_retirement"),
    false,
  );
});
test("delete stops authority even when preference drain fails; purge stays pending", async () => {
  const w = worker({
    jobs: [{ room_id: "deleted", purge: true }],
    failDrain: true,
  });
  assert.equal((await w.run()).failed, 1);
  assert.deepEqual(w.calls.slice(1), [["retire", "deleted", false], ["drain"]]);
});
test("purge preserves preferences before deletion and a superseded ack is not success", async () => {
  const w = worker({
    jobs: [{ room_id: "deleted", purge: true }],
    rejectAck: true,
  });
  assert.equal((await w.run()).failed, 1);
  assert.deepEqual(w.calls.slice(1, 4), [
    ["retire", "deleted", false],
    ["drain"],
    ["retire", "deleted", true],
  ]);
});
test("closed room retains live queue/history; only a delete job purges", async () => {
  const w = worker({ jobs: [{ room_id: "closed", purge: false }] });
  assert.equal((await w.run()).completed, 1);
  assert.deepEqual(
    w.calls.filter(([n]) => n === "retire"),
    [["retire", "closed", false]],
  );
  assert.equal(
    w.calls.some(([n]) => n === "drain"),
    false,
  );
});
// Exercise real reducer branches with an already-issued grant and a terminal marker.
const participation = load("spacetime/src/room-participation.ts", {
  "spacetimedb/server": { t: new Proxy({}, { get: () => () => ({}) }) },
  "./module-schema": {
    spacetimedb: { reducer: (_, fn) => fn, clientDisconnected: (fn) => fn },
  },
  "./normalization": {},
  "./room-errors": {},
  "./room-participant-state": {},
  "./recommendation-authority": {
    isTrustedRecommendationAuthority: () => true,
  },
  "./room-keys": { kickKey: () => "kick" },
  "./room-admission": {
    getCurrentParticipantSession: () => null,
    getValidRoomAdmissionGrant: () => {
      throw Error("Stale grant must not be evaluated");
    },
  },
});
const ctx = {
  db: {
    retired_room: { room_id: { find: () => ({ room_id: "closed" }) } },
    room_session: { room_id: { find: () => ({ host_member_id: "host" }) } },
    room_kick: { kick_key: { find: () => null } },
    room_member_revocation: { revocation_key: { find: () => null } },
  },
};
test("retired room rejects replay of an old host admission before grant validation", () => {
  assert.throws(
    () =>
      participation.join_room(ctx, {
        room_id: "closed",
        member_id: "host",
        role: "host",
        admission_id: "old",
        admission_token: "old",
      }),
    /Room is closed/,
  );
});
test("even trusted admission issuer cannot mint access to a retired room", () => {
  assert.throws(
    () =>
      participation.issue_room_admission_grant(ctx, {
        room_id: "closed",
        member_id: "host",
      }),
    /Room is closed/,
  );
});
