import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";

const server =
  process.env.MISTAKE_WATCH_SPACETIME_URL ?? "http://127.0.0.1:5372";
const database = "task030-like-proof-listeners";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(server).hostname))
  throw Error(
    "Listener proof requires loopback; hosted targets are forbidden.",
  );
const binary =
  process.platform === "win32"
    ? "C:/Users/Admin/AppData/Local/SpacetimeDB/spacetime.exe"
    : "spacetime";
function cli(args) {
  return execFileSync(binary, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function call(name, ...args) {
  return cli([
    "call",
    "--no-config",
    "--server",
    server,
    database,
    name,
    ...args.map((v) => JSON.stringify(v)),
  ]);
}
function sql(query) {
  return cli(["sql", "--no-config", "--server", server, database, query]);
}
function scalar(query) {
  const values = [
    ...sql(query.replace("COUNT(*)", "COUNT(*) AS total")).matchAll(
      /^\s*(\d+)\s*$/gm,
    ),
  ];
  assert.ok(values.length);
  return Number(values.at(-1)[1]);
}
const roomId = "310d0000-0000-4000-8000-000000000011";
const memberId = "310d0000-0000-4000-8000-000000000021";
const accountId = "310d0000-0000-4000-8000-000000000001";
cli([
  "publish",
  database,
  "--module-path",
  "spacetime",
  "--server",
  server,
  "--delete-data=always",
  "--yes",
]);
call(
  "issue_room_seed_grant",
  Date.now() + 120000,
  memberId,
  roomId,
  "listener-proof-seed-token-12345678901234567890",
);
call(
  "seed_room_session",
  memberId,
  "listen",
  "Listener protocol proof",
  roomId,
  "listener-proof-seed-token-12345678901234567890",
);
const { bindings, cleanup } = await loadSpacetimeBindings({
  generatedDir: path.resolve("lib/spacetime/generated"),
  tempRoot: path.resolve(".tmp"),
});
const connections = [];
async function connect() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Listener proof connection timed out")),
      10000,
    );
    bindings.DbConnection.builder()
      .withUri(server.replace(/^http/, "ws"))
      .withDatabaseName(database)
      .onConnect((connection, identity) => {
        clearTimeout(timer);
        connections.push(connection);
        resolve({ connection, identity: identity ?? connection.identity });
      })
      .onConnectError((_, error) => {
        clearTimeout(timer);
        reject(error);
      })
      .build();
  });
}
try {
  const devices = [];
  for (const suffix of ["a", "b"]) {
    const device = await connect();
    const admissionId = `listener-admission-${suffix}`;
    const admissionToken = `listener-admission-token-${suffix}-12345678901234567890`;
    call(
      "issue_room_admission_grant",
      admissionId,
      admissionToken,
      "account",
      Date.now() + 120000,
      device.identity.toHexString(),
      memberId,
      "host",
      roomId,
    );
    await device.connection.reducers.joinRoom({
      admissionId,
      admissionToken,
      avatarKey: undefined,
      displayName: `Listener ${suffix}`,
      memberId,
      role: "host",
      roomId,
    });
    call(
      "grant_listener_learning",
      roomId,
      memberId,
      admissionId,
      device.identity.toHexString(),
      accountId,
      roomId,
      0,
      Date.now() - 1000,
      Date.now() + 100000,
    );
    devices.push(device);
  }
  assert.equal(
    scalar("SELECT COUNT(*) FROM listener_grant"),
    2,
    "each admitted device receives a private grant",
  );
  await devices[0].connection.reducers.addQueueItem({
    actorMemberId: memberId,
    allowDuplicate: true,
    artist: "",
    channelName: undefined,
    clientActionId: "listener-proof-add",
    durationSeconds: 5,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: false,
    playlistId: undefined,
    playlistTitle: undefined,
    roomId,
    sourceTitle: "Synthetic direct sample",
    sourceType: "direct",
    sourceUrl: "https://example.test/synthetic.mp3",
    thumbnailUrl: undefined,
  });
  const item = sql("SELECT queue_item_id FROM live_queue_item").match(
    /"([0-9a-f-]{36})"/i,
  )?.[1];
  assert.ok(item);
  await devices[0].connection.reducers.playQueueItem({
    actorMemberId: memberId,
    clientActionId: "listener-proof-play",
    queueItemId: item,
    roomId,
  });
  await devices[0].connection.reducers.setPlaybackState({
    actorMemberId: memberId,
    playbackRate: 1,
    positionSeconds: 0,
    roomId,
    status: "playing",
  });
  const occurrence = sql(
    "SELECT playback_occurrence_id FROM room_session",
  ).match(/"([0-9a-f-]{36})"/i)?.[1];
  assert.ok(occurrence);
  for (const device of devices)
    await device.connection.reducers.observeListenerPlayback({
      roomId,
      memberId,
      occurrenceId: occurrence,
      sequence: 1n,
      positionSeconds: 0,
      playing: true,
      buffering: false,
      muted: false,
      volume: 1,
    });
  assert.equal(
    scalar("SELECT COUNT(*) FROM listener_receipt_outbox"),
    0,
    "initial observations cannot count queued or unheard playback",
  );
  await new Promise((resolve) => setTimeout(resolve, 5100));
  for (const device of devices)
    await device.connection.reducers.observeListenerPlayback({
      roomId,
      memberId,
      occurrenceId: occurrence,
      sequence: 2n,
      positionSeconds: 5,
      playing: true,
      buffering: false,
      muted: false,
      volume: 1,
    });
  assert.equal(
    scalar("SELECT COUNT(*) FROM listener_receipt_outbox"),
    1,
    "two admitted devices qualify one account occurrence",
  );
  await assert.rejects(
    devices[0].connection.procedures.readListenerReceipts({ limit: 100 }),
    /Trusted/,
    "ordinary room member cannot read private receipts",
  );
  const read = call("read_listener_receipts", 100);
  assert.match(
    read,
    /listener|310d|occurrence/i,
    "trusted protocol reads the qualified receipt",
  );
  const receipt = sql("SELECT receipt_id FROM listener_receipt_outbox").match(
    /"([^"]+)"/,
  )?.[1];
  assert.ok(receipt);
  await devices[0].connection.reducers.acknowledgeListenerReceipts({
    receiptIds: [receipt],
  });
  assert.equal(
    scalar("SELECT COUNT(*) FROM listener_receipt_outbox"),
    1,
    "ordinary member cannot acknowledge private receipts",
  );
  call("acknowledge_listener_receipts", [receipt]);
  assert.equal(scalar("SELECT COUNT(*) FROM listener_receipt_outbox"), 0);
  console.log(
    "Listener real-protocol proof passed: direct observations, two-device union, private trusted read and acknowledgement. No media/provider requests.",
  );
} finally {
  for (const connection of connections) connection.disconnect();
  await cleanup();
}
