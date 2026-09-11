import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function fixture(failedTable) {
  const client = {
    from(table) {
      const result = {
        data: table === "rooms" ? { id: "room", room_kind: "personal" } : [],
        error:
          table === failedTable
            ? new Error("temporary database failure")
            : null,
      };
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        neq() {
          return this;
        },
        order() {
          return Promise.resolve(result);
        },
        maybeSingle() {
          return Promise.resolve(result);
        },
      };
    },
  };
  const exports = {};
  const stubs = {
    "@/lib/supabase": { createSupabaseAdminClient: () => client },
    "./membership": {
      resolveRoomMembership: async () => ({ memberId: "member" }),
    },
    "./personal-access": { isPersonalRoomOwner: async () => true },
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("lib/rooms/data.ts", "utf8") +
        "\nmapRoomSnapshot = async () => ({ id: 'room' });",
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    { exports, require: (name) => stubs[name] ?? {} },
  );
  return exports;
}

for (const table of ["rooms", "room_members", "queue_items", "room_settings"]) {
  test(`${table} load failure is recoverable, not denied access or an empty room`, async () => {
    await assert.rejects(
      fixture(table).getRoomSnapshotForGuest("room"),
      /temporary database failure/,
    );
  });
}

test("successful authorized snapshot still loads", async () => {
  assert.equal((await fixture().getRoomSnapshotForGuest("room")).id, "room");
});
