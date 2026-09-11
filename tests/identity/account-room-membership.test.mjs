import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);

function fixture({
  signedIn = true,
  active = true,
  accountMember = true,
  guest = true,
  open = true,
  dbError = false,
  role = "guest",
  kind = "legacy",
  owner = "account-A",
  anonymous = false,
} = {}) {
  const account = signedIn
    ? {
        status: "signed-in",
        accountStatus: active ? "active" : "suspended",
        id: "account-A",
        isAnonymous: anonymous,
      }
    : { status: "signed-out" };
  const db = {
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return {
            data:
              table === "rooms"
                ? open
                  ? { id: "room", room_kind: kind, owner_user_id: owner }
                  : null
                : accountMember
                  ? { id: "account-member", role }
                  : null,
            error: dbError ? new Error("database unavailable") : null,
          };
        },
      };
    },
  };
  const stubs = {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({
        get: () => (guest ? { value: "fixture-cookie" } : undefined),
      }),
    },
    "@/lib/account/server": { getAccountSummary: async () => account },
    "@/lib/identity": {
      getGuestIdentityCookieName: () => "cookie",
      reclaimGuestMembership: async () =>
        guest
          ? {
              room: {
                id: "room",
                room_kind: kind,
                status: open ? "open" : "closed",
              },
              member: { id: "guest-member", role: "guest" },
            }
          : null,
    },
    "@/lib/supabase": { createSupabaseAdminClient: () => db },
  };
  function load(file, extra = "") {
    const exports = {};
    const code = ts.transpileModule(
      readFileSync(path.join(root, file), "utf8") + extra,
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    vm.runInNewContext(code, {
      exports,
      process: { env: { SPACETIME_SERVER_AUTH_TOKEN: "fixture-only" } },
      require(name) {
        if (name in stubs) return stubs[name];
        if (name.startsWith("node:")) return require(name);
        if (name.endsWith("/membership"))
          return load("lib/rooms/membership.ts");
        return {};
      },
    });
    return exports;
  }
  // Isolate snapshot formatting, not membership selection or admission logic.
  const page = load(
    "lib/rooms/data.ts",
    "\ngetRoomSnapshot = async (_room, input) => ({ currentMember: { id: input.currentMemberId } });",
  );
  const admission = load(
    "lib/rooms/live-admission.ts",
    "\nissueAdmissionGrant = async (input) => { exports.observedMember = input.member; };",
  );
  return {
    page: () =>
      page.getRoomSnapshotForGuest("room", {
        accountUserId: signedIn ? account.id : null,
      }),
    admission: async () => {
      try {
        await admission.createLiveRoomAdmission({
          roomId: "room",
          identityHex: "a".repeat(64),
        });
        return admission.observedMember;
      } catch (error) {
        if (error.status === 403) return null;
        throw error;
      }
    },
  };
}

for (const role of ["host", "guest"]) {
  test(`Google ${role} with a leftover guest cookie uses the same account member on every device`, async () => {
    for (const guest of [true, false, true]) {
      const f = fixture({ guest, role });
      const page = await f.page();
      const grant = await f.admission();
      assert.equal(page?.currentMember.id, "account-member");
      assert.equal(page?.currentMember.id, grant?.memberId);
      assert.equal(grant?.authorizationKind, "account");
      assert.equal(grant?.role, role);
    }
  });
}
for (const signedIn of [true, false]) {
  test(`valid guest membership remains available without an account membership (signed in: ${signedIn})`, async () => {
    const f = fixture({ signedIn, accountMember: false });
    assert.equal((await f.page())?.currentMember.id, "guest-member");
    assert.equal((await f.admission())?.memberId, "guest-member");
  });
}
for (const options of [
  { active: false },
  { open: false },
  { accountMember: false, guest: false },
]) {
  test(`denied membership cannot fall through: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal(await f.page(), null);
    assert.equal(await f.admission(), null);
  });
}
test("account lookup failure cannot downgrade to a guest cookie", async () => {
  const f = fixture({ dbError: true });
  await assert.rejects(f.page, /database unavailable/);
  await assert.rejects(f.admission, /database unavailable/);
});

for (const options of [
  { owner: "another-account" },
  { accountMember: false },
  { anonymous: true },
  { signedIn: false },
]) {
  test(`Personal page and live grant reject stale memberships/cookies: ${JSON.stringify(options)}`, async () => {
    const f = fixture({ kind: "personal", ...options });
    assert.equal(await f.page(), null);
    assert.equal(await f.admission(), null);
  });
}
test("Personal owner devices use one account membership", async () => {
  const f = fixture({ kind: "personal", role: "host" });
  assert.equal((await f.page())?.currentMember.id, "account-member");
  assert.equal((await f.admission())?.memberId, "account-member");
});

test("Shared approved account uses one durable member for page and live admission", async () => {
  const f = fixture({ kind: "shared", guest: false });
  assert.equal((await f.page())?.currentMember.id, "account-member");
  assert.equal((await f.admission())?.memberId, "account-member");
});

for (const options of [
  { active: false },
  { anonymous: true },
  { signedIn: false },
  { accountMember: false },
]) {
  test(`Shared denies account/cookie fallback: ${JSON.stringify(options)}`, async () => {
    const f = fixture({ kind: "shared", ...options });
    assert.equal(await f.page(), null);
    assert.equal(await f.admission(), null);
  });
}
