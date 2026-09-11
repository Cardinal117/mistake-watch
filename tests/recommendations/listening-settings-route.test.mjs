import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const roomId = "00000000-0000-4000-8000-000000000001";
function fixture({ guest = false, error = null } = {}) {
  const calls = [];
  const mod = { exports: {} };
  const file = "lib/recommendations/listening-settings-routes.ts";
  const mocks = {
    "next/server": {
      NextResponse: { json: (body, options) => Response.json(body, options) },
    },
    "@/lib/recommendations/room-authorization": {
      requireRecommendationRoomAccess: async () => ({
        ok: true,
        access: { accountUserId: guest ? null : "verified-account" },
      }),
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
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({
        rpc: (name, args) => {
          calls.push({ name, args });
          return {
            abortSignal: async () => ({
              data: { historyGeneration: 2 },
              error,
            }),
          };
        },
      }),
    },
  };
  if (existsSync(file))
    new Function(
      "exports",
      "require",
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    )(mod.exports, (key) => mocks[key]);
  else
    for (const method of ["GET", "PATCH", "DELETE"])
      mod.exports[method] = async () => Response.json({}, { status: 503 });
  return { ...mod.exports, calls };
}
const request = (method, body) =>
  new Request("https://local.test/api", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("clear uses verified subject and exact expected generation", async () => {
  const f = fixture();
  const r = await f.DELETE(
    request("DELETE", { roomId, expectedGeneration: 1 }),
  );
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls, [
    {
      name: "clear_account_listening_history",
      args: { target_account: "verified-account", expected_generation: 1 },
    },
  ]);
  assert.match(r.headers.get("Cache-Control"), /no-store/);
});
test("guest cannot read or clear private listening settings", async () => {
  const f = fixture({ guest: true });
  assert.equal(
    (await f.GET(new Request("https://local.test/api?roomId=" + roomId)))
      .status,
    403,
  );
  assert.equal(
    (await f.DELETE(request("DELETE", { roomId, expectedGeneration: 0 })))
      .status,
    403,
  );
  assert.deepEqual(f.calls, []);
});
test("client subject injection and unsupported purpose fail before RPC", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.DELETE(
        request("DELETE", {
          roomId,
          expectedGeneration: 0,
          target_account: "other",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.PATCH(
        request("PATCH", {
          roomId,
          allowListening: true,
          purposeVersion: 2,
          expectedEpoch: null,
        }),
      )
    ).status,
    400,
  );
  assert.deepEqual(f.calls, []);
});
test("CAS conflict returns 409 once and does not retry clear", async () => {
  const f = fixture({ error: { code: "40001", message: "private detail" } });
  const r = await f.DELETE(
    request("DELETE", { roomId, expectedGeneration: 0 }),
  );
  assert.equal(r.status, 409);
  assert.equal(f.calls.length, 1);
  assert.doesNotMatch(await r.text(), /private detail/);
});
test("cross-origin mutation is rejected before RPC", async () => {
  const f = fixture();
  const req = request("DELETE", { roomId, expectedGeneration: 0 });
  req.headers.set("Origin", "https://other.test");
  assert.equal((await f.DELETE(req)).status, 403);
  assert.deepEqual(f.calls, []);
});
