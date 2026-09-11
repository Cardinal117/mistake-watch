import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { drainRecommendationEventBatch: drain } =
  await loadRecommendationModule("outbox-drain.ts");

function fixture(count) {
  const pending = Array.from({ length: count }, (_, n) => ({
    eventId: `event-${n}`,
    createdMs: 1000 + n,
  }));
  const stored = new Set();
  let calls = 0;
  return {
    pending,
    stored,
    consume: async (events) => {
      events.forEach((e) => stored.add(e.eventId));
    },
    transport: {
      read: async (limit) => {
        calls++;
        return pending.slice(0, limit);
      },
      acknowledge: async (ids) => {
        pending.splice(0, ids.length);
      },
      close() {},
    },
    calls: () => calls,
  };
}
test("slow persistence cannot run past the window and then acknowledge", async () => {
  const f = fixture(100);
  const consume = async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  };
  await assert.rejects(
    drain({ ...f, consume, maxDurationMs: 20, maxBatches: 3 }),
    /deadline/,
  );
  assert.equal(f.pending.length, 100);
});
test("delivery drains multiple batches in one bounded invocation", async () => {
  const f = fixture(250);
  const r = await drain({ ...f, limit: 100, maxBatches: 4 });
  assert.equal(r.acknowledged, 250);
  assert.equal(f.pending.length, 0);
});
test("delivery count cap leaves newer events pending", async () => {
  const f = fixture(350);
  const r = await drain({ ...f, limit: 100, maxBatches: 2 });
  assert.equal(r.acknowledged, 200);
  assert.equal(f.pending[0].eventId, "event-200");
});
test("failed persistence cannot acknowledge the failed batch", async () => {
  const f = fixture(210);
  const consume = async (events) => {
    if (events[0].eventId === "event-100") throw new Error("write failed");
    await f.consume(events);
  };
  await assert.rejects(
    drain({ ...f, consume, limit: 100, maxBatches: 3 }),
    /write failed/,
  );
  assert.equal(f.pending[0].eventId, "event-100");
});
test("retry after lost acknowledgement does not duplicate stored occurrences", async () => {
  const f = fixture(120);
  const ack = f.transport.acknowledge;
  f.transport.acknowledge = async () => {
    throw new Error("ack lost");
  };
  await assert.rejects(drain({ ...f, limit: 100, maxBatches: 3 }), /ack lost/);
  f.transport.acknowledge = ack;
  await drain({ ...f, limit: 100, maxBatches: 3 });
  assert.equal(f.stored.size, 120);
  assert.equal(f.pending.length, 0);
});
test("elapsed budget stops before another batch starts", async () => {
  const f = fixture(300);
  let time = 0;
  const consume = async (events) => {
    await f.consume(events);
    time += 20_001;
  };
  const r = await drain({
    ...f,
    consume,
    limit: 100,
    maxBatches: 4,
    now: () => time,
  });
  assert.equal(r.acknowledged, 100);
  assert.equal(f.pending.length, 200);
});
