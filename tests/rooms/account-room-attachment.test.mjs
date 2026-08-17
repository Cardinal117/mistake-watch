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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-attachment-"));
const sourcePath = path.join(rootDir, "lib/rooms/account-attachment.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "account-attachment.mjs");

await writeFile(
  outputPath,
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText,
);

const { isRoomAttachedToAccount } = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("account membership marks the room attached across browser guest sessions", () => {
  assert.equal(
    isRoomAttachedToAccount({
      accountUserId: "account-1",
      memberUserIds: ["account-1", null],
      ownerUserId: null,
      savedByUserId: null,
    }),
    true,
  );
});

test("owner and saved-room attribution also mark the room attached", () => {
  assert.equal(
    isRoomAttachedToAccount({
      accountUserId: "account-1",
      memberUserIds: [null],
      ownerUserId: "account-1",
      savedByUserId: null,
    }),
    true,
  );
  assert.equal(
    isRoomAttachedToAccount({
      accountUserId: "account-1",
      memberUserIds: [null],
      ownerUserId: null,
      savedByUserId: "account-1",
    }),
    true,
  );
});

test("guest-only and unrelated account rooms remain unattached", () => {
  assert.equal(
    isRoomAttachedToAccount({
      accountUserId: null,
      memberUserIds: [null],
    }),
    false,
  );
  assert.equal(
    isRoomAttachedToAccount({
      accountUserId: "account-1",
      memberUserIds: ["account-2", null],
      ownerUserId: "account-2",
      savedByUserId: null,
    }),
    false,
  );
});

test("all room account panels use server-resolved attachment state", async () => {
  const paths = [
    "components/room/watch/header/watch-signal-band.tsx",
    "components/room/listen/header/technical-room-header.tsx",
    "components/room/listen/mobile/mobile-room-tools.tsx",
  ];

  for (const relativePath of paths) {
    const componentSource = await readFile(
      path.join(rootDir, relativePath),
      "utf8",
    );
    assert.match(componentSource, /room\.isAttachedToAccount/);
    assert.doesNotMatch(componentSource, /room\.currentMember\?\.userId/);
  }
});
