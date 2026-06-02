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
  path.join(tmpdir(), "mistake-watch-youtube-metadata-"),
);
const sourcePath = path.join(rootDir, "lib/player/source.ts");
const metadataPath = path.join(rootDir, "lib/youtube/metadata.ts");
const formatPath = path.join(rootDir, "lib/youtube/format.ts");
const cachePath = path.join(rootDir, "lib/youtube/cache.ts");
const sourceJs = transpile(await readFile(sourcePath, "utf8"), sourcePath);
const metadataJs = transpile(
  (await readFile(metadataPath, "utf8"))
    .replace(
      'import { parseYouTubeVideoId } from "@/lib/player/source";',
      'import { parseYouTubeVideoId } from "./source.mjs";',
    )
    .replace(
      'import { InFlightRequestCache, TtlCache } from "./cache";',
      'import { InFlightRequestCache, TtlCache } from "./cache.mjs";',
    ),
  metadataPath,
);
const formatJs = transpile(await readFile(formatPath, "utf8"), formatPath);
const cacheJs = transpile(await readFile(cachePath, "utf8"), cachePath);

await writeFile(path.join(tempDir, "source.mjs"), sourceJs);
await writeFile(path.join(tempDir, "metadata.mjs"), metadataJs);
await writeFile(path.join(tempDir, "format.mjs"), formatJs);
await writeFile(path.join(tempDir, "cache.mjs"), cacheJs);

const { normalizeYouTubeVideo, parseYouTubeDuration } = await import(
  pathToFileURL(path.join(tempDir, "metadata.mjs"))
);
const { formatCompactCount } = await import(
  pathToFileURL(path.join(tempDir, "format.mjs"))
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("parseYouTubeDuration handles ISO 8601 video durations", () => {
  assert.equal(parseYouTubeDuration("PT4M13S"), 253);
  assert.equal(parseYouTubeDuration("PT1H2M3S"), 3723);
  assert.equal(parseYouTubeDuration("P1DT2H"), 93600);
  assert.equal(parseYouTubeDuration("not-a-duration"), null);
  assert.equal(parseYouTubeDuration(undefined), null);
});

test("normalizeYouTubeVideo keeps missing like counts explicit", () => {
  const metadata = normalizeYouTubeVideo(
    {
      id: "dQw4w9WgXcQ",
      contentDetails: {
        duration: "PT3M33S",
      },
      snippet: {
        channelTitle: "Rick Astley",
        publishedAt: "2009-10-25T06:57:33Z",
        thumbnails: {
          high: {
            url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          },
        },
        title: "Never Gonna Give You Up",
      },
      statistics: {
        viewCount: "1600000000",
      },
    },
    "fallback-id",
  );

  assert.equal(metadata.videoId, "dQw4w9WgXcQ");
  assert.equal(metadata.title, "Never Gonna Give You Up");
  assert.equal(metadata.channelTitle, "Rick Astley");
  assert.equal(metadata.durationSeconds, 213);
  assert.equal(metadata.viewCount, 1600000000);
  assert.equal(metadata.likeCount, null);
  assert.equal(
    metadata.thumbnailUrl,
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("formatCompactCount formats provider counts without fake fallbacks", () => {
  assert.equal(formatCompactCount(1200), "1K");
  assert.equal(formatCompactCount(1250000), "1.3M");
  assert.equal(formatCompactCount(null), null);
});

function transpile(sourceText, fileName) {
  return ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName,
  }).outputText;
}
