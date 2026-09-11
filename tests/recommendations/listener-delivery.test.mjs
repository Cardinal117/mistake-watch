import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";
function load(file, mocks = {}) {
  const mod = { exports: {} };
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
  return mod.exports;
}
const contracts = load("lib/recommendations/listener-receipt-contracts.ts", {
  "node:crypto": { createHash },
});
const drain = load("lib/recommendations/outbox-drain.ts");
function fixture({ fail = false, rejected = 0 } = {}) {
  const calls = [];
  let pending = [
    {
      receiptId: "receipt",
      accountId: "account",
      memberId: "member",
      roomId: "room",
      occurrenceId: "occurrence",
      consentEpoch: "epoch",
      historyGeneration: 0n,
      sourceType: "direct",
      sourceReference: "https://private.example/song.mp3?token=secret",
      durationSeconds: 100,
      coverageJson: "[[0,90]]",
      firstObservedMs: 1000n,
      lastObservedMs: 91000n,
      createdMs: 91000n,
      methodologyVersion: 1,
    },
  ];
  const client = {
    rpc: (name, args) => ({
      abortSignal: async () => {
        calls.push({ kind: "persist", name, args });
        return {
          data: { received: 1, inserted: rejected ? 0 : 1, rejected },
          error: fail ? Error("db unavailable") : null,
        };
      },
    }),
  };
  const authority = {
    read: async () => pending,
    acknowledge: async (ids) => {
      calls.push({ kind: "ack", ids });
      pending = [];
    },
    close() {},
  };
  const service = load("lib/recommendations/listener-receipts-service.ts", {
    "server-only": {},
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
    "./listener-bridge": { withListenerAuthority: (fn) => fn(authority) },
    "./listener-receipt-contracts": contracts,
    "./outbox-drain": drain,
  });
  return { calls, ...service };
}
test("durable listener ingestion strips direct URL/token and acknowledges only after persistence", async () => {
  const f = fixture();
  const result = await f.drainListenerReceipts();
  assert.equal(result.acknowledged, 1);
  assert.deepEqual(
    f.calls.map((x) => x.kind),
    ["persist", "ack"],
  );
  const record = f.calls[0].args.receipt_batch[0];
  assert.equal(
    record.sourceId,
    createHash("sha256")
      .update("https://private.example/song.mp3?token=secret")
      .digest("hex"),
  );
  assert.doesNotMatch(
    JSON.stringify(record),
    /private\.example|token=secret|sourceReference/,
  );
  assert.deepEqual(record.coverage, [[0, 90]]);
});
test("withdrawn permission receipt is acknowledged after durable eligibility rejection, not retried forever", async () => {
  const f = fixture({ rejected: 1 });
  assert.equal((await f.drainListenerReceipts()).acknowledged, 1);
});
test("database failure leaves listener receipts unacknowledged for bounded retry", async () => {
  const f = fixture({ fail: true });
  await assert.rejects(f.drainListenerReceipts(), /pending receipts retained/);
  assert.deepEqual(
    f.calls.map((x) => x.kind),
    ["persist"],
  );
});
test("source identity separates exact direct references and uses stable uploaded asset identity", () => {
  const { listenerSourceIdentity } = contracts;
  assert.notEqual(
    listenerSourceIdentity({
      sourceType: "direct",
      sourceUrl: "https://media.test/a?version=1",
    }).sourceId,
    listenerSourceIdentity({
      sourceType: "direct",
      sourceUrl: "https://media.test/a?version=2",
    }).sourceId,
  );
  assert.deepEqual(
    listenerSourceIdentity({
      sourceType: "hls",
      sourceUrl: "mw-uploaded-asset:310c0000-0000-4000-8000-000000000001",
    }),
    {
      sourceType: "uploaded",
      sourceId: "310c0000-0000-4000-8000-000000000001",
    },
  );
  assert.equal(
    listenerSourceIdentity({
      sourceType: "youtube",
      sourceUrl: "https://youtu.be/dQw4w9Wg001",
    }),
    null,
  );
  assert.equal(
    listenerSourceIdentity({
      sourceType: "direct",
      sourceUrl: "mw-uploaded-asset:------------------------------------",
    }),
    null,
  );
});
