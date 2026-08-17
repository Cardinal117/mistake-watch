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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-lifecycle-"));
const sourcePath = path.join(rootDir, "lib/account/room-management-policy.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "room-management-policy.mjs");

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

const { canExecuteAccountRoomCommand, getAccountRoomCommands } = await import(
  pathToFileURL(outputPath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function summary(overrides = {}) {
  return {
    id: "room-1",
    isSaved: false,
    lastActiveAt: "2026-08-17T10:00:00.000Z",
    mode: "watch",
    name: "Room",
    privacy: "invite",
    relationship: "joined",
    status: "open",
    ...overrides,
  };
}

test("exposes commands that match each durable account relationship", () => {
  assert.deepEqual(
    getAccountRoomCommands(summary({ isSaved: true, relationship: "owned" })),
    ["remove-save", "close"],
  );
  assert.deepEqual(
    getAccountRoomCommands(
      summary({ relationship: "owned", status: "closed" }),
    ),
    ["archive"],
  );
  assert.deepEqual(getAccountRoomCommands(summary()), ["leave"]);
  assert.deepEqual(
    getAccountRoomCommands(summary({ relationship: "saved" })),
    [],
  );
  assert.deepEqual(
    getAccountRoomCommands(summary({ isSaved: true, relationship: "saved" })),
    ["remove-save"],
  );
});

test("authorizes commands only against matching account state", () => {
  const base = {
    hasMembership: true,
    ownerUserId: "account-1",
    savedByUserId: "account-1",
    status: "open",
    userId: "account-1",
  };

  assert.equal(
    canExecuteAccountRoomCommand({ ...base, command: "remove-save" }),
    true,
  );
  assert.equal(
    canExecuteAccountRoomCommand({ ...base, command: "close" }),
    true,
  );
  assert.equal(
    canExecuteAccountRoomCommand({
      ...base,
      command: "leave",
      ownerUserId: "account-2",
    }),
    true,
  );
  assert.equal(
    canExecuteAccountRoomCommand({
      ...base,
      command: "archive",
      status: "closed",
    }),
    true,
  );
});

test("rejects cross-account and stale lifecycle commands", () => {
  const unrelated = {
    hasMembership: false,
    ownerUserId: "account-2",
    savedByUserId: "account-2",
    status: "open",
    userId: "account-1",
  };

  for (const command of ["remove-save", "leave", "close", "archive"]) {
    assert.equal(
      canExecuteAccountRoomCommand({ ...unrelated, command }),
      false,
    );
  }

  assert.equal(
    canExecuteAccountRoomCommand({
      ...unrelated,
      command: "archive",
      ownerUserId: "account-1",
      status: "open",
    }),
    false,
  );
});

test("signed-in create, join, and save reconcile through account attachment", async () => {
  const actionsSource = await readFile(
    path.join(rootDir, "lib/rooms/actions.ts"),
    "utf8",
  );
  const attachmentCalls = actionsSource.match(
    /attachRoomToCurrentAccountIfSignedIn\(/g,
  );

  assert.equal(attachmentCalls?.length, 5);
  assert.match(
    actionsSource,
    /await setGuestCookie[\s\S]*await attachRoomToCurrentAccountIfSignedIn/,
  );
  assert.match(
    actionsSource,
    /setRoomSavedAction[\s\S]*attachRoomToCurrentAccountIfSignedIn\(input\.roomId\)/,
  );
  assert.ok(
    actionsSource.indexOf("getSignedInHostAuthority(roomId)") <
      actionsSource.indexOf("getGuestIdentityCookieName(roomId)"),
  );
});

test("management action derives identity and constrains every mutation", async () => {
  const actionSource = await readFile(
    path.join(rootDir, "lib/account/actions.ts"),
    "utf8",
  );

  assert.match(actionSource, /auth\.getUser\(\)/);
  assert.doesNotMatch(actionSource, /userId.*ManageAccountRoomInput/);
  assert.match(actionSource, /canExecuteAccountRoomCommand/);
  assert.match(actionSource, /\.eq\("saved_by_user_id", userId\)/);
  assert.match(actionSource, /\.eq\("user_id", userId\)/);
  assert.match(actionSource, /\.eq\("owner_user_id", userId\)/);
  assert.match(actionSource, /\.eq\("status", expectedStatus\)/);
});
