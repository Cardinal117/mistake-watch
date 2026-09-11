import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
function fixture(enabled) {
  const callbacks = [],
    calls = [],
    exports = {};
  const mocks = {
    "next/server": {
      NextResponse: {
        json: (data, init) => ({ data, status: init?.status ?? 200 }),
      },
      after: (fn) => callbacks.push(fn),
    },
    "@/lib/recommendations/musicbrainz-worker": {
      runMusicbrainzJobs: async () => calls.push("manual"),
    },
    "@/lib/recommendations/shadow-worker": {
      runDurableShadowEnrichment: async (deadline) => {
        assert(deadline > Date.now());
        calls.push("shadow");
      },
    },
    "@/lib/recommendations/durable-outbox-drain": {
      drainDurableRecommendationOutbox: async () => calls.push("events"),
    },
    "@/lib/recommendations/catalogue-service": {
      runMusicCatalogueMaintenance: async () => calls.push("maintenance"),
    },
    "@/lib/recommendations/catalogue-worker-core": {
      maintainBeforeRoomDrain: async (a, b) => {
        await a();
        await b();
        return { ok: true };
      },
    },
  };
  new Function(
    "exports",
    "require",
    "process",
    ts.transpileModule(
      readFileSync("app/api/recommendations/drain/route.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
  )(
    exports,
    (n) => {
      assert(Object.hasOwn(mocks, n));
      return mocks[n];
    },
    {
      env: {
        NODE_ENV: "production",
        CRON_SECRET: "synthetic",
        SHADOW_ENRICHMENT_ENABLED: enabled ? "true" : "false",
      },
    },
  );
  return { post: exports.POST, calls, callbacks };
}
test("unauthorized drain does not schedule or admit enrichment", async () => {
  const f = fixture(true);
  assert.equal((await f.post(new Request("https://example.test"))).status, 401);
  assert.equal(f.callbacks.length, 0);
  assert.deepEqual(f.calls, []);
});
test("shadow dispatch is deferred and feature switch retains manual worker fallback", async () => {
  for (const enabled of [false, true]) {
    const f = fixture(enabled);
    assert.equal(
      (
        await f.post(
          new Request("https://example.test", {
            headers: { authorization: "Bearer synthetic" },
          }),
        )
      ).status,
      200,
    );
    assert.deepEqual(f.calls, ["maintenance", "events"]);
    assert.equal(f.callbacks.length, 1);
    await f.callbacks[0]();
    assert.deepEqual(f.calls, [
      "maintenance",
      "events",
      enabled ? "shadow" : "manual",
    ]);
  }
});
test("Personal Discover only pumps enrichment after an authorized pilot response", async () => {
  for (const [authorized, pilot] of [
    [false, true],
    [true, false],
    [true, true],
  ]) {
    const callbacks = [],
      calls = [],
      exports = {};
    const mocks = {
      "next/server": {
        NextResponse: {
          json: (data, init) => ({ data, status: init?.status ?? 200 }),
        },
        after: (fn) => callbacks.push(fn),
      },
      "@/lib/recommendations/shadow-worker": {
        runDurableShadowEnrichment: async () => calls.push("shadow"),
      },
      "@/lib/recommendations/durable-outbox-drain": {
        deliverRecommendationEventsInBackground: async () => {},
      },
      "@/lib/recommendations/catalogue-service": {
        preparePersonalCatalogue: async () => calls.push("catalogue"),
        cataloguePreparationFailureStage: () => "",
      },
      "@/lib/recommendations/catalogue-region": {
        catalogueViewerCountry: () => null,
      },
      "@/lib/recommendations/bounded-json": {},
      "@/lib/recommendations/discover-contracts": {
        normalizeDiscoverRoomId: () => "room",
      },
      "@/lib/recommendations/discover-service": {
        getPersonalDiscover: async () => ({ items: [] }),
      },
      "@/lib/recommendations/room-authorization": {
        requireRecommendationRoomAccess: async () =>
          authorized
            ? {
                ok: true,
                access: {
                  roomKind: "personal",
                  accountUserId: pilot ? "pilot" : "other",
                },
              }
            : { ok: false, body: { reason: "denied" }, status: 403 },
      },
    };
    new Function(
      "exports",
      "require",
      "process",
      ts.transpileModule(
        readFileSync("app/api/recommendations/discover/route.ts", "utf8"),
        { compilerOptions: { module: ts.ModuleKind.CommonJS } },
      ).outputText,
    )(
      exports,
      (n) => {
        assert(Object.hasOwn(mocks, n), n);
        return mocks[n];
      },
      { env: { SHADOW_ENRICHMENT_ACCOUNT: "pilot" } },
    );
    assert.equal(
      (await exports.GET(new Request("https://example.test?roomId=room")))
        .status,
      authorized ? 200 : 403,
    );
    assert.deepEqual(calls, []);
    for (const fn of callbacks) await fn();
    assert.deepEqual(
      calls,
      !authorized ? [] : pilot ? ["catalogue", "shadow"] : ["catalogue"],
    );
  }
});
