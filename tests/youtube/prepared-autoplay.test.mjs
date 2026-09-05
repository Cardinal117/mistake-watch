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
