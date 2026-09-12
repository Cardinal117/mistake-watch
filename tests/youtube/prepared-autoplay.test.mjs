import assert from "node:assert/strict";
import test from "node:test";
import { PreparedYouTubeAutoplay } from "../../lib/youtube/prepared-autoplay.ts";
const session = (overrides = {}) => ({
  roomId: "room",
  activeQueueItemId: "next",
  sourceType: "youtube",
  sourceUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  playbackOccurrenceId: "new",
  positionSeconds: 0,
  status: "paused",
  serverUpdatedMs: 100,
  ...overrides,
});
function setup() {
  const commands = [],
    loads = [];
  const prep = new PreparedYouTubeAutoplay();
  prep.observe(
    session({ activeQueueItemId: "old", playbackOccurrenceId: "old" }),
    true,
    true,
  );
  prep.arm({
    queueItemId: "next",
    sourceUrl: session().sourceUrl,
    commit: (p) => commands.push(p),
    fail: () => {},
  });
  const player = {
    loadVideoById: (id, p) => loads.push(p),
    playVideo() {},
    getCurrentTime: () => 0.1,
  };
  return { prep, commands, loads, player };
}
test("manual resume waits for readiness at its paused position with autoplay disabled", () => {
  const prep = new PreparedYouTubeAutoplay();
  const current = session({ queueAutoplayEnabled: false, positionSeconds: 42 });
  const loads = [],
    commits = [];
  prep.observe(current, true, true);
  prep.armCurrent({
    queueItemId: "next",
    sourceUrl: current.sourceUrl,
    requireAutoplay: false,
    commit: (p) => commits.push(p),
    fail() {},
  });
  const player = {
    loadVideoById: (_, p) => loads.push(p),
    playVideo() {},
    getCurrentTime: () => 42.1,
  };
  assert.equal(prep.apply(player, current, 1000, "video"), true);
  prep.observe(current, true, true);
  prep.apply(player, current, 5000, "video");
  assert.deepEqual(loads, [42]);
  assert.deepEqual(commits, []);
  prep.ready(player);
  assert.deepEqual(commits, [42.1]);
});
test("manual queued start does not depend on the automatic-next setting", () => {
  const prep = new PreparedYouTubeAutoplay();
  prep.observe(
    session({ activeQueueItemId: "old", queueAutoplayEnabled: false }),
    true,
    true,
  );
  prep.arm({
    queueItemId: "next",
    sourceUrl: session().sourceUrl,
    requireAutoplay: false,
    commit() {},
    fail() {},
  });
  const next = session({ queueAutoplayEnabled: false });
  prep.observe(next, true, true);
  assert.equal(
    prep.apply({ loadVideoById() {}, playVideo() {} }, next, 1000, "video"),
    true,
  );
});
test("a prior start acknowledgment cannot cancel the next manual queue selection", () => {
  const prep = new PreparedYouTubeAutoplay();
  const previous = session({
    activeQueueItemId: "B",
    playbackOccurrenceId: "B",
  });
  prep.observe(previous, true, true);
  const commits = [];
  prep.arm({
    queueItemId: "C",
    sourceUrl: session().sourceUrl,
    requireAutoplay: false,
    commit: (p) => commits.push(p),
    fail() {},
  });
  prep.observe(
    {
      ...previous,
      status: "playing",
      positionSeconds: 0.1,
      serverUpdatedMs: 101,
    },
    true,
    true,
  );
  const next = session({
    activeQueueItemId: "C",
    playbackOccurrenceId: "C",
    serverUpdatedMs: 102,
  });
  prep.observe(next, true, true);
  const player = {
    loadVideoById() {},
    playVideo() {},
    getCurrentTime: () => 0.1,
  };
  assert.equal(prep.apply(player, next, 1000, "video"), true);
  prep.ready(player);
  assert.deepEqual(commits, [0.1]);
});
test("manual preparation times out once and a late provider callback cannot start it", () => {
  const prep = new PreparedYouTubeAutoplay();
  const current = session({ queueAutoplayEnabled: false });
  let commits = 0,
    failures = 0,
    pauses = 0;
  prep.observe(current, true, true);
  prep.armCurrent({
    queueItemId: "next",
    sourceUrl: current.sourceUrl,
    requireAutoplay: false,
    commit: () => commits++,
    fail: () => failures++,
  });
  const player = {
    loadVideoById() {},
    playVideo() {},
    pauseVideo: () => pauses++,
    getCurrentTime: () => 0.1,
  };
  prep.apply(player, current, 1000, "video");
  assert.equal(prep.apply(player, current, 17000, "video"), false);
  prep.ready(player);
  prep.apply(player, current, 18000, "video");
  assert.equal(commits, 0);
  assert.equal(failures, 1);
  assert.equal(pauses, 1);
});
test("autoplay keeps the opening while the provider takes several seconds to start", () => {
  const { prep, commands, loads, player } = setup();
  prep.observe(session(), true, true);
  assert.equal(prep.apply(player, session(), 101, "M7lc1UVf-VE"), true);
  assert.deepEqual(loads, [0]);
  for (const now of [850, 1600, 3200, 6000])
    assert.equal(prep.apply(player, session(), now), true);
  assert.deepEqual(loads, [0]);
  assert.deepEqual(commands, []);
  prep.ready(player);
  assert.deepEqual(commands, [0.1]);
  prep.ready(player);
  assert.deepEqual(commands, [0.1]);
});
for (const update of [
  { status: "paused", serverUpdatedMs: 200 },
  { positionSeconds: 25, serverUpdatedMs: 200 },
  { activeQueueItemId: "different", serverUpdatedMs: 200 },
])
  test(
    "a newer room command cancels pending autoplay " + JSON.stringify(update),
    () => {
      const { prep, commands, player } = setup();
      prep.observe(session(), true, true);
      prep.apply(player, session(), 101, "M7lc1UVf-VE");
      prep.observe(session(update), true, true);
      prep.ready(player);
      assert.deepEqual(commands, []);
    },
  );
test("rejoin without local autoplay intent never restarts or rewinds the room", () => {
  const prep = new PreparedYouTubeAutoplay();
  prep.observe(session({ status: "playing", positionSeconds: 30 }), true, true);
  assert.equal(
    prep.apply({}, session({ status: "playing", positionSeconds: 30 }), 1000),
    false,
  );
});
test("lost playback permission cancels the delayed start", () => {
  const { prep, commands, player } = setup();
  prep.observe(session(), true, true);
  prep.apply(player, session(), 101, "M7lc1UVf-VE");
  prep.observe(session(), false, true);
  prep.ready(player);
  assert.deepEqual(commands, []);
});

test("a timer tick cannot load an empty provider ID before the source effect", () => {
  const { prep, loads, player } = setup();
  prep.observe(session(), true, true);
  assert.equal(prep.apply(player, session(), 100), true);
  assert.deepEqual(loads, []);
  prep.apply(player, session(), 101, "M7lc1UVf-VE");
  assert.deepEqual(loads, [0]);
});
