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

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-source-"));
const sourcePath = path.join(rootDir, "lib/player/source.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "source.mjs");

await writeFile(sourceModulePath, sourceJs);

const {
  detectUrlType,
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubePlaylist,
  parseYouTubeVideoId,
  validateDirectMediaSource,
  validateMediaSourceForMode,
} = await import(pathToFileURL(sourceModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("parseYouTubeVideoId accepts common YouTube URL shapes", () => {
  assert.equal(
    parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=test"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://youtube.com/embed/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(parseYouTubeVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("parseYouTubePlaylist accepts playlist and mixed watch/list URLs", () => {
  assert.deepEqual(
    parseYouTubePlaylist(
      "https://www.youtube.com/playlist?list=PL1234567890abcdef",
    ),
    {
      playlistId: "PL1234567890abcdef",
      videoId: null,
    },
  );
  assert.deepEqual(
    parseYouTubePlaylist(
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef",
    ),
    {
      playlistId: "PL1234567890abcdef",
      videoId: "dQw4w9WgXcQ",
    },
  );
});

test("detectUrlType distinguishes playlists from video URLs", () => {
  assert.equal(detectUrlType(""), "empty");
  assert.equal(detectUrlType("dQw4w9WgXcQ"), "youtube");
  assert.equal(
    detectUrlType("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "youtube",
  );
  assert.equal(
    detectUrlType(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef",
    ),
    "youtube-playlist",
  );
  assert.equal(detectUrlType("https://example.com/live.m3u8"), "hls");
  assert.equal(detectUrlType("https://example.com/movie.mp4"), "direct");
});

test("validateDirectMediaSource classifies YouTube and direct media sources", () => {
  assert.deepEqual(
    validateDirectMediaSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    {
      kind: "youtube",
      title: "YouTube video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      valid: true,
    },
  );

  assert.equal(
    validateDirectMediaSource("https://example.com/movie.mp4").kind,
    "direct",
  );
  assert.equal(
    validateDirectMediaSource("https://example.com/live.m3u8").kind,
    "hls",
  );
});

test("validateMediaSourceForMode accepts YouTube and rejects video files in listen rooms", () => {
  assert.deepEqual(validateMediaSourceForMode("dQw4w9WgXcQ", "listen"), {
    kind: "youtube",
    title: "YouTube video",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    valid: true,
  });

  assert.deepEqual(
    validateMediaSourceForMode(
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      "listen",
    ),
    {
      kind: "youtube",
      title: "YouTube video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      valid: true,
    },
  );

  assert.deepEqual(
    validateMediaSourceForMode("https://example.com/movie.mp4", "listen"),
    {
      message:
        "Listen rooms need a direct audio URL, HLS stream, YouTube link, or YouTube Music link.",
      valid: false,
    },
  );

  assert.deepEqual(
    validateMediaSourceForMode("https://example.com/song.mp3", "listen"),
    {
      kind: "direct",
      title: "song.mp3",
      url: "https://example.com/song.mp3",
      valid: true,
    },
  );
});

test("getYouTubeThumbnailUrl derives a stable thumbnail from a YouTube source", () => {
  assert.equal(
    getYouTubeThumbnailUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
  assert.equal(getYouTubeThumbnailUrl("https://example.com/movie.mp4"), null);
});

test("getSourceDisplayTitle hides raw YouTube ids and falls back to filenames", () => {
  assert.equal(
    getSourceDisplayTitle({
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "YouTube dQw4w9WgXcQ",
    }),
    "YouTube video",
  );
  assert.equal(
    getSourceDisplayTitle({
      sourceType: "direct",
      sourceUrl: "https://example.com/media/movie%20night.mp4",
      title: null,
    }),
    "movie night.mp4",
  );
});
