import assert from "node:assert/strict";
import test from "node:test";
import { player } from "./direct-media-harness.mjs";

for (const mode of ["watch", "listen"]) {
  test(`${mode}: interrupted play retries without claiming autoplay is blocked`, async () => {
    const p = player({ mode });
    p.media.playResult = () => {
      p.media.paused = true;
      return Promise.reject({ name: "AbortError" });
    };
    await p.tick();
    assert.equal(p.blocked, false);
    p.media.playResult = () => Promise.resolve();
    await p.tick();
    assert.equal(p.media.paused, false);
    assert.equal(p.media.playCalls, 2);
    assert.equal(
      p.media.loadCalls,
      2,
      "replay must not reload the media source",
    );
  });
}

test("genuine NotAllowedError still requires user interaction", async () => {
  const p = player();
  p.media.playResult = () => {
    p.media.paused = true;
    return Promise.reject({ name: "NotAllowedError" });
  };
  await p.tick();
  await p.tick();
  assert.equal(p.blocked, true);
  assert.equal(p.media.playCalls, 1);
});

test("terminal sync does not restart ended media while room update is pending", async () => {
  const p = player();
  p.update({ positionSeconds: 119 });
  p.elapse(2000);
  p.media.currentTime = 120;
  p.media.paused = true;
  p.media.ended = true;
  await p.tick();
  assert.equal(p.media.playCalls, 0);
  assert.equal(p.media.currentTime, 120);
});

test("native fractional duration bounds sync before rounded metadata", async () => {
  const p = player();
  p.media.duration = 119.6;
  p.media.currentTime = 119.6;
  p.media.ended = true;
  p.update({ positionSeconds: 119 });
  p.elapse(700);
  await p.tick();
  assert.equal(p.media.playCalls, 0);
  assert.equal(p.media.currentTime, 119.6);
});

test("host end event survives a remote correction window", async () => {
  const p = player();
  p.update({ positionSeconds: 119.9 });
  p.media.currentTime = 119.9;
  p.media.paused = false;
  await p.tick({ settle: false });
  p.media.currentTime = 120;
  p.media.ended = true;
  p.media.paused = true;
  p.ended();
  assert.equal(p.publications.length, 1);
  assert.equal(p.publications[0].status, "ended");
  assert.equal(p.publications[0].positionSeconds, 120);
});

test("late ended event after a rewind must not stop the new playback", async () => {
  const p = player();
  p.update({ positionSeconds: 30 });
  p.media.currentTime = 30;
  p.media.ended = false;
  p.ended();
  assert.equal(p.publications.length, 0);
});

test("guest end events cannot publish or advance the queue", () => {
  const p = player({ canControl: false, queue: [{ status: "queued" }] });
  p.media.currentTime = 120;
  p.media.ended = true;
  p.ended();
  assert.equal(p.publications.length, 0);
  assert.equal(p.advances.length, 0);
});

test("host queue autoplay advances once at a real end", () => {
  const p = player({ queue: [{ status: "queued" }] });
  p.media.currentTime = 120;
  p.media.ended = true;
  p.ended();
  p.ended();
  assert.equal(p.advances.length, 1);
  assert.equal(p.publications.length, 0);
});

test("replay from an authoritative earlier position uses the same media", async () => {
  const p = player();
  p.update({ positionSeconds: 120, status: "ended" });
  p.media.currentTime = 120;
  p.media.ended = true;
  await p.tick();
  p.update({ positionSeconds: 100, status: "playing" });
  p.media.ended = false;
  await p.tick();
  assert.equal(p.media.currentTime, 100);
  assert.equal(p.media.paused, false);
  assert.equal(p.media.loadCalls, 2);
  assert.equal(p.publications.length, 0);
});

test("host publishes a terminal state even if a seek consumed the native end event", async () => {
  const p = player();
  p.update({ positionSeconds: 119 });
  p.elapse(2000);
  p.media.currentTime = 120;
  p.media.paused = true;
  p.media.ended = true;
  await p.tick();
  assert.equal(p.publications.length, 1);
  assert.equal(p.publications[0].status, "ended");
});
