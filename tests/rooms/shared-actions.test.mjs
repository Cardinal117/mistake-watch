import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(
  readFileSync(
    new URL("../../lib/rooms/shared-actions.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function fixture({
  self = false,
  denied = false,
  liveFailure = false,
  ackFailure = false,
} = {}) {
  const calls = [];
  const exports = {};
  const client = {
    rpc: async (name, args) => {
      calls.push(name);
      assert.deepEqual(
        JSON.parse(JSON.stringify(args)),
        self
          ? { target_room: "room" }
          : {
              target_room: "room",
              target_user: "friend",
              approve: false,
            },
      );
      return denied
        ? { error: new Error("denied"), data: null }
        : { error: null, data: "retired-member" };
    },
  };
  vm.runInNewContext(code, {
    exports,
    process,
    require: (name) => {
      if (name === "@/lib/supabase")
        return {
          createSupabaseServerClient: async () => client,
          createSupabaseAdminClient: () => ({
            rpc: async (name, args) => {
              calls.push(name);
              assert.equal(args.target_member, "retired-member");
              return {
                error: ackFailure ? new Error("ack unavailable") : null,
              };
            },
          }),
        };
      if (name === "./shared-live-revocation")
        return {
          revokeLiveMembership: async (room, member) => {
            calls.push("live-revoke");
            assert.equal(room, "room");
            assert.equal(member, "retired-member");
            if (liveFailure) throw new Error("unavailable");
          },
        };
      throw new Error(name);
    },
  });
  return {
    calls,
    run: () =>
      self
        ? exports.leaveSharedRoomAction("room")
        : exports.decideSharedMembershipAction("room", "friend", false),
  };
}
// Additional failure-path coverage after implementation, not test-first evidence.
test("Shared removal acknowledges only after durable and live revocation succeed", async () => {
  const f = fixture();
  assert.equal((await f.run()).ok, true);
  assert.deepEqual(f.calls, [
    "decide_shared_membership",
    "live-revoke",
    "ack_shared_revocation",
  ]);
});
test("Rejected owner decision never sends privileged live revocation", async () => {
  const f = fixture({ denied: true });
  assert.ok((await f.run()).error);
  assert.deepEqual(f.calls, ["decide_shared_membership"]);
});
for (const options of [{ liveFailure: true }, { ackFailure: true }])
  test(`Shared removal reports retry rather than false completion: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.match((await f.run()).error, /still needs a retry/);
    if (options.liveFailure)
      assert.ok(!f.calls.includes("ack_shared_revocation"));
  });

for (const options of [
  {},
  { denied: true },
  { liveFailure: true },
  { ackFailure: true },
])
  test(`Shared self-withdrawal handles failure truthfully: ${JSON.stringify(options)}`, async () => {
    const f = fixture({ self: true, ...options });
    const result = await f.run();
    assert.equal(
      Boolean(result.ok),
      !options.denied && !options.liveFailure && !options.ackFailure,
    );
    if (options.denied) assert.deepEqual(f.calls, ["leave_shared_room"]);
    else {
      assert.ok(f.calls.includes("live-revoke"));
      if (options.liveFailure)
        assert.ok(!f.calls.includes("ack_shared_revocation"));
    }
    if (options.liveFailure || options.ackFailure)
      assert.match(result.error, /still needs a retry/);
  });
