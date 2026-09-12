import assert from "node:assert/strict";
import test from "node:test";
import { chooseSyncCorrection } from "../../lib/player/sync.ts";
import { player } from "./direct-media-harness.mjs";

test("native Watch and Listen correct subsecond drift gently and restore normal speed", () => {
  for (const mode of ["watch", "listen"]) {
    const state = {
      mode,
      status: "playing",
      source: { kind: "direct" },
      positionSeconds: 10,
      serverUpdatedAtMs: 1000,
      playbackRate: 1,
    };
    const correction = chooseSyncCorrection({
      state,
      clientNowMs: 1000,
      local: { positionSeconds: 9.2, playbackRate: 1, paused: false },
    });
    assert.equal(correction.kind, "set-playback-rate");
    assert.ok(correction.playbackRate > 1 && correction.playbackRate <= 1.02);
    const settled = chooseSyncCorrection({
      state,
      clientNowMs: 1000,
      local: { positionSeconds: 10, playbackRate: 1.005, paused: false },
    });
    assert.equal(settled.kind, "set-playback-rate");
    assert.equal(settled.playbackRate, 1);
  }
});

test("native sync does not restart a delayed seek on subsequent ticks", async () => {
  const h = player();
  h.media.paused = false;
  h.media.currentTime = 10;
  let seeks = 0;
  Object.defineProperty(h.media, "currentTime", {
    get: () => 10,
    set: () => {
      seeks++;
      h.media.seeking = true;
    },
  });
  await h.tick();
  assert.equal(seeks, 1);
  for (let i = 0; i < 5; i++) {
    h.elapse(750);
    await h.tick();
  }
  assert.equal(seeks, 1);
  assert.equal(h.media.playCalls, 0);
});
