import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { readSourceTree } from "../helpers/read-source-tree.mjs";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-uploaded-playback-reference-"),
);
const sourcePath = path.join(
  rootDir,
  "lib/media/uploaded-playback-reference.ts",
);
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "uploaded-playback-reference.mjs");

await writeFile(sourceModulePath, sourceJs);

const {
  createUploadedAssetReference,
  createUploadedSessionReference,
  isUploadedPlaybackReference,
  parseUploadedAssetReference,
  parseUploadedSessionReference,
} = await import(pathToFileURL(sourceModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("uploaded playback references are opaque and parseable", () => {
  assert.equal(
    createUploadedAssetReference("asset-1"),
    "mw-uploaded-asset:asset-1",
  );
  assert.equal(
    createUploadedSessionReference("session-1"),
    "mw-uploaded-session:session-1",
  );
  assert.equal(
    parseUploadedAssetReference("mw-uploaded-asset:asset-1"),
    "asset-1",
  );
  assert.equal(
    parseUploadedSessionReference("mw-uploaded-session:session-1"),
    "session-1",
  );
  assert.equal(isUploadedPlaybackReference("mw-uploaded-asset:asset-1"), true);
  assert.equal(
    isUploadedPlaybackReference("https://media.example.test/movie.mp4"),
    false,
  );
});

test("uploaded playback references reject empty or mismatched values", () => {
  assert.equal(parseUploadedAssetReference("mw-uploaded-asset:"), null);
  assert.equal(parseUploadedAssetReference("mw-uploaded-session:session-1"), null);
  assert.equal(parseUploadedSessionReference("mw-uploaded-asset:asset-1"), null);
  assert.equal(parseUploadedSessionReference(null), null);
});

test("uploaded media queue and play paths do not persist public asset URLs", async () => {
  const watchSource = await readSourceTree(
    rootDir,
    "components/room/watch-mode-layout.tsx",
    "components/room/watch",
  );
  const queueSource = await readFile(
    path.join(rootDir, "components/room/queue-panel.tsx"),
    "utf8",
  );
  const directPlayerSource = await readFile(
    path.join(rootDir, "components/room/direct-media-player.tsx"),
    "utf8",
  );
  const playbackRouteSource = await readFile(
    path.join(
      rootDir,
      "app/api/media/room-sessions/[sessionId]/playback/route.ts",
    ),
    "utf8",
  );

  assert.match(watchSource, /createUploadedAssetReference\(asset\.id\)/);
  assert.doesNotMatch(watchSource, /sourceUrl:\s*asset\.publicUrl/);
  assert.match(watchSource, /createUploadedPlaybackSession/);
  assert.match(watchSource, /createUploadedSessionReference\(session\.id\)/);

  assert.match(queueSource, /createUploadedAssetReference\(asset\.id\)/);
  assert.doesNotMatch(queueSource, /sourceUrl:\s*asset\.publicUrl/);

  assert.match(directPlayerSource, /parseUploadedSessionReference/);
  assert.match(directPlayerSource, /resolveUploadedPlaybackUrl/);
  assert.match(playbackRouteSource, /createPresignedR2GetUrl/);
  assert.match(playbackRouteSource, /getRoomMediaPlaybackAccess/);
});

test("uploaded media start accepts current guest room authority for signed-in catalogue users", async () => {
  const roomMediaSessionsSource = await readFile(
    path.join(rootDir, "lib/media/room-media-sessions.ts"),
    "utf8",
  );

  assert.match(roomMediaSessionsSource, /reclaimGuestMembership/);
  assert.match(roomMediaSessionsSource, /getRoomAuthorityForGuestMember/);
  assert.match(roomMediaSessionsSource, /\.eq\("guest_identity_id", guestIdentityId\)/);
});
