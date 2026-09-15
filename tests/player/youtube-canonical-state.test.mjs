import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const temp = await mkdtemp(path.join(tmpdir(), "mistake-watch-youtube-state-"));
const sourcePath = path.join(root, "lib/youtube/canonical-state.ts");
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(temp, "canonical-state.mjs");
await writeFile(modulePath, output);

const { buildYouTubeCanonicalPlaybackState, expectedYouTubePositionAt } =
  await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(temp, { force: true, recursive: true });
});

function liveRoom() {
  return {
    snapshot: {
      session: {
        activeQueueItemId: "queue-current",
        hostMemberId: "host",
        playbackOccurrenceId: "occurrence-1",
        positionSeconds: 118,
        roomId: "personal-room",
        serverRevisionMs: 10_000,
        serverUpdatedMs: 10_000,
        sourceDurationSeconds: 120,
        sourceTitle: "Final track",
        sourceType: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status: "playing",
      },
    },
  };
}

test("YouTube canonical state carries the authoritative media duration", () => {
  const state = buildYouTubeCanonicalPlaybackState(liveRoom(), "listen");
  assert.equal(state.source.durationSeconds, 120);
});

test("projected YouTube position remains unbounded for missing-END queue fallback", () => {
  const state = buildYouTubeCanonicalPlaybackState(liveRoom(), "listen");
  assert.equal(expectedYouTubePositionAt(state, 15_000), 123);
});
