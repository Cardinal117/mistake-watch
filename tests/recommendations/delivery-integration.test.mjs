import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(file, mocks) {
  const source = await readFile(
    new URL(`../../${file}`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
function routeMocks(allowed) {
  const jobs = [];
  let deliveries = 0;
  return {
    jobs,
    delivered: () => deliveries,
    mocks: {
      "next/server": {
        NextResponse: { json: Response.json },
        after: (fn) => jobs.push(fn),
      },
      "@/lib/recommendations/durable-outbox-drain": {
        deliverRecommendationEventsInBackground: async () => {
          deliveries++;
        },
      },
      "@/lib/recommendations/room-authorization": {
        requireRecommendationRoomAccess: async () =>
          allowed
            ? {
                ok: true,
                access: { accountUserId: "account", roomKind: "personal" },
              }
            : { ok: false, status: 403, body: { reason: "Denied" } },
      },
      "@/lib/recommendations/bounded-json": {
        readBoundedJson: async (request) => ({
          ok: true,
          value: await request.json(),
        }),
      },
      "@/lib/recommendations/preference-contracts": {
        normalizePreferenceMutation: (x) => x,
      },
      "@/lib/recommendations/preference-service": {
        listAuthorizedPreferences: async () => [],
        updateAuthorizedPreference: async () => ({
          status: 200,
          item: { liked: true },
        }),
      },
      "@/lib/recommendations/catalogue-service": {
        preparePersonalCatalogue: async () => {},
      },
      "@/lib/recommendations/discover-contracts": {
        normalizeDiscoverRoomId: (x) => x,
      },
      "@/lib/recommendations/discover-service": {
        getPersonalDiscover: async () => ({ items: [] }),
      },
    },
  };
}
for (const route of ["preferences", "discover"]) {
  test(`${route}: denied request cannot schedule delivery`, async () => {
    const f = routeMocks(false);
    const loaded = await load(
      `app/api/recommendations/${route}/route.ts`,
      f.mocks,
    );
    const response = await loaded.GET(
      new Request("https://local.test/api?roomId=room"),
    );
    assert.equal(response.status, 403);
    assert.equal(f.jobs.length, 0);
  });
  test(`${route}: authorized read responds before background delivery`, async () => {
    const f = routeMocks(true);
    const loaded = await load(
      `app/api/recommendations/${route}/route.ts`,
      f.mocks,
    );
    const response = await loaded.GET(
      new Request("https://local.test/api?roomId=room"),
    );
    assert.equal(response.status, 200);
    assert.equal(f.delivered(), 0);
    for (const job of f.jobs) await job();
    assert.equal(f.delivered(), 1);
  });
}
test("preference write schedules after trusted mutation, unauthorized write does not", async () => {
  for (const allowed of [true, false]) {
    const f = routeMocks(allowed);
    const loaded = await load(
      "app/api/recommendations/preferences/route.ts",
      f.mocks,
    );
    const response = await loaded.PUT(
      new Request("https://local.test/api", {
        method: "PUT",
        body: JSON.stringify({ roomId: "room" }),
      }),
    );
    assert.equal(response.status, allowed ? 200 : 403);
    assert.equal(f.jobs.length, allowed ? 1 : 0);
  }
});
function workerMocks({ token = "lease", fail = false, stale = false } = {}) {
  const calls = [];
  const client = {
    rpc: (name, args) => ({
      abortSignal: async () => {
        calls.push({ name, args });
        return {
          data: name === "claim_recommendation_delivery" ? token : !stale,
          error: null,
        };
      },
    }),
  };
  return {
    calls,
    mocks: {
      "server-only": {},
      "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
      "./outbox-bridge": {
        withTrustedRecommendationOutbox: async (fn) => {
          calls.push({ name: "connect" });
          return fn({});
        },
      },
      "./outbox-drain": {
        drainRecommendationEventBatch: async ({ consume, onProgress }) => {
          onProgress({
            status: "partial",
            processed: 0,
            oldestPendingMs: 1000,
          });
          await consume([]);
          if (fail) throw new Error("write failed");
          onProgress({
            status: "empty",
            processed: 100,
            oldestPendingMs: null,
          });
          return { read: 100, acknowledged: 100 };
        },
      },
      "./persistence": {
        persistRecommendationEventBatch: async () => {
          calls.push({ name: "persist" });
        },
        pruneDurableRecommendationData: async () => {
          throw new Error("Interactive pump must not prune");
        },
      },
    },
  };
}
test("busy lease avoids transport and persistence entirely", async () => {
  const f = workerMocks({ token: null });
  const loaded = await load(
    "lib/recommendations/durable-outbox-drain.ts",
    f.mocks,
  );
  assert.equal((await loaded.deliverRecommendationEvents()).status, "busy");
  assert.deepEqual(
    f.calls.map((c) => c.name),
    ["claim_recommendation_delivery"],
  );
});
test("event-only delivery finishes lease without loading providers or pruning", async () => {
  const f = workerMocks();
  const loaded = await load(
    "lib/recommendations/durable-outbox-drain.ts",
    f.mocks,
  );
  assert.equal((await loaded.deliverRecommendationEvents()).status, "empty");
  assert.equal(f.calls.at(-1).args.processed, 100);
});
test("failed batch persists failed receipt and oldest pending timestamp", async () => {
  const f = workerMocks({ fail: true });
  const loaded = await load(
    "lib/recommendations/durable-outbox-drain.ts",
    f.mocks,
  );
  await assert.rejects(loaded.deliverRecommendationEvents(), /delivery failed/);
  assert.equal(f.calls.at(-1).args.outcome, "failed");
  assert.equal(f.calls.at(-1).args.oldest_pending_ms, 1000);
});
test("stale finish cannot report successful delivery", async () => {
  const f = workerMocks({ stale: true });
  const loaded = await load(
    "lib/recommendations/durable-outbox-drain.ts",
    f.mocks,
  );
  await assert.rejects(
    loaded.deliverRecommendationEvents(),
    /lease completion failed/,
  );
});
