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
  path.join(tmpdir(), "mistake-watch-room-refresh-"),
);
const sourcePath = path.join(rootDir, "lib/account/room-refresh-policy.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "room-refresh-policy.mjs");

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

const {
  ACCOUNT_ROOMS_REFRESH_INTERVAL_MS,
  shouldApplyAccountRoomSnapshot,
  shouldRefreshAccountRooms,
} = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("uses the approved bounded account-room refresh interval", () => {
  assert.equal(ACCOUNT_ROOMS_REFRESH_INTERVAL_MS, 4_000);
});

test("refreshes only for a visible online document with no request pending", () => {
  assert.equal(
    shouldRefreshAccountRooms({
      documentHidden: false,
      online: true,
      requestPending: false,
    }),
    true,
  );
  assert.equal(
    shouldRefreshAccountRooms({
      documentHidden: true,
      online: true,
      requestPending: false,
    }),
    false,
  );
  assert.equal(
    shouldRefreshAccountRooms({
      documentHidden: false,
      online: false,
      requestPending: false,
    }),
    false,
  );
  assert.equal(
    shouldRefreshAccountRooms({
      documentHidden: false,
      online: true,
      requestPending: true,
    }),
    false,
  );
});

test("applies only the latest live request before disposal", () => {
  assert.equal(
    shouldApplyAccountRoomSnapshot({
      disposed: false,
      latestRequestSequence: 4,
      requestSequence: 4,
    }),
    true,
  );
  assert.equal(
    shouldApplyAccountRoomSnapshot({
      disposed: false,
      latestRequestSequence: 5,
      requestSequence: 4,
    }),
    false,
  );
  assert.equal(
    shouldApplyAccountRoomSnapshot({
      disposed: true,
      latestRequestSequence: 4,
      requestSequence: 4,
    }),
    false,
  );
});

test("Rooms client refreshes on activity and cleans up every listener", async () => {
  const component = await readFile(
    path.join(rootDir, "components/account/account-rooms-section.tsx"),
    "utf8",
  );

  assert.match(component, /window\.setInterval/);
  assert.match(component, /window\.addEventListener\("focus"/);
  assert.match(component, /window\.addEventListener\("online"/);
  assert.match(component, /document\.addEventListener\("visibilitychange"/);
  assert.match(component, /window\.clearInterval/);
  assert.match(component, /window\.removeEventListener\("focus"/);
  assert.match(component, /window\.removeEventListener\("online"/);
  assert.match(component, /document\.removeEventListener\("visibilitychange"/);
  assert.match(component, /controller\.abort\(\)/);
  assert.match(component, /shouldApplyAccountRoomSnapshot/);
  assert.doesNotMatch(component, /createClient|supabase|\.channel\(/i);
});

test("background refresh errors retain the last successful room list", async () => {
  const [component, listView] = await Promise.all([
    readFile(
      path.join(rootDir, "components/account/account-rooms-section.tsx"),
      "utf8",
    ),
    readFile(
      path.join(rootDir, "components/account/account-room-list-view.tsx"),
      "utf8",
    ),
  ]);

  assert.doesNotMatch(component, /setRooms\(null\)/);
  assert.match(component, /error \? null : \(/);
  assert.match(component, /rooms=\{rooms\}/);
  assert.match(listView, /rooms\.map/);
});
