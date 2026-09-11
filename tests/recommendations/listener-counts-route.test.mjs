import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
const file = "app/api/recommendations/listening/counts/route.ts";
function fixture(allowed = true, fail = false) {
  const calls = [];
  const mod = { exports: {} };
  const mocks = {
    "next/server": {
      NextResponse: { json: (body, options) => Response.json(body, options) },
      after: (job) => calls.push(["after", job]),
    },
    "@/lib/recommendations/room-authorization": {
      requireRecommendationRoomAccess: async () =>
        allowed
          ? {
              ok: true,
              access: { kind: "account", accountUserId: "verified-account" },
            }
          : { ok: false, status: 403, body: { status: "unavailable" } },
    },
    "@/lib/recommendations/listener-receipts-service": {
      readAccountListeningCounts: async (account, ids) => {
        calls.push([account, ids]);
        if (fail) throw Error("private secret");
        return { scope: "account_listener", items: [] };
      },
    },
    "@/lib/recommendations/durable-outbox-drain": {
      deliverRecommendationEventsInBackground: async () => {},
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
    )(mod.exports, (k) => mocks[k]);
  else
    mod.exports.GET = async () =>
      Response.json({ status: "unavailable" }, { status: 503 });
  return { ...mod.exports, calls };
}
test("counts derive subject from verified membership and never query a URL-selected account", async () => {
  const f = fixture();
  const r = await f.GET(
    new Request(
      `https://local.test/api?roomId=room&accountId=attacker&sourceId=${"a".repeat(64)}`,
    ),
  );
  assert.equal(r.status, 200);
  assert.equal(f.calls[0][0], "verified-account");
  assert.deepEqual(f.calls[0][1], ["a".repeat(64)]);
  assert.match(r.headers.get("Cache-Control"), /no-store/);
});
test("unauthorized count request neither reads private receipts nor triggers delivery", async () => {
  const f = fixture(false);
  assert.equal(
    (await f.GET(new Request("https://local.test/api?roomId=room"))).status,
    403,
  );
  assert.deepEqual(f.calls, []);
});
test("malformed source filters fail before private reads", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.GET(
        new Request(
          "https://local.test/api?roomId=room&sourceId=https://private.example/token",
        ),
      )
    ).status,
    400,
  );
  assert.deepEqual(f.calls, []);
});
test("missing receipt configuration reports unavailable without raw internal errors", async () => {
  const f = fixture(true, true);
  const r = await f.GET(new Request("https://local.test/api?roomId=room"));
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), /private secret/);
});
