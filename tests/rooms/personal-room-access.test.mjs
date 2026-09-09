import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
function load(file, stubs, env = {}) {
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
      process: { env },
      require: (name) => stubs[name] ?? {},
    },
  );
  return exports;
}
for (const input of [
  { user: null, active: true, expected: false },
  { user: { id: "owner", is_anonymous: true }, active: true, expected: false },
  { user: { id: "owner" }, active: true, expected: false },
  { user: { id: "other", is_anonymous: false }, active: true, expected: false },
  {
    user: { id: "owner", is_anonymous: false },
    active: false,
    expected: false,
  },
  { user: { id: "owner", is_anonymous: false }, active: true, expected: true },
]) {
  test(`privileged Personal boundary verifies identity and active status: ${JSON.stringify(input)}`, async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: input.user }, error: null }),
      },
      from: () => ({
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: { account_status: input.active ? "active" : "disabled" },
          error: null,
        }),
      }),
    };
    const { isPersonalRoomOwner } = load("lib/rooms/personal-access.ts", {
      "@/lib/supabase": {
        createSupabaseServerClient: async () => client,
        createSupabaseAdminClient: () => client,
      },
    });
    assert.equal(
      await isPersonalRoomOwner({ owner_user_id: "owner" }),
      input.expected,
    );
  });
}
for (const enabled of [false, true]) {
  test(`Personal action is gated and derives identity from its authenticated RPC context (enabled=${enabled})`, async () => {
    let calls = 0;
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: "owner", is_anonymous: false } },
          error: null,
        }),
      },
      rpc: async (...args) => {
        calls++;
        assert.deepEqual(args, ["open_personal_room"]);
        return { data: "canonical-room", error: null };
      },
    };
    const { openPersonalRoomAction } = load(
      "lib/rooms/personal-actions.ts",
      { "@/lib/supabase": { createSupabaseServerClient: async () => client } },
      { PERSONAL_ROOMS_ENABLED: String(enabled) },
    );
    const result = await openPersonalRoomAction({
      ownerUserId: "forged",
      roomId: "forged",
      mode: "watch",
    });
    assert.equal(calls, enabled ? 1 : 0);
    if (enabled) assert.equal(result.roomId, "canonical-room");
    else assert.ok(result.error);
  });
}
test("Personal account commands cannot close, archive or remove permanent membership", () => {
  const { canExecuteAccountRoomCommand, getAccountRoomCommands } = load(
    "lib/account/room-management-policy.ts",
    {},
  );
  for (const command of ["close", "archive", "leave"]) {
    assert.equal(
      canExecuteAccountRoomCommand({
        command,
        kind: "personal",
        hasMembership: true,
        ownerUserId: "owner",
        savedByUserId: "owner",
        status: command === "archive" ? "closed" : "open",
        userId: "owner",
      }),
      false,
    );
  }
  assert.deepEqual(
    Array.from(
      getAccountRoomCommands({
        kind: "personal",
        relationship: "owned",
        isSaved: true,
        status: "open",
      }),
    ),
    ["remove-save"],
  );
  assert.equal(
    canExecuteAccountRoomCommand({
      command: "remove-save",
      kind: "personal",
      hasMembership: true,
      ownerUserId: "owner",
      savedByUserId: "owner",
      status: "open",
      userId: "owner",
    }),
    true,
  );
});
