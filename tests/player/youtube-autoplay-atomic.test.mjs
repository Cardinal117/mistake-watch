import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const youtubePlayerSource = await readFile(
  path.join(root, "components/room/youtube-media-player.tsx"),
  "utf8",
);
const directPlayerSource = await readFile(
  path.join(root, "components/room/direct-media-player.tsx"),
  "utf8",
);
const liveRoomSource = await readFile(
  path.join(root, "lib/spacetime/use-live-room.ts"),
  "utf8",
);
const spacetimeModuleSource = await readFile(
  path.join(root, "spacetime/src/index.ts"),
  "utf8",
);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `${start} section should exist`);
  assert.notEqual(endIndex, -1, `${end} section should exist`);

  return source.slice(startIndex, endIndex);
}

test("live room autoplay uses the atomic advance reducer", () => {
  const advance = sectionBetween(
    liveRoomSource,
    "async function advanceToNextQueueItem",
    "function moveQueueItem",
  );

  assert.match(advance, /reducers\.advanceQueueItem/);
  assert.match(advance, /reducers\.advanceUploadedQueueItem/);
  assert.match(advance, /const session = snapshot\.session/);
  assert.match(advance, /predictNextQueueItem\(snapshot\)/);
  assert.match(advance, /expectedActiveQueueItemId:\s*session\.activeQueueItemId/);
  assert.match(advance, /expectedNextQueueItemId:\s*nextQueueItem\.queueItemId/);
  assert.match(advance, /expectedSourceUrl:\s*session\.sourceUrl/);
  assert.match(advance, /resolvedSourceUrl:\s*createUploadedSessionReference/);
  assert.match(advance, /uploadedSession\.assetId !== nextUploadedAssetId/);
  assert.match(advance, /catch \(error\)[\s\S]*setErrorMessage\([\s\S]*return;/);
  assert.doesNotMatch(advance, /getNextQueueItemIdForMode/);
  assert.doesNotMatch(advance, /reducers\.loadMediaSource/);
  assert.doesNotMatch(advance, /reducers\.playQueueItem/);
  assert.doesNotMatch(advance, /reducers\.setPlaybackState/);
});

test("youtube ended event advances before publishing ended when autoplay can continue", () => {
  const ended = sectionBetween(
    youtubePlayerSource,
    "if (event.data === yt.PlayerState.ENDED)",
    "useEffect(() => {",
  );

  assert.match(ended, /queueAutoplayEnabledRef\.current/);
  assert.match(ended, /hasNextQueueItemRef\.current/);
  assert.match(ended, /requestAutoplayAdvance\(\)/);
  assert.match(ended, /publishPlaybackState\("ended"\)/);
  assert.ok(
    ended.indexOf("requestAutoplayAdvance()") <
      ended.indexOf('publishPlaybackState("ended")'),
    "autoplay advance should be requested before falling back to ended",
  );
});

test("youtube autoplay advance is guarded per active playback key", () => {
  assert.match(youtubePlayerSource, /autoplayAdvanceInFlightKeyRef/);
  assert.match(
    youtubePlayerSource,
    /autoplayAdvanceInFlightKeyRef\.current === activeKey/,
  );
  assert.match(
    youtubePlayerSource,
    /autoplayAdvanceInFlightKeyRef\.current = activeKey/,
  );
  assert.match(
    youtubePlayerSource,
    /autoplayAdvanceInFlightKeyRef\.current !== activePlaybackKey/,
  );
});

test("autoplay in-flight guard expires so stale no-op advances can retry", () => {
  for (const source of [youtubePlayerSource, directPlayerSource]) {
    assert.match(source, /AUTOPLAY_ADVANCE_IN_FLIGHT_TIMEOUT_MS = 6_000/);
    assert.match(source, /const inFlightExpired =/);
    assert.match(source, /Date\.now\(\) - autoplayAdvanceInFlightAtMsRef\.current/);
    assert.match(source, /autoplayAdvanceInFlightAtMsRef\.current = Date\.now\(\)/);
  }
});

test("direct media ended event uses atomic advance before publishing ended", () => {
  const ended = sectionBetween(
    directPlayerSource,
    "function handleEnded()",
    "const Element = mode",
  );

  assert.match(ended, /requestAutoplayAdvance\(\)/);
  assert.match(ended, /publishMediaState\("ended"\)/);
  assert.ok(
    ended.indexOf("requestAutoplayAdvance()") <
      ended.indexOf('publishMediaState("ended")'),
    "direct media should advance before falling back to ended",
  );
});

test("passive player pause and buffer events do not publish canonical room state", () => {
  const youtubeEvents = sectionBetween(
    youtubePlayerSource,
    "const handlePlayerStateChange = useCallback",
    "useEffect(() => {",
  );
  const directElement = sectionBetween(
    directPlayerSource,
    "<Element",
    "{autoplayBlocked ?",
  );

  assert.match(youtubeEvents, /yt\.PlayerState\.PAUSED/);
  assert.match(youtubeEvents, /yt\.PlayerState\.BUFFERING/);
  assert.doesNotMatch(youtubeEvents, /publishPlaybackState\("paused"\)/);
  assert.doesNotMatch(youtubeEvents, /publishPlaybackState\("buffering"\)/);
  assert.doesNotMatch(youtubeEvents, /publishPlaybackState\("playing"\)/);
  assert.doesNotMatch(directElement, /onPause=/);
  assert.doesNotMatch(directElement, /onWaiting=/);
  assert.doesNotMatch(directElement, /onSeeked=/);
  assert.doesNotMatch(directElement, /publishMediaState\("paused"\)/);
  assert.doesNotMatch(directElement, /publishMediaState\("buffering"\)/);
  assert.doesNotMatch(directElement, /publishMediaState\("playing"\)/);
});

test("room mode switching preserves canonical playback continuity", () => {
  const clientSwitch = sectionBetween(
    liveRoomSource,
    'async function switchMode(mode: "listen" | "watch")',
    "function setQueueAutoplay",
  );
  const serverSwitch = sectionBetween(
    spacetimeModuleSource,
    "export const update_room_mode",
    "export const set_queue_autoplay",
  );

  assert.match(clientSwitch, /\.\.\.currentSnapshot\.session/);
  assert.match(clientSwitch, /mode:\s*result\.mode/);
  assert.doesNotMatch(clientSwitch, /positionSeconds:\s*0/);
  assert.doesNotMatch(clientSwitch, /sourceDurationSeconds:\s*(?:0|null)/);
  assert.match(serverSwitch, /\.\.\.authority\.session/);
  assert.match(serverSwitch, /mode:\s*normalizeRoomMode\(mode\)/);
  assert.doesNotMatch(serverSwitch, /position_seconds:\s*0/);
  assert.doesNotMatch(serverSwitch, /source_duration_seconds:\s*(?:0|null)/);
});

test("youtube iframe errors report stale-safe failure decisions to room authority", () => {
  const errorHandler = sectionBetween(
    youtubePlayerSource,
    "onError: (event: YoutubePlayerEvent)",
    "onReady: () =>",
  );

  assert.match(errorHandler, /reportMediaFailureRef\.current\(\{/);
  assert.match(errorHandler, /allowAutoplayAdvance: true/);
  assert.match(errorHandler, /allowAutoplayAdvance: false/);
  assert.doesNotMatch(errorHandler, /requestAutoplayAdvance\(\)/);
});
