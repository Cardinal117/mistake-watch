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
  path.join(tmpdir(), "mistake-watch-account-rooms-"),
);
const sourcePath = path.join(rootDir, "lib/account/room-projection.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "room-projection.mjs");

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

const { projectAccountRooms } = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function room(overrides = {}) {
  return {
    created_at: "2026-08-01T10:00:00.000Z",
    id: "room-1",
    is_saved: false,
    last_active_at: "2026-08-10T10:00:00.000Z",
    mode: "watch",
    name: "Watch room",
    owner_user_id: null,
    privacy: "invite",
    saved_by_user_id: null,
    status: "open",
    updated_at: "2026-08-09T10:00:00.000Z",
    ...overrides,
  };
}

test("projects only rooms related to the authenticated account", () => {
  const result = projectAccountRooms({
    memberRoomIds: ["joined-room"],
    rooms: [
      room({ id: "owned-room", owner_user_id: "account-1" }),
      room({ id: "saved-room", is_saved: true, saved_by_user_id: "account-1" }),
      room({ id: "joined-room" }),
      room({ id: "unrelated-room", owner_user_id: "account-2" }),
    ],
    userId: "account-1",
  });

  assert.deepEqual(
    result.map(({ id, relationship }) => ({ id, relationship })),
    [
      { id: "joined-room", relationship: "joined" },
      { id: "owned-room", relationship: "owned" },
      { id: "saved-room", relationship: "saved" },
    ],
  );
});

test("deduplicates rooms and applies owned then saved relationship precedence", () => {
  const result = projectAccountRooms({
    memberRoomIds: ["room-1", "room-2"],
    rooms: [
      room({
        id: "room-1",
        is_saved: true,
        owner_user_id: "account-1",
        saved_by_user_id: "account-1",
      }),
      room({
        id: "room-1",
        is_saved: true,
        owner_user_id: "account-1",
        saved_by_user_id: "account-1",
      }),
      room({
        id: "room-2",
        is_saved: true,
        saved_by_user_id: "account-1",
      }),
    ],
    userId: "account-1",
  });

  assert.equal(result.length, 2);
  assert.equal(
    result.find((entry) => entry.id === "room-1")?.relationship,
    "owned",
  );
  assert.equal(
    result.find((entry) => entry.id === "room-2")?.relationship,
    "saved",
  );
});

test("sorts by recent activity and exposes only room-list metadata", () => {
  const result = projectAccountRooms({
    memberRoomIds: ["older", "newer"],
    rooms: [
      room({ id: "older", last_active_at: "2026-08-10T10:00:00.000Z" }),
      room({
        id: "newer",
        last_active_at: "2026-08-16T10:00:00.000Z",
        mode: "listen",
        privacy: "friends",
        status: "closed",
      }),
    ],
    userId: "account-1",
  });

  assert.deepEqual(
    result.map((entry) => entry.id),
    ["newer", "older"],
  );
  assert.deepEqual(Object.keys(result[0]).sort(), [
    "id",
    "isSaved",
    "kind",
    "lastActiveAt",
    "mode",
    "name",
    "privacy",
    "relationship",
    "status",
  ]);
  assert.equal(JSON.stringify(result).includes("source"), false);
  assert.equal(JSON.stringify(result).includes("inviteCode"), false);
  assert.equal(JSON.stringify(result).includes("inviteToken"), false);
  assert.equal(JSON.stringify(result).includes("email"), false);
});

test("Legacy metadata preserves saved, joined and closed room projection", () => {
  for (const room_kind of [undefined, "legacy"]) {
    const input = room({
      room_kind,
      is_saved: true,
      saved_by_user_id: "account-1",
      status: "closed",
    });
    const [result] = projectAccountRooms({
      memberRoomIds: [],
      rooms: [input],
      userId: "account-1",
    });
    assert.equal(result.kind, "legacy");
    assert.equal(result.isSaved, true);
    assert.equal(result.status, "closed");
    assert.equal(result.relationship, "saved");
    assert.equal(input.room_kind, room_kind);
  }
});

test("route derives identity server-side and marks responses private", async () => {
  const routeSource = await readFile(
    path.join(rootDir, "app/api/account/rooms/route.ts"),
    "utf8",
  );

  assert.match(routeSource, /getAccountSummary\(\)/);
  assert.match(routeSource, /account\.status !== "signed-in"/);
  assert.match(routeSource, /listAccountRooms\(account\.id\)/);
  assert.match(routeSource, /private, no-store/);
  assert.doesNotMatch(routeSource, /searchParams|request\.json|request\.url/);
});

test("dashboard combines account rooms with guest-cookie rooms", async () => {
  const dashboardSource = await readFile(
    path.join(rootDir, "lib/rooms/data.ts"),
    "utf8",
  );

  assert.match(dashboardSource, /listAccountRooms\(accountUserId\)/);
  assert.match(dashboardSource, /mergeDashboardRooms\(/);
  assert.match(dashboardSource, /room\.status === "open"/);
});

// Additional negative coverage after the implementation; not red-first evidence.
test("unsupported stored kinds never appear as Legacy account rooms", () => {
  for (const room_kind of ["unknown", null]) {
    assert.deepEqual(
      projectAccountRooms({
        memberRoomIds: ["room-1"],
        rooms: [room({ room_kind, owner_user_id: "account-1" })],
        userId: "account-1",
      }),
      [],
    );
  }
});

test("Personal is only projected for its owner, never a stale member or saved account", () => {
  const input = room({
    room_kind: "personal",
    owner_user_id: "account-1",
    saved_by_user_id: "account-2",
  });
  const own = projectAccountRooms({
    rooms: [input],
    memberRoomIds: [],
    userId: "account-1",
  });
  assert.equal(own[0].kind, "personal");
  assert.deepEqual(
    projectAccountRooms({
      rooms: [input],
      memberRoomIds: [input.id],
      userId: "account-2",
    }),
    [],
  );
});

test("Shared returns by membership without a star; stale saved access is excluded", () => {
  const input = room({ room_kind: "shared", owner_user_id: "owner" });
  const [joined] = projectAccountRooms({
    rooms: [input],
    memberRoomIds: [input.id],
    userId: "friend",
  });
  assert.equal(joined.kind, "shared");
  assert.equal(joined.relationship, "joined");
  assert.equal(joined.isSaved, false);
  assert.deepEqual(
    projectAccountRooms({
      rooms: [{ ...input, is_saved: true, saved_by_user_id: "friend" }],
      memberRoomIds: [],
      userId: "friend",
    }),
    [],
  );
});

 test("Themed account rooms retain their kind without requiring a bookmark", () => {
 const result = projectAccountRooms({ memberRoomIds: [], rooms: [room({ room_kind: "themed", owner_user_id: "account-1", is_saved: false })], userId: "account-1" });
 assert.equal(result[0].kind, "themed");
 });
