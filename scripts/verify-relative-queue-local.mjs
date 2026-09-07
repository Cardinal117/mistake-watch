import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";
// Deliberately fixed to a disposable local database. Never targets production.
const server = "http://127.0.0.1:5384",
  database = "task027-queue-qa";
const cli = path.join(process.env.LOCALAPPDATA, "SpacetimeDB", "spacetime.exe");
const roomId = `queue-${randomUUID()}`,
  hostMemberId = `${roomId}-0`;
function call(name, ...args) {
  execFileSync(
    cli,
    [
      "call",
      "--no-config",
      "--server",
      server,
      database,
      name,
      ...args.map((v) => JSON.stringify(v)),
    ],
    { stdio: "pipe" },
  );
}
async function connectClient(DbConnection) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out connecting a queue proof client.")),
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

const loaded = await loadSpacetimeBindings({
  generatedDir: path.resolve("lib/spacetime/generated"),
  tempRoot: path.resolve(".tmp"),
});
const clients = [];
const rows = (c) =>
  [...c.connection.db.liveQueueItem.iter()]
    .filter((r) => r.roomId === roomId && r.status === "queued")
    .sort((a, b) => a.position - b.position);
const ids = (c) => rows(c).map((r) => r.queueItemId);
async function converge() {
  for (let i = 0; i < 100; i++) {
    if (
      clients.every(
        (c) => JSON.stringify(ids(c)) === JSON.stringify(ids(clients[0])),
      )
    )
      return;
    await new Promise((r) => setTimeout(r, 20));
  }
  console.log(
    clients.map((c) => rows(c).map((r) => [r.sourceTitle, r.position])),
  );
  assert.fail("Four clients did not converge");
}
try {
  const seedToken = randomUUID();
  call(
    "issue_room_seed_grant",
    Date.now() + 120000,
    hostMemberId,
    roomId,
    seedToken,
  );
  call(
    "seed_room_session",
    hostMemberId,
    "watch",
    "Local queue proof",
    roomId,
    seedToken,
  );
  for (let i = 0; i < 4; i++) {
    const client = await connectClient(loaded.bindings.DbConnection);
    clients.push(client);
    client.memberId = `${roomId}-${i}`;
    await new Promise((resolve, reject) =>
      client.connection
        .subscriptionBuilder()
        .onApplied(resolve)
        .onError((_ctx, e) => reject(e))
        .subscribe([
          `SELECT * FROM live_queue_item WHERE room_id = '${roomId}'`,
          `SELECT * FROM room_session WHERE room_id = '${roomId}'`,
          `SELECT * FROM room_permission WHERE room_id = '${roomId}'`,
        ]),
    );
    const admissionId = randomUUID(),
      admissionToken = randomUUID(),
      role = i ? "guest" : "host";
    call(
      "issue_room_admission_grant",
      admissionId,
      admissionToken,
      "account",
      Date.now() + 60000,
      client.identity.toHexString(),
      client.memberId,
      role,
      roomId,
    );
    await client.connection.reducers.joinRoom({
      admissionId,
      admissionToken,
      avatarKey: undefined,
      displayName: `QA ${i}`,
      memberId: client.memberId,
      role,
      roomId,
    });
  }
  const host = clients[0];
  const permissions = (target, allowed) =>
    host.connection.reducers.setMemberPermissions({
      actorMemberId: hostMemberId,
      roomId,
      targetMemberId: target.memberId,
      canAddQueue: allowed,
      canManageQueue: allowed,
      canControlPlayback: false,
      canControlBrowser: false,
    });
  for (const c of clients.slice(1)) await permissions(c, true);
  for (let i = 0; i < 12; i++)
    await host.connection.reducers.addQueueItem({
      actorMemberId: hostMemberId,
      allowDuplicate: false,
      artist: "QA",
      channelName: undefined,
      clientActionId: randomUUID(),
      durationSeconds: 180,
      isPinned: i === 3,
      isPlayNext: false,
      isUnavailable: false,
      playlistId: undefined,
      playlistTitle: undefined,
      roomId,
      sourceTitle: `Track ${i}`,
      sourceType: "direct",
      sourceUrl: `https://example.com/qa-${i}.mp4`,
      thumbnailUrl: undefined,
    });
  await converge();
  assert.equal(rows(host).length, 12);
  const initial = ids(host),
    moving = initial[3];
  const move = (c, id, edge, anchorQueueItemId) =>
    c.connection.reducers.moveQueueItemRelative({
      actorMemberId: c.memberId,
      clientActionId: randomUUID(),
      roomId,
      queueItemId: id,
      edge,
      anchorQueueItemId,
    });
  const times = [];
  for (let round = 0; round < 4; round++) {
    const t = performance.now();
    await Promise.all(
      clients.map((c, i) =>
        move(c, moving, i % 2 ? "after" : "before", initial[6 + i]),
      ),
    );
    times.push(Math.round(performance.now() - t));
    await converge();
    assert.deepEqual(
      rows(host).map((r) => r.position),
      Array.from({ length: 12 }, (_, i) => i),
    );
    assert.equal(new Set(ids(host)).size, 12);
    assert.equal(
      rows(host).find((r) => r.queueItemId === moving).isPinned,
      true,
    );
  }
  // The last accepted transaction determines placement, not stale client indices.
  await move(clients[3], moving, "before", initial[8]);
  await converge();
  assert.equal(ids(host).indexOf(moving) + 1, ids(host).indexOf(initial[8]));
  await Promise.all(clients.map((c, i) => move(c, initial[i], "end")));
  await converge();
  const before = ids(host);
  await permissions(clients[1], false);
  await assert.rejects(move(clients[1], moving, "start"));
  await converge();
  assert.deepEqual(ids(host), before);
  await assert.rejects(move(host, moving, "before", "missing-anchor"));
  await host.connection.reducers.removeQueueItem({
    actorMemberId: hostMemberId,
    roomId,
    queueItemId: initial[2],
  });
  await assert.rejects(move(host, initial[2], "start"));
  await host.connection.reducers.moveQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: randomUUID(),
    roomId,
    queueItemId: moving,
    position: 0,
  });
  await converge();
  assert.equal(ids(host)[0], moving);
  await assert.rejects(
    clients[2].connection.reducers.moveQueueItemRelative({
      actorMemberId: hostMemberId,
      clientActionId: randomUUID(),
      roomId,
      queueItemId: moving,
      edge: "start",
      anchorQueueItemId: undefined,
    }),
  );
  await host.connection.reducers.playQueueItem({
    actorMemberId: hostMemberId,
    clientActionId: randomUUID(),
    roomId,
    queueItemId: moving,
  });
  await assert.rejects(move(host, moving, "end"));
  await converge();
  console.log(
    JSON.stringify({
      passed: true,
      clients: 4,
      rounds: 4,
      concurrentRoundConfirmationMs: times,
      checks: [
        "same-item convergence",
        "different-item convergence",
        "unique contiguous positions",
        "pin preserved",
        "denial and missing source/anchor reject",
        "legacy numeric reducer",
      ],
    }),
  );
} finally {
  for (const c of clients) c.connection.disconnect();
  await loaded.cleanup();
}
