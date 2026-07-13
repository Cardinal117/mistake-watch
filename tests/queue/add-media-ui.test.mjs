import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readSourceTree } from "../helpers/read-source-tree.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const queuePanelSource = await readFile(
  path.join(root, "components/room/queue-panel.tsx"),
  "utf8",
);
const listenLayoutSource = await readSourceTree(
  root,
  "components/room/listen-mode-layout.tsx",
  "components/room/listen",
);
const membersPanelSource = await readFile(
  path.join(root, "components/room/members-panel.tsx"),
  "utf8",
);
const permissionTogglesSource = await readFile(
  path.join(root, "components/room/permission-toggles.tsx"),
  "utf8",
);
const liveRoomSource = await readFile(
  path.join(root, "lib/spacetime/use-live-room.ts"),
  "utf8",
);

test("visible queue permission is not split into a hidden manage chip", () => {
  assert.doesNotMatch(membersPanelSource, /label:\s*"Manage"/);
  assert.doesNotMatch(permissionTogglesSource, /label:\s*"Manage"/);
  assert.match(liveRoomSource, /const queueAuthority = nextPermissions\.queue/);
  assert.match(liveRoomSource, /canAddQueue:\s*queueAuthority/);
  assert.match(liveRoomSource, /canManageQueue:\s*queueAuthority/);
});

test("add media flow is url-driven instead of manual mode-card driven", () => {
  for (const source of [queuePanelSource, listenLayoutSource]) {
    assert.match(source, /setTimeout\(\(\)\s*=>/);
    assert.match(source, /detectUrlType\(trimmedUrl\)\s*===\s*"youtube-playlist"/);
    assert.match(source, /setSinglePreview/);
  }

  assert.doesNotMatch(listenLayoutSource, /Add single song/);
  assert.doesNotMatch(listenLayoutSource, /Paste a playlist link first/);
});

test("playlist review exposes search sort select import and duration controls", () => {
  for (const expected of [
    "Search playlist",
    "Duplicates",
    "Select all",
    "Add All",
    "Add Selected",
    "Under 3 min",
    "Under 6 min",
    "Under 10 min",
  ]) {
    assert.ok(
      queuePanelSource.includes(expected) || listenLayoutSource.includes(expected),
      `${expected} should be present in playlist review UI`,
    );
  }
});

test("playlist duration filters are reserved above the scrollable rows", () => {
  assert.match(queuePanelSource, /grid-rows-\[auto_auto_auto_auto_minmax\(0,1fr\)_auto\]/);
  assert.match(queuePanelSource, /Duration filter/);
  assert.match(queuePanelSource, /min-h-0 gap-1\.5 overflow-y-auto/);
  assert.match(listenLayoutSource, /Duration filter/);
});

test("playlist duplicates warn and can be imported without duplicates or anyway", () => {
  for (const source of [queuePanelSource, listenLayoutSource]) {
    assert.match(source, /duplicate playlist item/);
    assert.match(source, /Add without duplicates/);
    assert.match(source, /Add anyway/);
  }
});

test("queue outcome notifications are rendered as fixed room-level toasts", () => {
  for (const source of [queuePanelSource, listenLayoutSource]) {
    assert.match(source, /fixed bottom-4 right-4 z-\[130\]/);
    assert.match(source, /role=\{notification\.tone === "error" \? "alert" : "status"\}/);
  }
});

test("server room errors are surfaced as queue notifications", () => {
  for (const source of [queuePanelSource, listenLayoutSource]) {
    assert.match(source, /roomErrors/);
    assert.match(source, /notifiedRoomErrorIds/);
    assert.match(source, /notify\(error\.message, roomErrorToneBySeverity\[error\.severity\]\)/);
  }
});

test("media failures remain visible in history and on affected queue rows", () => {
  assert.match(queuePanelSource, /Playback events/);
  assert.match(queuePanelSource, /event\.providerId/);
  assert.match(queuePanelSource, /event\.actorSource === "system"/);
  assert.match(queuePanelSource, /item\.failureReason/);
  assert.match(queuePanelSource, /Repeated \{item\.failureCount\}/);
  assert.match(listenLayoutSource, /item\.failureReason \? "text-error"/);
});

test("playlist selection uses row keys instead of collapsing duplicate video ids", () => {
  for (const source of [queuePanelSource, listenLayoutSource]) {
    assert.match(source, /function playlistItemKey\(item: PlaylistPreviewItem\)/);
    assert.match(source, /\$\{item\.videoId\}:\$\{item\.position\}/);
    assert.match(source, /selectedIds\.has\(playlistItemKey\(item\)\)/);
    assert.doesNotMatch(source, /key=\{item\.videoId\}/);
  }
});

test("queue add reducer payload always sends an explicit duplicate boolean", () => {
  assert.match(liveRoomSource, /allowDuplicate:\s*input\.allowDuplicate \?\? false/);
});
