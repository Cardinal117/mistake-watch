import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-spacetime-"));

async function transpileSource(sourcePath, outputName, transform = (source) => source) {
  const source = transform(await readFile(sourcePath, "utf8"));
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const outputPath = path.join(tempDir, outputName);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, js);

  return import(pathToFileURL(outputPath));
}

const { getRoomSubscriptions } = await transpileSource(
  path.join(rootDir, "lib/spacetime/adapter.ts"),
  "adapter.mjs",
  (source) =>
    source.replace(
      'import { getSpacetimeConfig } from "./config";',
      'function getSpacetimeConfig() { return { databaseName: "", uri: "" }; }',
    ),
);
const { emptyLiveRoomSnapshot, mergeLiveRoomSnapshot } = await transpileSource(
  path.join(rootDir, "lib/spacetime/snapshot.ts"),
  "snapshot.mjs",
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("room subscriptions include room-scoped chat messages", () => {
  assert.ok(
    getRoomSubscriptions("room-1").includes(
      "SELECT * FROM room_chat_message WHERE room_id = 'room-1'",
    ),
  );
});

test("room subscription query escapes room ids for chat isolation", () => {
  assert.ok(
    getRoomSubscriptions("room-'two").includes(
      "SELECT * FROM room_chat_message WHERE room_id = 'room-''two'",
    ),
  );
});

test("empty and merged snapshots preserve chat message state", () => {
  assert.deepEqual(emptyLiveRoomSnapshot.chatMessages, []);

  const merged = mergeLiveRoomSnapshot(emptyLiveRoomSnapshot, {
    chatMessages: [
      {
        avatarKey: "audio",
        clientMessageId: "client-1",
        createdMs: 100,
        displayName: "Host",
        isHost: true,
        memberId: "member-host",
        messageId: "room-1:client-1",
        roomId: "room-1",
        text: "Ready",
      },
    ],
  });

  assert.equal(merged.chatMessages[0].roomId, "room-1");
  assert.equal(merged.chatMessages[0].text, "Ready");
});
