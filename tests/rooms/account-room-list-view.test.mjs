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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-room-list-"));
const sourcePath = path.join(rootDir, "lib/account/room-list-view.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "room-list-view.mjs");

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

const { projectAccountRoomListView } = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function room(overrides = {}) {
  return {
    id: "room-1",
    isSaved: false,
    lastActiveAt: "2026-08-17T10:00:00.000Z",
    mode: "watch",
    name: "Watch room",
    privacy: "invite",
    relationship: "joined",
    status: "open",
    ...overrides,
  };
}

function project(overrides = {}) {
  return projectAccountRoomListView({
    query: "",
    relationship: "all",
    rooms: [],
    sort: "recent",
    ...overrides,
  });
}

test("searches room names without changing source order or objects", () => {
  const target = room({ id: "anime", name: "Friday Anime Room" });
  const result = project({
    query: "  ANIME ",
    rooms: [room({ id: "music", name: "Music" }), target],
  });

  assert.deepEqual(result.openRooms, [target]);
  assert.equal(result.openRooms[0], target);
});

test("saved filtering includes saved rooms even when ownership takes precedence", () => {
  const ownedAndSaved = room({
    id: "owned-saved",
    isSaved: true,
    relationship: "owned",
  });
  const savedOnly = room({
    id: "saved-only",
    isSaved: true,
    relationship: "saved",
  });
  const result = project({
    relationship: "saved",
    rooms: [ownedAndSaved, savedOnly, room({ id: "joined" })],
  });

  assert.deepEqual(
    result.openRooms.map(({ id }) => id),
    ["owned-saved", "saved-only"],
  );
});

test("filters owned and joined relationships independently", () => {
  const rooms = [
    room({ id: "owned", relationship: "owned" }),
    room({ id: "joined", relationship: "joined" }),
    room({ id: "saved", isSaved: true, relationship: "saved" }),
  ];

  assert.deepEqual(
    project({ relationship: "owned", rooms }).openRooms.map(({ id }) => id),
    ["owned"],
  );
  assert.deepEqual(
    project({ relationship: "joined", rooms }).openRooms.map(({ id }) => id),
    ["joined"],
  );
});

test("sorts recent oldest and name views deterministically", () => {
  const rooms = [
    room({
      id: "bravo",
      lastActiveAt: "2026-08-15T10:00:00.000Z",
      name: "Bravo",
    }),
    room({
      id: "alpha",
      lastActiveAt: "2026-08-17T10:00:00.000Z",
      name: "Alpha",
    }),
    room({
      id: "charlie",
      lastActiveAt: "2026-08-10T10:00:00.000Z",
      name: "Charlie",
    }),
  ];

  assert.deepEqual(
    project({ rooms, sort: "recent" }).openRooms.map(({ id }) => id),
    ["alpha", "bravo", "charlie"],
  );
  assert.deepEqual(
    project({ rooms, sort: "oldest" }).openRooms.map(({ id }) => id),
    ["charlie", "bravo", "alpha"],
  );
  assert.deepEqual(
    project({ rooms, sort: "name" }).openRooms.map(({ id }) => id),
    ["alpha", "bravo", "charlie"],
  );
});

test("groups open and closed rooms after filtering and sorting", () => {
  const result = project({
    rooms: [
      room({ id: "open", relationship: "owned" }),
      room({ id: "closed", relationship: "owned", status: "closed" }),
      room({ id: "joined", relationship: "joined" }),
    ],
    relationship: "owned",
  });

  assert.equal(result.filteredCount, 2);
  assert.deepEqual(
    result.openRooms.map(({ id }) => id),
    ["open"],
  );
  assert.deepEqual(
    result.closedRooms.map(({ id }) => id),
    ["closed"],
  );
});

test("invalid activity timestamps remain stable and sort after valid dates", () => {
  const result = project({
    rooms: [
      room({ id: "invalid", lastActiveAt: "unknown", name: "Invalid" }),
      room({ id: "valid", lastActiveAt: "2026-08-17T10:00:00.000Z" }),
    ],
  });

  assert.deepEqual(
    result.openRooms.map(({ id }) => id),
    ["valid", "invalid"],
  );
});

test("Rooms interface exposes labeled controls and accessible state groups", async () => {
  const source = await readFile(
    path.join(rootDir, "components/account/account-room-list-view.tsx"),
    "utf8",
  );

  assert.match(source, /Search rooms/);
  assert.match(source, /Relationship/);
  assert.match(source, /Recent activity/);
  assert.match(source, /Open rooms/);
  assert.match(source, /Closed history/);
  assert.match(source, /<details/);
  assert.match(source, /<summary/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /key=\{room\.id\}/);
  assert.match(source, /room=\{room\}/);
  assert.match(source, /key=\{`closed:\$\{revealKey/);
  assert.match(source, /revealKey && view\.closedRooms\.length > 0/);
});

test("Rooms title and count live in one responsive command-panel header", async () => {
  const [panel, section] = await Promise.all([
    readFile(
      path.join(rootDir, "components/account/account-command-panel.tsx"),
      "utf8",
    ),
    readFile(
      path.join(rootDir, "components/account/account-rooms-section.tsx"),
      "utf8",
    ),
  ]);

  assert.match(panel, /activeTab === "rooms" && accountRoomsCount !== null/);
  assert.match(panel, /previously joined spaces linked to this/);
  assert.match(panel, /Guest rooms stay local to this browser/);
  assert.doesNotMatch(panel, /<header className="hidden/);
  assert.doesNotMatch(section, /Your spaces|Account rooms\s*<\/p>/);
});

test("signed-in authentication scope and sign out remain in Account", async () => {
  const panel = await readFile(
    path.join(rootDir, "components/account/account-command-panel.tsx"),
    "utf8",
  );

  assert.match(panel, /activeTab === "account"/);
  assert.match(panel, /Identity scope/);
  assert.match(panel, /Google sign-in is identity-only here/);
  assert.match(panel, /Sign out/);
  assert.match(panel, /signOutHref=\{signOutHref\}/);
  assert.match(panel, /\{signedIn \? \(/);
  assert.match(panel, /\) : null\}/);
});

test("guest accounts retain one persistent sign-in footer", async () => {
  const panel = await readFile(
    path.join(rootDir, "components/account/account-command-panel.tsx"),
    "utf8",
  );

  assert.match(panel, /!isSignedIn \? \(/);
  assert.match(panel, /<footer/);
  assert.match(panel, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(panel, /grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(panel, /Continue with Google/);
  assert.match(panel, /href=\{signInHref\}/);
  assert.match(panel, /identity, rooms, and preferences available/);
});
