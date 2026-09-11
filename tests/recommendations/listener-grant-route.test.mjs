import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const roomId = "00000000-0000-4000-8000-000000000001";
const input = {
  roomId,
  identityHex: "a".repeat(64),
  admissionId: "b".repeat(24),
};
function fixture({
  guest = false,
  memberId = "verified-member",
  allowed = true,
  error = false,
} = {}) {
  const grants = [],
    reads = [],
    deferred = [];
  const mod = { exports: {} };
  const mocks = {
    "next/server": {
      NextResponse: { json: (body, options) => Response.json(body, options) },
      after: (job) => deferred.push(job),
    },
    "@/lib/recommendations/bounded-json": {
      readBoundedJson: async (request) => ({
        ok: true,
        value: await request.json(),
      }),
    },
    "@/lib/recommendations/discover-contracts": {
      normalizeDiscoverRoomId: (value) => (value === roomId ? value : null),
    },
    "@/lib/recommendations/room-authorization": {
      requireRecommendationRoomAccess: async () => ({
        ok: true,
        access: {
          accountUserId: guest ? null : "verified-account",
          memberId: "verified-member",
        },
      }),
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({
        rpc: (name, args) => {
          reads.push({ name, args });
          return {
            abortSignal: async () => ({
              data: {
                allowed,
                memberId,
                epoch: "server-epoch",
                historyGeneration: 3,
              },
              error: error ? { message: "private detail" } : null,
            }),
          };
        },
      }),
    },
    "@/lib/recommendations/listener-bridge": {
      grantListenerLearning: async (value) => grants.push(value),
    },
    "@/lib/recommendations/durable-outbox-drain": {
      deliverRecommendationEventsInBackground: async () => {},
    },
  };
  new Function(
    "exports",
    "require",
    ts.transpileModule(
      readFileSync("app/api/recommendations/listening/grant/route.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  )(mod.exports, (key) => mocks[key]);
  return { ...mod.exports, grants, reads, deferred };
}
function request(body = input, origin) {
  return new Request("https://local.test/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}
test("grant binds verified subject/member and durable epoch to requested admitted connection", async () => {
  const f = fixture();
  const before = Date.now();
  const r = await f.POST(request());
  const after = Date.now();
  assert.equal(r.status, 200);
  assert.equal((await r.json()).allowed, true);
  assert.equal(f.grants.length, 1);
  const grant = f.grants[0];
  assert.equal(grant.accountId, "verified-account");
  assert.equal(grant.memberId, "verified-member");
  assert.equal(grant.consentEpoch, "server-epoch");
  assert.equal(grant.historyGeneration, 3n);
  assert.equal(grant.identityHex, input.identityHex);
  assert.equal(grant.admissionId, input.admissionId);
  assert.ok(
    grant.validFromMs >= BigInt(before) && grant.validFromMs <= BigInt(after),
  );
  assert.equal(grant.expiresMs - grant.validFromMs, 110000n);
  assert.deepEqual(f.reads, [
    {
      name: "read_listening_settings",
      args: { target_room: roomId, target_account: "verified-account" },
    },
  ]);
  assert.equal(f.deferred.length, 1);
  assert.match(r.headers.get("Cache-Control"), /private, no-store/);
});
test("cross-origin and browser-selected account/epoch inputs cannot mint grants", async () => {
  const f = fixture();
  assert.equal(
    (await f.POST(request(input, "https://other.test"))).status,
    403,
  );
  for (const key of [
    "accountId",
    "memberId",
    "consentEpoch",
    "historyGeneration",
  ])
    assert.equal(
      (await f.POST(request({ ...input, [key]: "injected" }))).status,
      400,
    );
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.grants, []);
});
test("guest, withdrawn consent and stale durable membership never grant", async () => {
  for (const options of [
    { guest: true },
    { allowed: false },
    { memberId: "former-member" },
  ]) {
    const f = fixture(options);
    const r = await f.POST(request());
    assert.equal((await r.json()).allowed, false);
    assert.deepEqual(f.grants, []);
    assert.deepEqual(f.deferred, []);
  }
});
test("settings failure fails closed without private exception details", async () => {
  const f = fixture({ error: true });
  const r = await f.POST(request());
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), /private detail/);
  assert.deepEqual(f.grants, []);
});
