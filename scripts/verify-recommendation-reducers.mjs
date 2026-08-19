import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";

const server =
  process.env.MISTAKE_WATCH_SPACETIME_URL ?? "http://127.0.0.1:5372";
const database =
  process.env.MISTAKE_WATCH_RECOMMENDATION_TEST_DB ?? "task011-reducer-proof";
const roomId = "task011-runtime-room";
const hostMemberId = "task011-runtime-host";
const seedToken = "task011-runtime-seed-token-12345678901234567890";
const admissionId = "task011-runtime-admission";
const admissionToken = "task011-runtime-admission-token-12345678901234567890";
const secondAdmissionId = "task011-runtime-admission-b";
const secondAdmissionToken =
  "task011-runtime-admission-token-b-12345678901234567890";

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

async function waitForScalar(query, expected) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (scalar(query) === expected) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  assert.equal(scalar(query), expected);
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

async function connectTestClient(DbConnection) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out connecting the reducer proof client.")),
      10_000,
    );

    DbConnection.builder()
      .withUri(server.replace(/^http/, "ws"))
      .withDatabaseName(database)
      .onConnect((connection, identity) => {
        clearTimeout(timeout);
        resolve({ connection, identity: identity ?? connection.identity });
      })
      .onConnectError((_ctx, error) => {
        clearTimeout(timeout);
        reject(error ?? new Error("Reducer proof client connection failed."));
      })
      .build();
  });
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

const { bindings, cleanup } = await loadSpacetimeBindings({
  generatedDir: path.resolve("lib", "spacetime", "generated"),
  tempRoot: path.resolve(".tmp"),
});
let connection;
const connections = new Set();

