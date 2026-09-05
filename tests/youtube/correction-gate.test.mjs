import assert from "node:assert/strict";
import test from "node:test";
import { YouTubeCorrectionGate } from "../../lib/youtube/correction-gate.ts";

const state = {
  positionSeconds: 20,
  serverUpdatedAtMs: 0,
  status: "playing",
  source: { url: "youtube" },
  activeQueueItemId: "one",
};
const seek = {
  kind: "seek",
  driftSeconds: 5,
  targetPositionSeconds: 20,
  shouldPlay: true,
};
test("buffering and delayed iframe acknowledgements do not restart an in-flight seek", () => {
  const gate = new YouTubeCorrectionGate();
  assert.equal(
    gate.allow({ state, correction: seek, buffering: false, now: 0 }),
    true,
  );
  for (const now of [750, 1500, 2250, 3000]) {
    assert.equal(
      gate.allow({
        state: { ...state },
        correction: seek,
        buffering: true,
        now,
      }),
      false,
    );
  }
  assert.equal(
    gate.allow({ state, correction: seek, buffering: false, now: 4000 }),
    true,
  );
});
test("new room pause and seek preempt settling without waiting for old buffering", () => {
  const gate = new YouTubeCorrectionGate();
  gate.allow({ state, correction: seek, buffering: true, now: 0 });
  const paused = { ...state, status: "paused", positionSeconds: 30 };
  assert.equal(
    gate.allow({
      state: paused,
      correction: { ...seek, kind: "pause-and-seek" },
      buffering: true,
      now: 100,
    }),
    true,
  );
  assert.equal(
    gate.allow({
      state: { ...paused, positionSeconds: 45 },
      correction: {
        ...seek,
        kind: "pause-and-seek",
        targetPositionSeconds: 45,
      },
      buffering: true,
      now: 200,
    }),
    true,
  );
});
test("small steady YouTube clock drift does not cause audible seeks; stalled buffering eventually retries", () => {
  const gate = new YouTubeCorrectionGate();
  gate.observe(state);
  assert.equal(
    gate.allow({
      state,
      correction: { ...seek, driftSeconds: 0.7 },
      buffering: false,
      now: 1000,
    }),
    false,
  );
  assert.equal(
    gate.allow({ state, correction: seek, buffering: true, now: 2000 }),
    false,
  );
  assert.equal(
    gate.allow({ state, correction: seek, buffering: true, now: 11000 }),
    true,
  );
});
