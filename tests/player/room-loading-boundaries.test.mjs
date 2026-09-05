import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function readRoomSource(relativePath) {
  return readFile(path.join(rootDir, "components/room", relativePath), "utf8");
}

test("room composition dynamically loads only the active room mode", async () => {
  const source = await readRoomSource("room-experience.tsx");

  assert.match(source, /import dynamic from "next\/dynamic"/);
  assert.ok(source.includes('import("./listen/listen-mode-layout")'));
  assert.ok(source.includes('import("./watch/watch-mode-layout")'));
  assert.doesNotMatch(source, /from "\.\/(?:listen|watch)-mode-layout"/);
});

test("hidden watch workflows load only when their surfaces are opened", async () => {
  const layoutSource = await readRoomSource("watch/watch-mode-layout.tsx");
  const browseSource = await readRoomSource("watch/browse/watch-browser.tsx");
  const cardSource = await readRoomSource("watch/library/media-asset-item.ts");
  assert.ok(layoutSource.includes('import("./watch-workspaces")'));
  assert.ok(layoutSource.includes('import("./media-hub/watch-media-hub")'));
  assert.match(layoutSource, /screen !== "home" && screen !== "manage"/);
  assert.match(layoutSource, /screen === "manage" && isOwner/);
  assert.doesNotMatch(browseSource, /from ".*(?:upload|media-hub-helpers)/);
  assert.doesNotMatch(
    cardSource,
    /from ".*(?:upload-transport|media-inspection)/,
  );
});

test("listen TV mode keeps its existing state gate around a dynamic boundary", async () => {
  const source = await readRoomSource("listen/listen-mode-layout.tsx");

  assert.ok(
    source.includes('import("@/components/room/listen/tv/tv-mode-layout")'),
  );
  assert.match(source, /if \(tvMode\) \{\s*return \(\s*<ListenTvModeLayout/);
});
