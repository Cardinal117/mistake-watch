import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { root } from "./ranking-test-helpers.mjs";

test("Like control exposes stable accessible pressed and unavailable states", async () => {
  const source = await read(
    "components/room/listen/preference-heart-button.tsx",
  );

  assert.match(source, /Heart/);
  assert.match(source, /aria-pressed=\{preference\.liked\}/);
  assert.match(source, /Like \$\{item\.title\}/);
  assert.match(source, /Remove Like from \$\{item\.title\}/);
  assert.match(source, /h-8 w-8 shrink-0/);
  assert.match(
    source,
    /disabled=\{!preference\.available \|\| preference\.pending\}/,
  );
});

test("Like hook updates optimistically and restores authoritative state on failure", async () => {
  const source = await read("lib/recommendations/use-media-preferences.ts");
  const optimisticUpdate = source.indexOf("const optimistic =");
  const networkUpdate = source.indexOf("await updateRoomMediaPreference");

  assert.ok(optimisticUpdate >= 0 && optimisticUpdate < networkUpdate);
  assert.match(source, /mutationError\?\.current \?\? current/);
  assert.match(source, /mutationError\?\.status === 403/);
  assert.match(source, /setBlockedKeys/);
  assert.match(source, /roomIdRef\.current !== roomId/);
});

test("Like hook reconciles active clients without overriding newer local state", async () => {
  const source = await read("lib/recommendations/use-media-preferences.ts");

  assert.match(source, /PREFERENCE_RECONCILE_INTERVAL_MS = 10_000/);
  assert.match(source, /window\.setInterval/);
  assert.match(source, /window\.addEventListener\("focus"/);
  assert.match(source, /window\.addEventListener\("online"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /shouldApplyPreferenceSnapshot/);
  assert.match(source, /pendingKeysRef\.current = new Set\(\)/);
});

test("Listen surfaces use the same room preference controller", async () => {
  const [layout, nowPlaying, cards] = await Promise.all([
    read("components/room/listen/listen-mode-layout.tsx"),
    read("components/room/listen/now-playing/now-playing-panel.tsx"),
    read("components/room/listen/discovery/media-cards.tsx"),
  ]);

  assert.match(layout, /useMediaPreferences/);
  assert.match(layout, /allowUploaded: account\.status === "signed-in"/);
  assert.match(nowPlaying, /PreferenceHeartButton/);
  assert.match(cards, /PreferenceHeartButton/);
});

test("first-party ranking preserves provider order as the safe fallback", async () => {
  const source = await read(
    "components/room/listen/discovery/discovery-panel.tsx",
  );

  assert.match(source, /return providerItems;/);
  assert.match(source, /ranked\.response\.status !== "available"/);
  assert.match(source, /return rankedItems;/);
  assert.match(source, /providerRankedEmpty/);
  assert.match(source, /Mistake Watch ranking/);
  assert.doesNotMatch(source, /youtube.*like|like.*youtube/i);
});

test("Like errors are announced and successful mutations refresh ranking", async () => {
  const [button, hook, discovery] = await Promise.all([
    read("components/room/listen/preference-heart-button.tsx"),
    read("lib/recommendations/use-media-preferences.ts"),
    read("components/room/listen/discovery/discovery-panel.tsx"),
  ]);

  assert.match(button, /aria-describedby/);
  assert.match(button, /role="status"/);
  assert.match(hook, /setRankingRevision/);
  assert.match(discovery, /preferenceRevision: mediaPreferences\.revision/);
});

function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}
