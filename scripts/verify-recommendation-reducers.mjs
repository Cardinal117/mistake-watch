import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const server =
  process.env.MISTAKE_WATCH_SPACETIME_URL ?? "http://127.0.0.1:5372";
const database =
  process.env.MISTAKE_WATCH_RECOMMENDATION_TEST_DB ?? "task011-reducer-proof";
const roomId = "task011-runtime-room";
const hostMemberId = "task011-runtime-host";
const seedToken = "task011-runtime-seed-token-12345678901234567890";

function spacetime(args, options = {}) {
  try {
    return execFileSync("spacetime", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: options.quiet ? ["ignore", "pipe", "pipe"] : undefined,
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(`spacetime ${args[0]} failed\n${detail}`, {
      cause: error,
    });
  }
}

function call(name, ...args) {
  return spacetime(
    [
      "call",
      "--no-config",
      "--server",
      server,
      database,
      name,
      ...args.map((value) => JSON.stringify(value)),
    ],
    { quiet: true },
  );
}

function sql(query) {
  return spacetime(
    ["sql", "--no-config", "--server", server, database, query],
    { quiet: true },
  );
}

function scalar(query) {
  const output = sql(query);
  const matches = [...output.matchAll(/^\s*(\d+)\s*$/gm)];
  assert.ok(matches.length, `No scalar value in SQL output:\n${output}`);
  return Number(matches.at(-1)[1]);
}

function value(query, pattern, label) {
  const output = sql(query);
  const match = output.match(pattern);
  assert.ok(match, `${label} missing from SQL output:\n${output}`);
  return match[1];
}

function queueItemId(title) {
  return value(
    `SELECT queue_item_id, title FROM live_queue_item WHERE room_id = '${roomId}'`,
    new RegExp(`"([0-9a-f-]{36})"\\s+\\|\\s+\\(some = "${title}"\\)`, "i"),
    `${title} queue item`,
  );
}

function roomSessionValue(
  column,
  pattern = /\(some = "(https?:\/\/[^"\s]+)"\)/i,
) {
  return value(
    `SELECT ${column} FROM room_session WHERE room_id = '${roomId}'`,
    pattern,
    `room_session.${column}`,
  );
}

spacetime(
  ["publish", database, "--server", server, "--delete-data=always", "--yes"],
  { quiet: true },
);

call(
  "issue_room_seed_grant",
  Date.now() + 120_000,
  hostMemberId,
  roomId,
  seedToken,
);
call(
  "seed_room_session",
  hostMemberId,
  "watch",
  "TASK-011 runtime",
  roomId,
  seedToken,
);
call("join_room", null, "Runtime Host", hostMemberId, "host", roomId);

const sources = [
  ["Runtime A", "https://www.youtube.com/watch?v=hmJPbHVK-co"],
  ["Runtime B", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
  ["Runtime C", "https://www.youtube.com/watch?v=9bZkp7q19f0"],
];

for (const [title, sourceUrl] of sources) {
  call(
    "add_queue_item",
    hostMemberId,
    "",
    null,
    { some: 120 },
    false,
    false,
    false,
    true,
    `add:${title}`,
    null,
    null,
    roomId,
    title,
    "youtube",
    sourceUrl,
    null,
  );
}

assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM live_queue_item WHERE room_id = '${roomId}'`,
  ),
  3,
);
const itemA = queueItemId("Runtime A");
const itemB = queueItemId("Runtime B");
const itemC = queueItemId("Runtime C");

const initialCPosition = scalar(
  `SELECT live_queue_item.position FROM live_queue_item WHERE queue_item_id = '${itemC}'`,
);
call("move_queue_item", hostMemberId, "", 0, itemC, roomId);
assert.equal(
  scalar(
    `SELECT live_queue_item.position FROM live_queue_item WHERE queue_item_id = '${itemC}'`,
  ),
  initialCPosition,
  "a reorder without an action id must be rejected",
);
call("set_queue_item_priority", hostMemberId, "", false, true, itemC, roomId);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM live_queue_item WHERE queue_item_id = '${itemC}' AND is_play_next = true`,
  ),
  0,
  "a priority change without an action id must be rejected",
);

call("move_queue_item", hostMemberId, "shuffle:one", 0, itemC, roomId);
call("move_queue_item", hostMemberId, "shuffle:one", 2, itemB, roomId);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'queue_reordered'`,
  ),
  1,
  "one multi-move shuffle should emit one operational event",
);
call("move_queue_item", hostMemberId, "shuffle:two", 1, itemC, roomId);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'queue_reordered'`,
  ),
  2,
  "a later shuffle should emit a distinct event",
);

call("play_queue_item", hostMemberId, "play:a:one", itemA, roomId);
call("set_playback_state", hostMemberId, 1, 0, roomId, "playing");
const firstOccurrence = roomSessionValue(
  "playback_occurrence_id",
  /\(some = "([0-9a-f-]{36})"\)/i,
);
const firstSource = roomSessionValue("source_url");
call("set_playback_state", hostMemberId, 1, 120, roomId, "ended");
call(
  "advance_queue_item",
  hostMemberId,
  true,
  { some: itemA },
  { some: firstOccurrence },
  { some: firstSource },
  roomId,
);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'playback_completed'`,
  ),
  1,
);

call("play_queue_item", hostMemberId, "play:a:replay", itemA, roomId);
call("set_playback_state", hostMemberId, 1, 0, roomId, "playing");
const replayOccurrence = roomSessionValue(
  "playback_occurrence_id",
  /\(some = "([0-9a-f-]{36})"\)/i,
);
assert.notEqual(replayOccurrence, firstOccurrence);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'playback_replayed'`,
  ),
  1,
);

call(
  "report_media_failure",
  hostMemberId,
  false,
  { some: itemA },
  { some: firstOccurrence },
  firstSource,
  "youtube_unavailable",
  roomId,
);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'source_failed'`,
  ),
  0,
  "a stale occurrence must not report a failure against a replay",
);
call(
  "report_media_failure",
  hostMemberId,
  false,
  { some: itemA },
  { some: replayOccurrence },
  firstSource,
  "youtube_unavailable",
  roomId,
);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'source_failed'`,
  ),
  1,
);

call(
  "set_guest_media_preference",
  hostMemberId,
  "like:a",
  0,
  true,
  itemA,
  roomId,
);
call(
  "set_guest_media_preference",
  hostMemberId,
  "like:a",
  0,
  true,
  itemA,
  roomId,
);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'media_liked'`,
  ),
  1,
);
call(
  "set_guest_media_preference",
  hostMemberId,
  "unlike:a",
  1,
  false,
  itemA,
  roomId,
);
assert.equal(
  scalar(
    `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'media_unliked'`,
  ),
  1,
);

console.log("TASK-011 reducer runtime proof passed.");
