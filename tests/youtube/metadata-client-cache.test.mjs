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
  path.join(tmpdir(), "mistake-watch-metadata-client-"),
);
const sourcePath = path.join(rootDir, "lib/youtube/metadata-client.ts");
const source = (await readFile(sourcePath, "utf8"))
  .replace(
    /import \{ UNKNOWN_YOUTUBE_AVAILABILITY \} from ".\/availability";/,
    "const UNKNOWN_YOUTUBE_AVAILABILITY = { playable: null, reason: 'Unknown', source: 'fallback', status: 'unknown' };",
  )
  .replace(
    /import \{ beginQueueMetadataRequest \} from "@\/lib\/performance\/queue";/,
    "const beginQueueMetadataRequest = () => () => undefined;",
  )
  .replace(
    /import \{ parseYouTubeVideoId \} from "@\/lib\/player\/source";/,
    "const parseYouTubeVideoId = (input) => input.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] ?? input.match(/youtu\\.be\\/([a-zA-Z0-9_-]{11})/)?.[1] ?? (/^[a-zA-Z0-9_-]{11}$/.test(input) ? input : null);",
  );
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "metadata-client.mjs");

await writeFile(modulePath, output);

const { fetchYouTubeMetadata } = await import(pathToFileURL(modulePath));
const originalFetch = globalThis.fetch;

test.after(async () => {
  globalThis.fetch = originalFetch;
  await rm(tempDir, { force: true, recursive: true });
});

test("metadata client reuses one in-flight request and cache entry across equivalent YouTube URLs", async () => {
  let providerCalls = 0;
  const payload = {
    availability: {
      playable: true,
      reason: "Playable",
      source: "metadata",
      status: "playable",
    },
    metadata: { title: "Shared result", videoId: "abc123def45" },
    reason: "Playable",
    status: "available",
  };

  globalThis.fetch = async () => {
    providerCalls += 1;
    return {
      json: async () => payload,
      ok: true,
    };
  };

  const [shortUrlResult, watchUrlResult] = await Promise.all([
    fetchYouTubeMetadata("https://youtu.be/abc123def45"),
    fetchYouTubeMetadata("https://www.youtube.com/watch?v=abc123def45"),
  ]);
  const cachedResult = await fetchYouTubeMetadata("abc123def45");

  assert.equal(providerCalls, 1);
  assert.equal(shortUrlResult, watchUrlResult);
  assert.equal(watchUrlResult, cachedResult);
});
