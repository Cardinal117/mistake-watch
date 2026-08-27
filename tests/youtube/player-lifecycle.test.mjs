import assert from "node:assert/strict";
import test from "node:test";

import * as playerLifecycle from "../../lib/youtube/player-lifecycle.ts";

const { YouTubePlayerLifecycleCoordinator } = playerLifecycle;

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

test("youtube player startup recovery permits one automatic recreation per playback occurrence", () => {
  assert.equal(
    typeof playerLifecycle.YouTubePlayerStartupRecoveryCoordinator,
    "function",
  );
  const recovery =
    new playerLifecycle.YouTubePlayerStartupRecoveryCoordinator();

  assert.equal(recovery.reserveAutomatic("queue-item-1"), true);
  assert.equal(recovery.reserveAutomatic("queue-item-1"), false);
  assert.equal(recovery.reserveAutomatic("queue-item-2"), true);
});

test("youtube player startup recovery throttles manual retries", () => {
  assert.equal(
    typeof playerLifecycle.YouTubePlayerStartupRecoveryCoordinator,
    "function",
  );
  let nowMs = 10_000;
  const recovery = new playerLifecycle.YouTubePlayerStartupRecoveryCoordinator({
    manualCooldownMs: 5_000,
    now: () => nowMs,
  });

  assert.equal(recovery.reserveManual("queue-item-1"), true);
  nowMs += 4_999;
  assert.equal(recovery.reserveManual("queue-item-1"), false);
  nowMs += 1;
  assert.equal(recovery.reserveManual("queue-item-1"), true);
});

test("youtube player startup guard cancels its timeout after ready", () => {
  assert.equal(typeof playerLifecycle.YouTubePlayerStartupGuard, "function");
  let scheduledCallback = null;
  let clearedHandle = null;
  const guard = new playerLifecycle.YouTubePlayerStartupGuard({
    timeoutMs: 12_000,
    schedule: (callback, delayMs) => {
      assert.equal(delayMs, 12_000);
      scheduledCallback = callback;
      return 17;
    },
    cancel: (handle) => {
      clearedHandle = handle;
    },
  });
  let timeoutCount = 0;

  guard.arm(() => {
    timeoutCount += 1;
  });
  guard.markReady();
  scheduledCallback?.();

  assert.equal(clearedHandle, 17);
  assert.equal(timeoutCount, 0);
});

test("youtube player lifecycle teardown releases ownership when provider destruction throws", () => {
  assert.equal(
    typeof playerLifecycle.releaseYouTubePlayerLifecycleSafely,
    "function",
  );
  let released = false;
  let reportedError = null;

  assert.doesNotThrow(() => {
    playerLifecycle.releaseYouTubePlayerLifecycleSafely({
      destroy: () => {
        throw new Error("provider frame already detached");
      },
      release: () => {
        released = true;
      },
      onDestroyError: (error) => {
        reportedError = error;
      },
    });
  });

  assert.equal(released, true);
  assert.match(reportedError?.message ?? "", /already detached/);
});
