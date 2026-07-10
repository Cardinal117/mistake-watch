import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-media-session-"),
);
const sourcePath = path.join(rootDir, "lib/player/media-session.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "media-session.mjs");

await writeFile(sourceModulePath, sourceJs);

const {
  bindMediaSessionActionHandlers,
  canUseMediaSession,
  normalizeMediaSessionMetadata,
  publishMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
} = await import(pathToFileURL(sourceModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("media session support detection is browser-safe", () => {
  assert.equal(canUseMediaSession({}), false);
  assert.equal(canUseMediaSession({ navigator: {} }), false);
  assert.equal(
    canUseMediaSession({ navigator: { mediaSession: createMediaSession() } }),
    true,
  );
});

test("metadata normalization trims values and filters invalid artwork", () => {
  assert.deepEqual(
    normalizeMediaSessionMetadata({
      album: "  Test room  ",
      artist: "  Test channel  ",
      artwork: [
        {
          sizes: "512x512",
          sourceKind: "youtube",
          src: "  https://img.example.test/poster.jpg  ",
          type: " image/jpeg ",
        },
        { src: "   " },
        { src: null },
      ],
      title: "  Track title  ",
    }),
    {
      album: "Test room",
      artist: "Test channel",
      artwork: [],
      title: "Track title",
    },
  );
});

test("artwork safety allows only trusted app icons and public YouTube thumbnails", () => {
  const metadata = normalizeMediaSessionMetadata({
    artwork: [
      {
        sizes: "512x512",
        sourceKind: "youtube",
        src: "https://i.ytimg.com/vi/test/maxresdefault.jpg",
        type: "image/jpeg",
      },
      {
        sizes: "192x192",
        sourceKind: "app",
        src: "/web-app-manifest-192x192.png",
        type: "image/png",
      },
      { sourceKind: "youtube", src: "mw-uploaded-asset:private-asset-id" },
      { sourceKind: "youtube", src: "mw-uploaded-session:private-session-id" },
      {
        sourceKind: "youtube",
        src: "https://account.r2.cloudflarestorage.com/bucket/media/private.mp4?X-Amz-Signature=secret",
      },
      {
        sourceKind: "youtube",
        src: "https://public-bucket.r2.dev/media-posters/private/poster.jpg",
      },
      { sourceKind: "youtube", src: "media-posters/private/poster.jpg" },
      {
        sourceKind: "youtube",
        src: "https://i.ytimg.com.evil.test/vi/test/maxresdefault.jpg",
      },
      { src: "https://cdn.example.test/unproven-uploaded-poster.jpg" },
    ],
  });

  assert.deepEqual(metadata.artwork, [
    {
      sizes: "512x512",
      src: "https://i.ytimg.com/vi/test/maxresdefault.jpg",
      type: "image/jpeg",
    },
    {
      sizes: "192x192",
      src: "/web-app-manifest-192x192.png",
      type: "image/png",
    },
  ]);
});

test("metadata normalization supplies safe app fallbacks", () => {
  assert.deepEqual(normalizeMediaSessionMetadata({}), {
    album: "Mistake Watch",
    artist: "Mistake Watch",
    artwork: [],
    title: "Mistake Watch",
  });
});

test("publishing metadata is a no-op without browser support", () => {
  assert.equal(
    publishMediaSessionMetadata(
      { title: "Track" },
      { navigator: { mediaSession: createMediaSession() } },
    ),
    false,
  );
  assert.equal(
    publishMediaSessionMetadata(
      { title: "Track" },
      { MediaMetadata: FakeMediaMetadata },
    ),
    false,
  );
});

test("publishing metadata creates browser metadata when supported", () => {
  const mediaSession = createMediaSession();

  assert.equal(
    publishMediaSessionMetadata(
      {
        album: "Room",
        artist: "Artist",
        title: "Track",
      },
      {
        MediaMetadata: FakeMediaMetadata,
        navigator: { mediaSession },
      },
    ),
    true,
  );
  assert.deepEqual(mediaSession.metadata.options, {
    album: "Room",
    artist: "Artist",
    artwork: [],
    title: "Track",
  });
});

test("playback state is set only when media session exists", () => {
  const mediaSession = createMediaSession();

  assert.equal(setMediaSessionPlaybackState("playing", {}), false);
  assert.equal(
    setMediaSessionPlaybackState("paused", {
      navigator: { mediaSession },
    }),
    true,
  );
  assert.equal(mediaSession.playbackState, "paused");
});

test("position state validates duration and clamps position", () => {
  const mediaSession = createMediaSession();

  assert.equal(
    setMediaSessionPositionState(
      { duration: null, position: 1 },
      { navigator: { mediaSession } },
    ),
    false,
  );
  assert.equal(
    setMediaSessionPositionState(
      { duration: 100, playbackRate: 1.25, position: 120 },
      { navigator: { mediaSession } },
    ),
    true,
  );
  assert.deepEqual(mediaSession.positionState, {
    duration: 100,
    playbackRate: 1.25,
    position: 100,
  });
});

test("action binding tolerates unsupported actions and cleans up bound actions", () => {
  const mediaSession = createMediaSession({
    unsupportedActions: new Set(["seekto"]),
  });
  const cleanup = bindMediaSessionActionHandlers(
    {
      pause: () => undefined,
      play: () => undefined,
      seekto: () => undefined,
    },
    { navigator: { mediaSession } },
  );

  assert.deepEqual(mediaSession.boundActions, ["pause", "play"]);
  assert.equal(mediaSession.handlers.play instanceof Function, true);
  assert.equal(mediaSession.handlers.seekto, undefined);

  cleanup();

  assert.deepEqual(mediaSession.clearedActions, ["pause", "play"]);
  assert.equal(mediaSession.handlers.play, null);
  assert.equal(mediaSession.handlers.pause, null);
});

test("action binding cleanup is a no-op without media session support", () => {
  const cleanup = bindMediaSessionActionHandlers({ play: () => undefined }, {});

  assert.doesNotThrow(() => cleanup());
});

test("room media session hook gates mutating actions behind playback permission", async () => {
  const hookSource = await readFile(
    path.join(rootDir, "components/room/use-room-media-session.ts"),
    "utf8",
  );

  assert.match(hookSource, /if \(!input\.canControlPlayback\)/);
  assert.match(hookSource, /nexttrack:\s*null/);
  assert.match(hookSource, /pause:\s*null/);
  assert.match(hookSource, /play:\s*null/);
  assert.match(hookSource, /previoustrack:\s*null/);
  assert.match(hookSource, /seekbackward:\s*null/);
  assert.match(hookSource, /seekforward:\s*null/);
  assert.match(hookSource, /seekto:\s*null/);
  assert.match(hookSource, /publishMediaSessionMetadata/);
  assert.match(hookSource, /setMediaSessionPositionState/);
  assert.match(hookSource, /sourceKind:\s*"app"/);
  assert.match(hookSource, /sourceKind:\s*"youtube"/);
  assert.doesNotMatch(hookSource, /sourceKind:\s*"uploaded"/);
});

test("transport controls wire room media session through existing live room actions", async () => {
  const transportSource = await readFile(
    path.join(rootDir, "components/room/transport-controls.tsx"),
    "utf8",
  );

  assert.match(transportSource, /import \{ useRoomMediaSession \}/);
  assert.match(transportSource, /useRoomMediaSession\(\{/);
  assert.match(transportSource, /canControlPlayback:\s*canControl/);
  assert.match(transportSource, /onPlay:\s*\(\) => setPlayback\("playing"\)/);
  assert.match(transportSource, /onPause:\s*\(\) => setPlayback\("paused"\)/);
  assert.match(transportSource, /onSeekRelative:\s*seekRelative/);
  assert.match(transportSource, /onSeekTo:\s*seekTo/);
  assert.match(transportSource, /onNextTrack:\s*playNextQueueItem/);
  assert.match(transportSource, /onPreviousTrack:\s*playPreviousQueueItem/);
});

class FakeMediaMetadata {
  constructor(options) {
    this.options = options;
  }
}

function createMediaSession({ unsupportedActions = new Set() } = {}) {
  return {
    boundActions: [],
    clearedActions: [],
    handlers: {},
    metadata: null,
    playbackState: "none",
    positionState: null,
    setActionHandler(action, handler) {
      if (unsupportedActions.has(action)) {
        throw new Error(`Unsupported action: ${action}`);
      }

      if (handler) {
        this.boundActions.push(action);
      } else {
        this.clearedActions.push(action);
      }

      this.handlers[action] = handler;
    },
    setPositionState(state) {
      this.positionState = state;
    },
  };
}
