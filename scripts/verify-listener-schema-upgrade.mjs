import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";

const baseline = "2f3c39973eadaf718a14a9797903de333faa25f3";
const server =
  process.env.MISTAKE_WATCH_SPACETIME_URL ?? "http://127.0.0.1:5372";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(server).hostname))
  throw new Error(
    "Schema upgrade proof permits only loopback; hosted targets are forbidden.",
  );
const database = `task030-like-proof-upgrade-${Date.now()}`;
const binary =
  process.platform === "win32"
    ? "C:/Users/Admin/AppData/Local/SpacetimeDB/spacetime.exe"
    : "spacetime";
const tempRoot = path.resolve(".tmp");
mkdirSync(tempRoot, { recursive: true });
const artifact = mkdtempSync(path.join(tempRoot, "listener-schema-upgrade-"));
const archive = path.join(artifact, "baseline.tar");
execFileSync("git", [
  "archive",
  "--format=tar",
  "--output",
  archive,
  baseline,
  "spacetime",
  "lib/spacetime/generated",
]);
execFileSync("tar", ["-xf", archive, "-C", artifact]);
function cli(args) {
  return execFileSync(binary, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function sql(query) {
  return cli(["sql", "--no-config", "--server", server, database, query]);
}
function call(name, ...args) {
  return cli([
    "call",
    "--no-config",
    "--server",
    server,
    database,
    name,
    ...args.map((value) => JSON.stringify(value)),
  ]);
}
function scalar(query) {
  const values = [...sql(query).matchAll(/^\s*(\d+)\s*$/gm)];
  assert.ok(values.length);
  return Number(values.at(-1)[1]);
}
function publish(modulePath) {
  // Never permits deletion, including for this fresh local proof database.
  return cli([
    "publish",
    database,
    "--no-config",
    "--module-path",
    modulePath,
    "--server",
    server,
    "--delete-data=never",
    "--break-clients",
    "--yes=migrate,break-clients",
  ]);
}
writeFileSync(
  path.join(artifact, "baseline-publish.txt"),
  publish(path.join(artifact, "spacetime")),
);
const roomId = "310e0000-0000-4000-8000-000000000011";
const memberId = "310e0000-0000-4000-8000-000000000021";
const seedToken = "schema-upgrade-proof-seed-token-12345678901234567890";
call("issue_room_seed_grant", Date.now() + 120000, memberId, roomId, seedToken);
call(
  "seed_room_session",
  memberId,
  "listen",
  "Schema upgrade proof",
  roomId,
  seedToken,
);
const old = await loadSpacetimeBindings({
  generatedDir: path.join(artifact, "lib/spacetime/generated"),
  tempRoot,
});
const current = await loadSpacetimeBindings({
  generatedDir: path.resolve("lib/spacetime/generated"),
  tempRoot,
});
const connections = [];
async function connect(bindings, suffix) {
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Schema proof connection timed out")),
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
  const admissionId = `schema-upgrade-admission-${suffix}`;
  const admissionToken = `schema-upgrade-admission-token-${suffix}-12345678901234567890`;
  call(
    "issue_room_admission_grant",
    admissionId,
    admissionToken,
    "account",
    Date.now() + 120000,
    result.identity.toHexString(),
    memberId,
    "host",
    roomId,
  );
  await result.connection.reducers.joinRoom({
    admissionId,
    admissionToken,
    avatarKey: undefined,
    displayName: "Schema proof host",
    memberId,
    role: "host",
    roomId,
  });
  return result.connection;
}
async function add(connection, label) {
  await connection.reducers.addQueueItem({
    actorMemberId: memberId,
    allowDuplicate: true,
    artist: "Synthetic artist",
    channelName: undefined,
    clientActionId: `upgrade-${label}`,
    durationSeconds: 180,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: false,
    playlistId: undefined,
    playlistTitle: undefined,
    roomId,
    sourceTitle: label,
    sourceType: "direct",
    sourceUrl: `https://example.test/${label}.mp3`,
    thumbnailUrl: undefined,
  });
}
try {
  const oldConnection = await connect(old.bindings, "old");
  await add(oldConnection, "before-a");
  await add(oldConnection, "before-b");
  const retainedQuery =
    "SELECT queue_item_id, room_id, source_url, title, status, live_queue_item.position, duration_seconds FROM live_queue_item";
  const before = sql(retainedQuery);
  const eventCount = scalar(
    "SELECT COUNT(*) AS total FROM recommendation_event_outbox",
  );
  assert.equal(scalar("SELECT COUNT(*) AS total FROM live_queue_item"), 2);
  oldConnection.disconnect();
  const upgradeOutput = publish(path.resolve("spacetime"));
  writeFileSync(path.join(artifact, "current-upgrade.txt"), upgradeOutput);
  assert.equal(
    sql(retainedQuery),
    before,
    "existing queue IDs, order, metadata and status survive the upgrade unchanged",
  );
  assert.equal(
    scalar("SELECT COUNT(*) AS total FROM recommendation_event_outbox"),
    eventCount,
    "existing durable-event outbox rows survive the upgrade",
  );
  assert.equal(
    scalar("SELECT COUNT(*) AS total FROM listener_receipt_outbox"),
    0,
    "new private receipt table is introduced empty",
  );
  const newField = sql("SELECT client_action_id FROM live_queue_item");
  assert.equal(
    (newField.match(/\(none = \(\)\)/g) ?? []).length,
    2,
    "old rows receive the optional field default",
  );
  const newConnection = await connect(current.bindings, "current");
  await add(newConnection, "after");
  assert.equal(scalar("SELECT COUNT(*) AS total FROM live_queue_item"), 3);
  assert.match(
    sql("SELECT client_action_id FROM live_queue_item"),
    /upgrade-after/,
    "new reducer writes request correlation after a data-preserving upgrade",
  );
  writeFileSync(
    path.join(artifact, "proof.json"),
    JSON.stringify(
      {
        baseline,
        server,
        database,
        retainedQueueRows: 2,
        retainedEventRows: eventCount,
        afterQueueRows: 3,
        deletionPolicy: "never",
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log(
    `Schema upgrade proof passed: ${baseline.slice(0, 7)} → current, 2 queue rows and ${eventCount} event rows retained, default optional field verified, new correlation write verified. --delete-data=never on both publishes. Evidence: ${artifact}`,
  );
} finally {
  for (const connection of connections) connection.disconnect();
  await old.cleanup();
  await current.cleanup();
}