try {
  const connected = await connectTestClient(bindings.DbConnection);
  connection = connected.connection;
  connections.add(connection);
  const identityHex =
    connected.identity?.toHexString?.() ?? String(connected.identity);

  call(
    "issue_room_admission_grant",
    admissionId,
    admissionToken,
    "account",
    Date.now() + 60_000,
    identityHex,
    hostMemberId,
    "host",
    roomId,
  );
  await connection.reducers.joinRoom({
    admissionId,
    admissionToken,
    avatarKey: undefined,
    displayName: "Runtime Host A",
    memberId: hostMemberId,
    role: "host",
    roomId,
  });

  const secondConnected = await connectTestClient(bindings.DbConnection);
  connections.add(secondConnected.connection);
  const secondIdentityHex =
    secondConnected.identity?.toHexString?.() ??
    String(secondConnected.identity);

  await secondConnected.connection.reducers.joinRoom({
    admissionId,
    admissionToken,
    avatarKey: undefined,
    displayName: "Unauthorized replay",
    memberId: hostMemberId,
    role: "host",
    roomId,
  });
  await secondConnected.connection.reducers.joinRoom({
    admissionId,
    admissionToken,
    avatarKey: undefined,
    displayName: "Invented member",
    memberId: "invented-runtime-member",
    role: "guest",
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM room_participant_presence WHERE room_id = '${roomId}' AND status = 'online'`,
    ),
    1,
    "replayed grants and invented members must not create live sessions",
  );

  call(
    "issue_room_admission_grant",
    secondAdmissionId,
    secondAdmissionToken,
    "account",
    Date.now() + 60_000,
    secondIdentityHex,
    hostMemberId,
    "host",
    roomId,
  );
  await secondConnected.connection.reducers.joinRoom({
    admissionId: secondAdmissionId,
    admissionToken: secondAdmissionToken,
    avatarKey: undefined,
    displayName: "Runtime Host B",
    memberId: hostMemberId,
    role: "host",
    roomId,
  });

  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM room_participant_presence WHERE room_id = '${roomId}' AND member_id = '${hostMemberId}' AND status = 'online'`,
    ),
    2,
    "two admitted account browsers should coexist",
  );
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM room_participant WHERE room_id = '${roomId}' AND member_id = '${hostMemberId}'`,
    ),
    1,
    "concurrent browsers should retain one durable participant projection",
  );

  connection.disconnect();
  connections.delete(connection);
  connection = secondConnected.connection;
  await waitForScalar(
    `SELECT COUNT(*) AS total FROM room_participant_presence WHERE room_id = '${roomId}' AND member_id = '${hostMemberId}' AND status = 'online'`,
    1,
  );
  assert.equal(
    value(
      `SELECT display_name FROM room_participant WHERE room_id = '${roomId}' AND member_id = '${hostMemberId}'`,
      /"([^"]+)"/,
      "remaining participant display name",
    ),
    "Runtime Host B",
  );

  const sources = [
    ["Runtime A", "https://www.youtube.com/watch?v=hmJPbHVK-co"],
    ["Runtime B", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["Runtime C", "https://www.youtube.com/watch?v=9bZkp7q19f0"],
  ];

  for (const [title, sourceUrl] of sources) {
    await connection.reducers.addQueueItem({
      actorMemberId: hostMemberId,
      allowDuplicate: true,
      artist: "",
      channelName: undefined,
      clientActionId: `add:${title}`,
      durationSeconds: 120,
      isPinned: false,
      isPlayNext: false,
      isUnavailable: false,
      playlistId: undefined,
      playlistTitle: undefined,
      roomId,
      sourceTitle: title,
      sourceType: "youtube",
      sourceUrl,
      thumbnailUrl: undefined,
    });
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
  await connection.reducers.moveQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "",
    position: 0,
    queueItemId: itemC,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT live_queue_item.position FROM live_queue_item WHERE queue_item_id = '${itemC}'`,
    ),
    initialCPosition,
    "a reorder without an action id must be rejected",
  );
  await connection.reducers.setQueueItemPriority({
    actorMemberId: hostMemberId,
    clientActionId: "",
    isPinned: false,
    isPlayNext: true,
    queueItemId: itemC,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM live_queue_item WHERE queue_item_id = '${itemC}' AND is_play_next = true`,
    ),
    0,
    "a priority change without an action id must be rejected",
  );

  await connection.reducers.moveQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "shuffle:one",
    position: 0,
    queueItemId: itemC,
    roomId,
  });
  await connection.reducers.moveQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "shuffle:one",
    position: 2,
    queueItemId: itemB,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'queue_reordered'`,
    ),
    1,
    "one multi-move shuffle should emit one operational event",
  );
  await connection.reducers.moveQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "shuffle:two",
    position: 1,
    queueItemId: itemC,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'queue_reordered'`,
    ),
    2,
    "a later shuffle should emit a distinct event",
  );

  await connection.reducers.playQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "play:a:one",
    queueItemId: itemA,
    roomId,
  });
  await connection.reducers.setPlaybackState({
    actorMemberId: hostMemberId,
    playbackRate: 1,
    positionSeconds: 0,
    roomId,
    status: "playing",
  });
  const firstOccurrence = roomSessionValue(
    "playback_occurrence_id",
    /\(some = "([0-9a-f-]{36})"\)/i,
  );
  const firstSource = roomSessionValue("source_url");
  await connection.reducers.setPlaybackState({
    actorMemberId: hostMemberId,
    playbackRate: 1,
    positionSeconds: 120,
    roomId,
    status: "ended",
  });
  await connection.reducers.advanceQueueItem({
    actorMemberId: hostMemberId,
    autoplay: true,
    expectedActiveQueueItemId: itemA,
    expectedPlaybackOccurrenceId: firstOccurrence,
    expectedSourceUrl: firstSource,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'playback_completed'`,
    ),
    1,
  );

  await connection.reducers.playQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "play:a:replay",
    queueItemId: itemA,
    roomId,
  });
  await connection.reducers.setPlaybackState({
    actorMemberId: hostMemberId,
    playbackRate: 1,
    positionSeconds: 0,
    roomId,
    status: "playing",
  });
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

  await connection.reducers.reportMediaFailure({
    actorMemberId: hostMemberId,
    allowAutoplayAdvance: false,
    expectedActiveQueueItemId: itemA,
    expectedPlaybackOccurrenceId: firstOccurrence,
    expectedSourceUrl: firstSource,
    failureCode: "youtube_unavailable",
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'source_failed'`,
    ),
    0,
    "a stale occurrence must not report a failure against a replay",
  );
  await connection.reducers.reportMediaFailure({
    actorMemberId: hostMemberId,
    allowAutoplayAdvance: false,
    expectedActiveQueueItemId: itemA,
    expectedPlaybackOccurrenceId: replayOccurrence,
    expectedSourceUrl: firstSource,
    failureCode: "youtube_unavailable",
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'source_failed'`,
    ),
    1,
  );

  await connection.reducers.setGuestMediaPreference({
    actorMemberId: hostMemberId,
    clientActionId: "like:a",
    expectedRevision: 0,
    liked: true,
    queueItemId: itemA,
    roomId,
  });
  await connection.reducers.setGuestMediaPreference({
    actorMemberId: hostMemberId,
    clientActionId: "like:a",
    expectedRevision: 0,
    liked: true,
    queueItemId: itemA,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'media_liked'`,
    ),
    1,
  );
  await connection.reducers.setGuestMediaPreference({
    actorMemberId: hostMemberId,
    clientActionId: "unlike:a",
    expectedRevision: 1,
    liked: false,
    queueItemId: itemA,
    roomId,
  });
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM recommendation_event_outbox WHERE room_id = '${roomId}' AND event_type = 'media_unliked'`,
    ),
    1,
  );

  console.log("TASK-011 reducer runtime proof passed.");
} finally {
  for (const activeConnection of connections) {
    activeConnection.disconnect();
  }
  await cleanup();
}
