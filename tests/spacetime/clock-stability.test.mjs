import assert from "node:assert/strict";
import test from "node:test";
import {
  StableClockOffset,
  readJoinClockOffset,
} from "../../lib/spacetime/live-room/clock.ts";

test("repeated slow arrivals do not shift the timeline backwards", () => {
  const clock = new StableClockOffset();
  assert.equal(clock.sample(50, 0), 50);
  for (let i = 1; i <= 10; i++) assert.equal(clock.sample(900, i * 750), 50);
});
test("a better sample converges gradually without a discontinuity", () => {
  const clock = new StableClockOffset();
  clock.sample(500, 0);
  assert.equal(clock.sample(50, 1000), 480);
  assert.equal(clock.sample(50, 2000), 460);
});
test("an old minimum expires so clock changes cannot leave a permanent offset", () => {
  const clock = new StableClockOffset();
  clock.sample(50, 0);
  assert.ok(clock.sample(500, 65000) > 50);
});
test("join midpoint sampling uses only the exact admission, not another device", () => {
  const context = {
    event: {
      tag: "Reducer",
      value: {
        timestamp: { microsSinceUnixEpoch: 1100000n },
        reducer: { name: "join_room", args: { admissionId: "own" } },
      },
    },
  };
  assert.equal(
    readJoinClockOffset(context, { admissionId: "own", sentAt: 1000 }, 1200),
    0,
  );
  assert.equal(
    readJoinClockOffset(context, { admissionId: "other", sentAt: 1000 }, 1200),
    null,
  );
});
