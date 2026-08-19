import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const sourceDir = path.join(root, "spacetime/src");
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-server-helpers-"),
);

async function loadHelper(fileName, transform = (source) => source) {
  const source = transform(
    await readFile(path.join(sourceDir, fileName), "utf8"),
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName,
  }).outputText;
  const outputPath = path.join(tempDir, fileName.replace(/\.ts$/, ".mjs"));
  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}

await loadHelper("normalization.ts");
const normalization = await import(
  pathToFileURL(path.join(tempDir, "normalization.mjs"))
);
const references = await loadHelper("media-references.ts", (source) =>
  source.replace('from "./normalization"', 'from "./normalization.mjs"'),
);
const queue = await loadHelper("queue-calculations.ts");

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("server helper modules remain independent of reducer context", async () => {
  for (const fileName of [
    "normalization.ts",
    "media-references.ts",
    "queue-calculations.ts",
  ]) {
    const source = await readFile(path.join(sourceDir, fileName), "utf8");
    assert.doesNotMatch(
      source,
      /spacetimedb|ctx\.db|\.reducer\s*\(/i,
      fileName,
    );
  }
});

test("index imports pure helpers while room admission stays modular", async () => {
  const source = await readFile(path.join(sourceDir, "index.ts"), "utf8");
  const participation = await readFile(
    path.join(sourceDir, "room-participation.ts"),
    "utf8",
  );
  assert.match(source, /from "\.\/normalization"/);
  assert.match(source, /from "\.\/media-references"/);
  assert.match(source, /from "\.\/queue-calculations"/);
  assert.match(source, /join_room,[\s\S]*from "\.\/room-participation"/);
  assert.match(participation, /export const join_room = spacetimedb\.reducer/);
  assert.match(
    source,
    /export const play_uploaded_queue_item = spacetimedb\.reducer/,
  );
  assert.match(
    participation,
    /export const on_disconnect = spacetimedb\.clientDisconnected/,
  );

  const commitStart = source.indexOf("function commitQueueAdvance");
  const commitEnd = source.indexOf(
    "function normalizeQueuedPositions",
    commitStart,
  );
  const commitQueueAdvance = source.slice(commitStart, commitEnd);
  assert.match(
    commitQueueAdvance,
    /played_sequence:\s*nextPlayedSequence\(ctx,\s*session\.room_id\)/,
  );
  assert.match(commitQueueAdvance, /played_sequence:\s*0/);

  for (const reducerName of [
    "advance_queue_item",
    "advance_uploaded_queue_item",
    "play_uploaded_queue_item",
  ]) {
    const reducerStart = source.indexOf(`export const ${reducerName}`);
    const nextReducer = source.indexOf("export const ", reducerStart + 1);
    const reducer = source.slice(
      reducerStart,
      nextReducer === -1 ? source.length : nextReducer,
    );
    assert.match(reducer, /resolveQueuePlaybackSource/);
    assert.match(reducer, /commitQueueAdvance/);
  }
});

test("normalization preserves server fallback and bounds behavior", () => {
  assert.equal(normalization.clampPositionSeconds(-1), 0);
  assert.equal(normalization.clampPositionSeconds(Number.NaN), 0);
  assert.equal(normalization.clampPositionSeconds(12.5), 12.5);
  assert.equal(normalization.normalizePlaybackStatus("playing"), "playing");
  assert.equal(normalization.normalizePlaybackStatus("unknown"), "paused");
  assert.equal(normalization.normalizeSourceType("youtube"), "youtube");
  assert.equal(normalization.normalizeSourceType("unknown"), "direct");
  assert.equal(normalization.normalizeRoomMode("listen"), "listen");
  assert.equal(normalization.normalizeRoomMode("other"), "watch");
  assert.equal(normalization.normalizeQueueMode("loop"), "loop");
  assert.equal(normalization.normalizeQueueMode("other"), "normal");
  assert.equal(normalization.normalizeDurationSeconds(12.9), 12);
  assert.equal(normalization.normalizeDurationSeconds(0), undefined);
  assert.equal(normalization.normalizeRoomName("  Team   room "), "Team room");
  assert.equal(normalization.normalizeRoomName(" "), "Untitled room");
  assert.equal(normalization.normalizeAvatarKey("audio"), "audio");
  assert.equal(normalization.normalizeAvatarKey("other"), undefined);
  assert.equal(normalization.normalizeChatText(" one   two "), "one two");
  assert.equal(normalization.normalizeChatText("x".repeat(501)).length, 500);
});

test("uploaded references only resolve asset references to session references", () => {
  assert.equal(
    references.isUploadedAssetReference(" mw-uploaded-asset:asset-1 "),
    true,
  );
  assert.equal(
    references.isUploadedAssetReference("mw-uploaded-asset: "),
    false,
  );
  assert.equal(
    references.resolveQueuePlaybackSource(
      "mw-uploaded-asset:asset-1",
      "mw-uploaded-session:session-1",
    ),
    "mw-uploaded-session:session-1",
  );
  assert.equal(
    references.resolveQueuePlaybackSource(
      "mw-uploaded-asset:asset-1",
      "https://example.com",
    ),
    null,
  );
  assert.equal(
    references.resolveQueuePlaybackSource(" https://example.com/video "),
    "https://example.com/video",
  );
  assert.equal(
    references.resolveQueuePlaybackSource(
      "https://example.com/video",
      "mw-uploaded-session:session-1",
    ),
    null,
  );
});

test("queue calculations preserve ordering, filtering, and sequence rules", () => {
  const items = [
    {
      is_pinned: false,
      is_play_next: false,
      played_sequence: 4,
      position: 3,
      queue_item_id: "played",
      status: "played",
    },
    {
      is_pinned: false,
      is_play_next: false,
      position: 2,
      queue_item_id: "queued",
      status: "queued",
    },
    {
      is_pinned: true,
      is_play_next: false,
      position: 0,
      queue_item_id: "pinned",
      status: "queued",
    },
    {
      is_pinned: false,
      is_play_next: true,
      position: 1,
      queue_item_id: "next",
      status: "queued",
    },
  ];
  assert.deepEqual(
    queue.selectActiveQueueItems(items).map((item) => item.queue_item_id),
    ["pinned", "next", "queued"],
  );
  assert.equal(
    queue.calculateNextQueuePosition(queue.selectActiveQueueItems(items)),
    3,
  );
  assert.equal(queue.calculateNextPlayedSequence(items), 5);
  assert.equal(queue.calculateNextPlayedSequence([]), 1);
  assert.equal(
    queue.calculatePlayNextQueuePosition(queue.selectQueuedQueueItems(items)),
    2,
  );
  assert.equal(
    queue.calculatePlayNextQueuePosition(
      queue.selectQueuedQueueItems(items),
      "next",
    ),
    1,
  );
});
