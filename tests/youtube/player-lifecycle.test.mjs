import assert from "node:assert/strict";
import test from "node:test";

import { YouTubePlayerLifecycleCoordinator } from "../../lib/youtube/player-lifecycle.ts";

test("youtube player lifecycle serializes owners and observes the teardown handoff", async () => {
  let nowMs = 1_000;
  const waits = [];
  const lifecycle = new YouTubePlayerLifecycleCoordinator({
    handoffMs: 250,
    now: () => nowMs,
    wait: async (delayMs) => {
      waits.push(delayMs);
      nowMs += delayMs;
    },
  });
  const firstLease = await lifecycle.acquire();
  let secondResolved = false;
  const secondLeasePromise = lifecycle.acquire().then((lease) => {
    secondResolved = true;
    return lease;
  });

  await Promise.resolve();
  assert.equal(secondResolved, false);

  firstLease.release();
  const secondLease = await secondLeasePromise;

  assert.equal(secondResolved, true);
  assert.deepEqual(waits, [250]);
  secondLease.release();
});

test("youtube player lifecycle releases an aborted waiter for the next owner", async () => {
  const lifecycle = new YouTubePlayerLifecycleCoordinator({
    handoffMs: 0,
    wait: async () => {},
  });
  const firstLease = await lifecycle.acquire();
  const controller = new AbortController();
  const abortedLease = lifecycle.acquire({ signal: controller.signal });

  controller.abort();
  firstLease.release();

  await assert.rejects(abortedLease, { name: "AbortError" });

  const finalLease = await lifecycle.acquire();
  finalLease.release();
});

test("youtube player lifecycle leases are safe to release more than once", async () => {
  const lifecycle = new YouTubePlayerLifecycleCoordinator({
    handoffMs: 0,
    wait: async () => {},
  });
  const firstLease = await lifecycle.acquire();

  firstLease.release();
  firstLease.release();

  const secondLease = await lifecycle.acquire();
  secondLease.release();
});
