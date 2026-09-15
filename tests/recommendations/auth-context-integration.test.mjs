import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function fixture() {
  const state = {
    user: { id: "owner", is_anonymous: false },
    status: "active",
    member: true,
    open: true,
    kind: "personal",
    allowed: true,
  };
  const calls = { auth: 0, profile: 0, insert: 0 };
  const client = {
    auth: {
      getUser: async () => {
        calls.auth++;
        return { data: { user: state.user }, error: null };
      },
    },
    rpc: async () => ({
      data: { state: state.allowed ? "approved" : "removed" },
      error: null,
    }),
    from(table) {
      const filters = {};
      const query = {
        select() {
          return this;
        },
        eq(key, value) {
          filters[key] = value;
          return this;
        },
        insert() {
          calls.insert++;
          throw new Error("Unexpected profile creation");
        },
        async maybeSingle() {
          let data = null;
          if (table === "profiles") {
            calls.profile++;
            data =
              state.status === null
                ? null
                : {
                    id: filters.id,
                    account_status: state.status,
                    role: "owner",
                  };
          }
          if (table === "rooms" && state.open)
            data = {
              id: filters.id,
              status: "open",
              room_kind: state.kind,
              owner_user_id: "owner",
              mode: "listen",
            };
          if (table === "room_members" && state.member) data = { id: "member" };
          return { data, error: null };
        },
      };
      return query;
    },
  };
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    const stubs = {
      "server-only": {},
      "next/headers": { cookies: async () => new Map() },
      "@/lib/identity": { getGuestIdentityCookieName: () => "guest" },
      "@/lib/supabase": {
        createSupabaseServerClient: async () => client,
        createSupabaseAdminClient: () => client,
      },
    };
    vm.runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      {
        exports,
        process: { env: {} },
        require(name) {
          if (name in stubs) return stubs[name];
          const resolved = name.startsWith("@/")
            ? name.slice(2)
            : path.join(path.dirname(file), name);
          return load(`${resolved}.ts`);
        },
      },
    );
    return exports;
  }
  const authorize = load(
    "lib/recommendations/room-authorization.ts",
  ).requireRecommendationRoomAccess;
  return {
    state,
    calls,
    authorize: () => authorize("room", "recommendation-read"),
  };
}

test("real authorization/account/Personal helpers use one auth and one profile read", async () => {
  const f = fixture();
  assert.equal((await f.authorize()).ok, true);
  assert.deepEqual(f.calls, { auth: 1, profile: 1, insert: 0 });
  f.state.status = "disabled";
  assert.equal((await f.authorize()).ok, false);
  assert.equal(f.calls.auth, 2);
  assert.equal(f.calls.profile, 2);
});

for (const override of [
  { user: null },
  { user: { id: "owner", is_anonymous: true } },
  { user: { id: "other", is_anonymous: false } },
  { member: false },
  { open: false },
  { status: null },
  { status: "disabled" },
  { status: "unexpected" },
])
  test(`Personal denies without creating profiles: ${JSON.stringify(override)}`, async () => {
    const f = fixture();
    Object.assign(f.state, override);
    assert.equal((await f.authorize()).ok, false);
    assert.equal(f.calls.insert, 0);
  });

test("Shared revocation is rechecked before loading a profile", async () => {
  const f = fixture();
  f.state.kind = "shared";
  assert.equal((await f.authorize()).ok, true);
  f.state.allowed = false;
  assert.equal((await f.authorize()).ok, false);
  assert.equal(f.calls.auth, 2);
  assert.equal(f.calls.profile, 1);
});
