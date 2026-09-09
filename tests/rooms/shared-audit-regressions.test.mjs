import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    process,
    require: (n) => {
      if (n === "server-only") return {};
      if (n in mocks) return mocks[n];
      throw Error(n);
    },
  });
  return exports;
}
function query(data, onDelete = () => {}) {
  const q = {
    then: (f) => Promise.resolve({ data, error: null }).then(f),
    select: () => q,
    eq: () => q,
    neq: (key, value) => {
      if (Array.isArray(data)) data = data.filter((row) => row[key] !== value);
      return q;
    },
    in: () => q,
    maybeSingle: async () => ({ data, error: null }),
    delete: () => {
      onDelete();
      return q;
    },
  };
  return q;
}
const room = {
  id: "11111111-1111-4111-8111-111111111111",
  room_kind: "shared",
  owner_user_id: "owner",
  saved_by_user_id: null,
  status: "open",
  name: "Shared",
  mode: "listen",
  privacy: "invite",
  created_at: "2026-09-09",
  updated_at: "2026-09-09",
};
const projection = load("lib/account/room-projection.ts", {});
for (const state of ["approved", "disabled", "anonymous", "removed"])
  test(`Shared account list respects user-scoped visibility: ${state}`, async () => {
    const rows = [room, { ...room, id: "legacy", room_kind: "legacy" }];
    const admin = {
      from: (table) =>
        query(
          table === "room_members"
            ? rows.map((r) => ({ room_id: r.id }))
            : rows,
        ),
    };
    const mod = load("lib/account/room-data.ts", {
      "@/lib/supabase": {
        createSupabaseAdminClient: () => admin,
        createSupabaseServerClient: async () => ({
          from: () => query(state === "approved" ? [{ id: room.id }] : []),
        }),
      },
      "@/lib/rooms/personal-access": { isPersonalRoomOwner: async () => false },
      "./room-projection": projection,
    });
    const result = await mod.listAccountRooms("friend");
    assert.equal(
      result.some((r) => r.id === room.id),
      state === "approved",
    );
    assert.equal(
      result.some((r) => r.id === "legacy"),
      true,
    );
  });
for (const denied of [false, true])
  test(`Shared account Leave uses authoritative withdrawal, denied=${denied}`, async () => {
    let withdrew = 0,
      deletes = 0;
    const mod = load("lib/account/actions.ts", {
      "@/lib/rooms/persistent-retirement": {
        cleanupPersistentRooms: async () => {
          throw Error("Leave must not retire the room");
        },
      },
      "@/lib/rooms/personal-access": { canAccessAccountRoom: async () => true },
      "@/lib/rooms/shared-actions": {
        leaveSharedRoomAction: async (id) => {
          assert.equal(id, room.id);
          withdrew++;
          return denied ? { error: "Cannot withdraw" } : { ok: true };
        },
      },
      "./room-management-policy": load(
        "lib/account/room-management-policy.ts",
        {},
      ),
      "@/lib/supabase": {
        createSupabaseServerClient: async () => ({
          auth: {
            getUser: async () => ({
              data: { user: { id: "friend" } },
              error: null,
            }),
          },
        }),
        createSupabaseAdminClient: () => ({
          from: (table) =>
            query(table === "rooms" ? room : { id: "member" }, () => deletes++),
        }),
      },
    });
    if (denied)
      await assert.rejects(
        () =>
          mod.manageAccountRoomAction({ command: "leave", roomId: room.id }),
        /Cannot withdraw/,
      );
    else
      await mod.manageAccountRoomAction({ command: "leave", roomId: room.id });
    assert.equal(withdrew, 1);
    assert.equal(deletes, 0);
  });

test("account listing excludes archived room history while preserving closed rooms", async () => {
  const rows = [
    room,
    { ...room, id: "closed", status: "closed" },
    { ...room, id: "archived", status: "archived" },
  ];
  const mod = load("lib/account/room-data.ts", {
    "@/lib/supabase": {
      createSupabaseAdminClient: () => ({
        from: (table) =>
          query(
            table === "room_members"
              ? rows.map((r) => ({ room_id: r.id }))
              : rows,
          ),
      }),
      createSupabaseServerClient: async () => ({ from: () => query(rows) }),
    },
    "@/lib/rooms/personal-access": { isPersonalRoomOwner: async () => false },
    "./room-projection": projection,
  });
  const ids = (await mod.listAccountRooms("friend")).map((r) => r.id);
  assert.ok(ids.includes(room.id));
  assert.ok(ids.includes("closed"));
  assert.ok(!ids.includes("archived"));
});
