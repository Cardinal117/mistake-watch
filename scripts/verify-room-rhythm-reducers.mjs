import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";

const server =
  process.env.MISTAKE_WATCH_SPACETIME_URL ?? "http://127.0.0.1:5372";
const database =
  process.env.MISTAKE_WATCH_RHYTHM_TEST_DB ?? "task019-rhythm-proof";
const cli =
  process.env.SPACETIME_CLI ??
  (process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "SpacetimeDB", "spacetime.exe")
    : "spacetime");
const roomId = "task019-runtime-room";
const hostMemberId = "task019-runtime-host";
const guestMemberId = "task019-runtime-guest";
const seedToken = "task019-runtime-seed-token-12345678901234567890";

function spacetime(args, options = {}) {
  try {
    return execFileSync(cli, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: options.quiet ? ["ignore", "pipe", "pipe"] : undefined,
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(`spacetime ${args[0]} failed\n${detail}`, { cause: error });
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

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(check(), `Timed out waiting for ${label}.`);
}

async function connectClient(DbConnection) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out connecting a rhythm proof client.")),
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
        reject(error ?? new Error("Rhythm proof client connection failed."));
      })
      .build();
  });
}

async function subscribeToRoom(connection) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out subscribing to rhythm room state.")),
      10_000,
    );
    connection
      .subscriptionBuilder()
      .onApplied(() => {
        clearTimeout(timeout);
        resolve();
      })
      .onError((_ctx, error) => {
        clearTimeout(timeout);
        reject(error ?? new Error("Rhythm proof subscription failed."));
      })
      .subscribe([
        `SELECT * FROM room_session WHERE room_id = '${roomId}'`,
        `SELECT * FROM room_participant WHERE room_id = '${roomId}'`,
        `SELECT * FROM room_rhythm_profile WHERE room_id = '${roomId}'`,
      ]);
  });
}

function rhythmRows(connection) {
  return [...connection.db.roomRhythmProfile.iter()].filter(
    (row) => row.roomId === roomId,
  );
}

function identityHex(identity) {
  return identity?.toHexString?.() ?? String(identity);
}

function issueAdmission({ identity, memberId, role }) {
  const admissionId = `task019-${role}-admission`;
  const admissionToken = `task019-${role}-token-12345678901234567890`;
  call(
    "issue_room_admission_grant",
    admissionId,
    admissionToken,
    "account",
    Date.now() + 60_000,
    identityHex(identity),
    memberId,
    role,
    roomId,
  );
  return { admissionId, admissionToken };
}

let bindings;
let cleanupBindings;
const connections = new Set();

try {
  spacetime(
    [
      "publish",
      "--server",
      server,
      "--module-path",
      "./spacetime",
      database,
      "--delete-data=always",
      "--yes",
    ],
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
    "listen",
    "TASK-019 rhythm proof",
    roomId,
    seedToken,
  );

  const loaded = await loadSpacetimeBindings({
    generatedDir: path.resolve("lib", "spacetime", "generated"),
    tempRoot: path.resolve(".tmp"),
  });
  bindings = loaded.bindings;
  cleanupBindings = loaded.cleanup;

  const host = await connectClient(bindings.DbConnection);
  const guest = await connectClient(bindings.DbConnection);
  connections.add(host.connection);
  connections.add(guest.connection);

  await Promise.all([
    subscribeToRoom(host.connection),
    subscribeToRoom(guest.connection),
  ]);

  const hostAdmission = issueAdmission({
    identity: host.identity,
    memberId: hostMemberId,
    role: "host",
  });
  const guestAdmission = issueAdmission({
    identity: guest.identity,
    memberId: guestMemberId,
    role: "guest",
  });
  await host.connection.reducers.joinRoom({
    ...hostAdmission,
    avatarKey: undefined,
    displayName: "Runtime Host",
    memberId: hostMemberId,
    role: "host",
    roomId,
  });
  await guest.connection.reducers.joinRoom({
    ...guestAdmission,
    avatarKey: undefined,
    displayName: "Runtime Guest",
    memberId: guestMemberId,
    role: "guest",
    roomId,
  });

  await host.connection.reducers.addQueueItem({
    actorMemberId: hostMemberId,
    allowDuplicate: false,
    artist: "Runtime Artist",
    channelName: undefined,
    clientActionId: "task019:add",
    durationSeconds: 180,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: false,
    playlistId: undefined,
    playlistTitle: undefined,
    roomId,
    sourceTitle: "Runtime Rhythm",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=hmJPbHVK-co",
    thumbnailUrl: undefined,
  });
  const queueItemId = value(
    `SELECT queue_item_id FROM live_queue_item WHERE room_id = '${roomId}'`,
    /"([0-9a-f-]{36})"/i,
    "runtime queue item",
  );
  await host.connection.reducers.playQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: "task019:play",
    queueItemId,
    roomId,
  });
  await host.connection.reducers.setPlaybackState({
    actorMemberId: hostMemberId,
    playbackRate: 1,
    positionSeconds: 15,
    roomId,
    status: "playing",
  });
  const occurrenceId = value(
    `SELECT playback_occurrence_id FROM room_session WHERE room_id = '${roomId}'`,
    /\(some = "([0-9a-f-]{36})"\)/i,
    "playback occurrence",
  );

  await host.connection.reducers.publishRoomRhythmProfile({
    actorMemberId: hostMemberId,
    algorithmVersion: "first-party-beat-v1",
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.9,
    mediaBeatOffsetSeconds: 0.125,
    mediaId: "hmJPbHVK-co",
    playbackOccurrenceId: occurrenceId,
    revision: 1,
    roomId,
    ttlMs: 12_000,
  });
  await waitFor(
    () =>
      rhythmRows(host.connection)[0]?.revision === 1 &&
      rhythmRows(guest.connection)[0]?.revision === 1,
    "host and guest rhythm subscriptions",
  );

  await guest.connection.reducers.publishRoomRhythmProfile({
    actorMemberId: guestMemberId,
    algorithmVersion: "first-party-beat-v1",
    beatIntervalSeconds: 0.4,
    bpm: 150,
    confidence: 0.99,
    mediaBeatOffsetSeconds: 0,
    mediaId: "hmJPbHVK-co",
    playbackOccurrenceId: occurrenceId,
    revision: 2,
    roomId,
    ttlMs: 12_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(rhythmRows(host.connection)[0]?.revision, 1);
  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM room_rhythm_profile WHERE room_id = '${roomId}' AND revision = 2`,
    ),
    0,
    "guest publication must not replace the host profile",
  );

  await host.connection.reducers.clearRoomRhythmProfile({
    actorMemberId: hostMemberId,
    expectedPlaybackOccurrenceId: occurrenceId,
    expectedRevision: 1,
    roomId,
  });
  await waitFor(
    () =>
      rhythmRows(host.connection).length === 0 &&
      rhythmRows(guest.connection).length === 0,
    "stale-safe rhythm clearing",
  );

  assert.equal(
    scalar(
      `SELECT COUNT(*) AS total FROM room_rhythm_profile WHERE room_id = '${roomId}'`,
    ),
    0,
  );
  console.log(
    "TASK-019 room rhythm runtime proof passed: host publish, two-client sync, guest denial, and stale-safe clear.",
  );
} finally {
  for (const connection of connections) {
    connection.disconnect();
  }
  await cleanupBindings?.();
  try {
    spacetime(
      ["delete", "--no-config", "--server", server, database, "--yes"],
      { quiet: true },
    );
  } catch (error) {
    console.warn(error.message);
  }
}
