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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-activity-"));
const corePath = path.join(rootDir, "lib/rooms/activity-core.ts");
const coreSource = await readFile(corePath, "utf8");
const coreJs = ts.transpileModule(coreSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: corePath,
}).outputText;
const coreModulePath = path.join(tempDir, "activity-core.mjs");

await writeFile(coreModulePath, coreJs);

const { touchAccountRoomActivity } = await import(
  `${pathToFileURL(coreModulePath).href}?v=${Date.now()}`
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function createDependencies(overrides = {}) {
  const calls = [];
  const now = new Date("2026-07-16T10:00:00.000Z");
  const dependencies = {
    findMember: async (roomId, userId) => {
      calls.push(["findMember", roomId, userId]);
      return { id: "member-1" };
    },
    findOpenRoom: async (roomId) => {
      calls.push(["findOpenRoom", roomId]);
      return { id: roomId, isSaved: false };
    },
    getActiveAuthenticatedUserId: async () => "user-1",
    now: () => now,
    updateMemberLastSeen: async (input) => {
      calls.push(["updateMemberLastSeen", input]);
    },
    updateRoomActivity: async (input) => {
      calls.push(["updateRoomActivity", input]);
    },
    ...overrides,
  };

  return { calls, dependencies, now };
}

test("authenticated membership refreshes the member and unsaved room deadline", async () => {
  const { calls, dependencies } = createDependencies();

  assert.equal(await touchAccountRoomActivity("room-1", dependencies), true);
  assert.deepEqual(calls, [
    ["findOpenRoom", "room-1"],
    ["findMember", "room-1", "user-1"],
    [
      "updateMemberLastSeen",
      {
        memberId: "member-1",
        roomId: "room-1",
        seenAt: "2026-07-16T10:00:00.000Z",
        userId: "user-1",
      },
    ],
    [
      "updateRoomActivity",
      {
        idleDeadlineAt: "2026-07-16T11:00:00.000Z",
        roomId: "room-1",
        seenAt: "2026-07-16T10:00:00.000Z",
      },
    ],
  ]);
});

test("saved room activity keeps the idle deadline disabled", async () => {
  const { calls, dependencies } = createDependencies({
    findOpenRoom: async (roomId) => ({ id: roomId, isSaved: true }),
  });

  assert.equal(await touchAccountRoomActivity("room-1", dependencies), true);
  assert.deepEqual(calls.at(-1), [
    "updateRoomActivity",
    {
      idleDeadlineAt: null,
      roomId: "room-1",
      seenAt: "2026-07-16T10:00:00.000Z",
    },
  ]);
});

test("unauthenticated requests do not query or update room state", async () => {
  const { calls, dependencies } = createDependencies({
    getActiveAuthenticatedUserId: async () => null,
  });

  assert.equal(await touchAccountRoomActivity("room-1", dependencies), false);
  assert.deepEqual(calls, []);
});

test("missing room or membership does not update lifecycle state", async () => {
  for (const overrides of [
    { findOpenRoom: async () => null },
    { findMember: async () => null },
  ]) {
    const { calls, dependencies } = createDependencies(overrides);

    assert.equal(await touchAccountRoomActivity("room-1", dependencies), false);
    assert.equal(
      calls.some(([name]) => name.startsWith("update")),
      false,
    );
  }
});

test("database update failures remain visible to the caller", async () => {
  const expected = new Error("member update failed");
  const { dependencies } = createDependencies({
    updateMemberLastSeen: async () => {
      throw expected;
    },
  });

  await assert.rejects(
    touchAccountRoomActivity("room-1", dependencies),
    expected,
  );
});

test("server action retains guest activity and falls back to account membership", async () => {
  const [actionSource, adapterSource, lifecycleSource] = await Promise.all([
    readFile(path.join(rootDir, "lib/rooms/actions.ts"), "utf8"),
    readFile(path.join(rootDir, "lib/rooms/activity.ts"), "utf8"),
    readFile(path.join(rootDir, "lib/rooms/lifecycle.ts"), "utf8"),
  ]);

  assert.match(
    actionSource,
    /reclaimGuestMembership\(\{\s*roomId: input\.roomId,\s*token,\s*\}\)/,
  );
  assert.match(actionSource, /if \(session\) \{\s*return \{ touched: true \};/);
  assert.match(actionSource, /touchSignedInRoomActivity\(input\.roomId\)/);
  assert.doesNotMatch(
    actionSource,
    /touchRoomActivityAction\(input: \{[^}]*memberId/,
  );

  assert.match(adapterSource, /serverClient\.auth\.getUser\(\)/);
  assert.match(adapterSource, /\.from\("profiles"\)/);
  assert.match(adapterSource, /\.select\("account_status"\)/);
  assert.match(
    adapterSource,
    /profile\?\.account_status === "active" \? data\.user\.id : null/,
  );
  assert.match(adapterSource, /\.eq\("status", "open"\)/);
  assert.match(adapterSource, /\.eq\("room_id", targetRoomId\)/);
  assert.match(adapterSource, /\.eq\("user_id", userId\)/);
  assert.match(adapterSource, /\.update\(\{ last_seen_at: seenAt \}\)/);
  assert.match(adapterSource, /\.eq\("id", memberId\)/);
  assert.match(adapterSource, /idle_deadline_at: idleDeadlineAt/);

  assert.match(lifecycleSource, /\.gt\("last_seen_at", freshnessCutoffIso\)/);
  assert.match(lifecycleSource, /\.eq\("is_saved", false\)/);
});
