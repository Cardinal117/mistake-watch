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
  const audienceSource = await readRoomSource(
    "watch/audience/watch-audience-system.tsx",
  );

  assert.ok(layoutSource.includes('import("./queue/watch-queue-surface")'));
  assert.match(
    layoutSource,
    /activeSurface === "queue" \? \(\s*<WatchQueueSurface/,
  );
  assert.ok(audienceSource.includes('import("../../room-chat-panel")'));
  assert.ok(audienceSource.includes('import("../../members-panel")'));
});

test("listen TV mode keeps its existing state gate around a dynamic boundary", async () => {
  const source = await readRoomSource("listen/listen-mode-layout.tsx");

  assert.ok(
    source.includes('import("@/components/room/listen/tv/tv-mode-layout")'),
  );
  assert.match(source, /if \(tvMode\) \{\s*return \(\s*<ListenTvModeLayout/);
});
