import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function read(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

test("TV mode reuses Listen preference and persistent settings controllers", async () => {
  const [layout, tvMode, tvNowPlaying] = await Promise.all([
    read("components/room/listen/listen-mode-layout.tsx"),
    read("components/room/listen/tv/tv-mode-layout.tsx"),
    read("components/room/listen/tv/tv-mode-now-playing.tsx"),
  ]);

  assert.match(layout, /mediaPreferences=\{mediaPreferences\}/);
  assert.match(layout, /preferenceItem=\{activePreferenceItem\}/);
  assert.match(layout, /onTvSettingsChange=\{setTvSettings\}/);
  assert.match(layout, /settingsOpen=\{tvSettingsOpen\}/);
  assert.match(tvMode, /ListenRoomSettingsDialog/);
  assert.match(tvMode, /preferenceItem=\{preferenceItem\}/);
  assert.match(tvNowPlaying, /PreferenceHeartButton/);
  assert.match(tvNowPlaying, /item=\{preferenceItem\}/);
});

test("TV settings stay reachable and restore focus after closing", async () => {
  const [tvMode, topBar] = await Promise.all([
    read("components/room/listen/tv/tv-mode-layout.tsx"),
    read("components/room/listen/tv/tv-mode-top-bar.tsx"),
  ]);

  assert.match(topBar, /aria-haspopup="dialog"/);
  assert.match(topBar, /aria-controls="listen-room-settings-dialog"/);
  assert.match(topBar, /EllipsisVertical/);
  assert.match(tvMode, /!controlsVisible && !settingsOpen/);
  assert.match(tvMode, /onFocusCapture=\{showControlsTemporarily\}/);
  assert.match(tvMode, /onKeyDown=\{showControlsTemporarily\}/);
  assert.match(tvMode, /settingsButtonRef\.current\?\.focus\(\)/);
});

test("Escape closes TV settings before the TV presentation", async () => {
  const layout = await read("components/room/listen/listen-mode-layout.tsx");
  const settingsGuard = layout.indexOf("if (tvSettingsOpen)");
  const tvExit = layout.indexOf('event.key === "Escape" && tvMode');

  assert.ok(settingsGuard >= 0);
  assert.ok(tvExit > settingsGuard);
  assert.match(layout, /\[tvMode, tvSettingsOpen\]/);
});

test("shared TV settings dialog exposes the trigger target id", async () => {
  const dialog = await read(
    "components/room/listen/settings/settings-dialogs.tsx",
  );

  assert.match(dialog, /id="listen-room-settings-dialog"/);
  assert.match(dialog, /autoFocus/);
  assert.match(dialog, /Settings persist on this browser\./);
});
