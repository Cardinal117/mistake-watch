import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const entrypoint = readFileSync(
  join(root, "lib/spacetime/use-live-room.ts"),
  "utf8",
);
const clientTypes = readFileSync(
  join(root, "lib/spacetime/live-room/client-types.ts"),
  "utf8",
);
const snapshotHelpers = readFileSync(
  join(root, "lib/spacetime/live-room/snapshot.ts"),
  "utf8",
);
const connectionLifecycle = readFileSync(
  join(root, "lib/spacetime/live-room/use-room-connection.ts"),
  "utf8",
);

test("live room compatibility entrypoint delegates client boundaries", () => {
  assert.match(
    entrypoint,
    /export type \{ LiveRoomState \} from "\.\/live-room\/client-types";/,
  );
  assert.match(entrypoint, /from "\.\/live-room\/snapshot";/);
  assert.match(entrypoint, /useRoomConnection\(room\)/);

  for (const helper of [
    "adjustSnapshotClock",
    "buildFallbackSnapshot",
    "mapLiveParticipants",
    "readLiveSnapshot",
    "shouldPreserveCurrentSnapshotDuringReconnect",
  ]) {
    const consumer =
      helper === "mapLiveParticipants" ? entrypoint : connectionLifecycle;

    assert.match(consumer, new RegExp(`\\b${helper}\\(`));
    assert.doesNotMatch(
      entrypoint,
      new RegExp(`function ${helper}\\(`),
      `${helper} should remain owned by the snapshot module`,
    );
    assert.match(snapshotHelpers, new RegExp(`export function ${helper}\\(`));
  }

  assert.match(clientTypes, /export type LiveDb =/);
  assert.match(clientTypes, /export type LiveReducers =/);
  assert.match(clientTypes, /export type LiveRoomState =/);
  assert.doesNotMatch(entrypoint, /type LiveReducers =/);
});
