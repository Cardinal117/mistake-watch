import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { loadSpacetimeBindings } from "./load-spacetime-bindings.mjs";
const server = "http://127.0.0.1:5392";
const database = "watch-autoplay-qa-" + Date.now();
const roomId = "prepared-autoplay-proof";
const cli =
  process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA, "SpacetimeDB", "spacetime.exe")
    : "spacetime";
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
execFileSync(
  cli,
  [
    "publish",
    "--no-config",
    "--server",
    server,
    "--module-path",
    "./spacetime",
    database,
    "--yes",
  ],
  { stdio: "pipe" },
);
call(
  "issue_room_seed_grant",
  Date.now() + 120000,
  "host",
  roomId,
  "local-only-seed-token-12345678901234567890",
);
call(
  "seed_room_session",
  "host",
  "watch",
  "Prepared autoplay proof",
  roomId,
  "local-only-seed-token-12345678901234567890",
);
const { bindings } = await loadSpacetimeBindings({
  generatedDir: path.resolve("lib/spacetime/generated"),
  tempRoot: path.resolve(".tmp"),
});
const clients = [];
async function connect(memberId, role, clientBindings = bindings) {
  const client = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Local connection timeout")),
      10000,
    );
    clientBindings.DbConnection.builder()
      .withUri(server.replace("http", "ws"))
      .withDatabaseName(database)
      .onConnect((c) => {
        clearTimeout(timeout);
        resolve(c);
      })
      .onConnectError((_c, e) => {
        clearTimeout(timeout);
        reject(e);
      })
      .build();
  });
  clients.push(client);
  const admissionId = "admission-" + crypto.randomUUID();
  const token =
    "local-only-admission-token-" + memberId + "-12345678901234567890";
  call(
    "issue_room_admission_grant",
    admissionId,
    token,
    "account",
    Date.now() + 120000,
    client.identity.toHexString(),
    memberId,
    role,
    roomId,
  );
  await client.reducers.joinRoom({
    admissionId,
    admissionToken: token,
    displayName: memberId,
    memberId,
    role,
    roomId,
  });
  await new Promise((resolve, reject) =>
    client
      .subscriptionBuilder()
      .onApplied(resolve)
      .onError(reject)
      .subscribe([
        `SELECT * FROM room_session WHERE room_id = '${roomId}'`,
        `SELECT * FROM live_queue_item WHERE room_id = '${roomId}'`,
      ]),
  );
  return client;
}
async function until(predicate) {
  const end = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Local state convergence timeout");
    await new Promise((r) => setTimeout(r, 30));
  }
}
const state = (c) => Array.from(c.db.roomSession.iter())[0];
try {
  const host = await connect("host", "host"),
    guest = await connect("guest", "guest");
  for (const [title, id] of [
    ["First", "M7lc1UVf-VE"],
    ["Second", "dQw4w9WgXcQ"],
  ])
    await host.reducers.addQueueItem({
      actorMemberId: "host",
      artist: "",
      clientActionId: crypto.randomUUID(),
      roomId,
      sourceTitle: title,
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=" + id,
    });
  await host.reducers.loadMediaSource({
    actorMemberId: "host",
    roomId,
    sourceTitle: "Previous",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  });
  await host.reducers.setPlaybackState({
    actorMemberId: "host",
    roomId,
    playbackRate: 1,
    positionSeconds: 60,
    status: "playing",
  });
  await host.reducers.setQueueAutoplay({
    actorMemberId: "host",
    roomId,
    enabled: true,
  });
  await until(() => state(host)?.queueAutoplayEnabled === true);
  const before = state(host),
    next = Array.from(host.db.liveQueueItem.iter()).sort(
      (a, b) => a.position - b.position,
    )[0];
  const prepare = {
    actorMemberId: "host",
    roomId,
    expectedSourceUrl: before.sourceUrl,
    expectedActiveQueueItemId: before.activeQueueItemId,
    expectedPlaybackOccurrenceId: before.playbackOccurrenceId,
    expectedNextQueueItemId: next.queueItemId,
    expectedServerUpdatedMs: Number(before.serverUpdatedMs),
  };
  await host.reducers.prepareYoutubeAutoplay(prepare);
  await until(() => state(guest)?.activeQueueItemId === next.queueItemId);
  const prepared = state(host);
  assert.equal(prepared.status, "paused");
  assert.equal(prepared.positionSeconds, 0);
  await new Promise((r) => setTimeout(r, 3200));
  assert.equal(state(guest).positionSeconds, 0);
  assert.equal(state(guest).status, "paused");
  const ready = {
    actorMemberId: "host",
    roomId,
    positionSeconds: 0.125,
    expectedActiveQueueItemId: prepared.activeQueueItemId,
    expectedSourceUrl: prepared.sourceUrl,
    expectedPlaybackOccurrenceId: prepared.playbackOccurrenceId,
    expectedServerUpdatedMs: Number(prepared.serverUpdatedMs),
  };
  await guest.reducers.startPreparedYoutube({
    ...ready,
    actorMemberId: "guest",
  });
  assert.equal(state(host).status, "paused");
  await host.reducers.setPlaybackState({
    actorMemberId: "host",
    roomId,
    playbackRate: 1,
    positionSeconds: 25,
    status: "paused",
  });
  await until(() => state(guest).positionSeconds === 25);
  await host.reducers.startPreparedYoutube(ready);
  assert.equal(state(host).positionSeconds, 25);
  assert.equal(state(host).status, "paused");
  await host.reducers.setPlaybackState({
    actorMemberId: "host",
    roomId,
    playbackRate: 1,
    positionSeconds: 0,
    status: "paused",
  });
  await until(() => state(guest).positionSeconds === 0);
  const valid = {
    ...ready,
    expectedServerUpdatedMs: Number(state(host).serverUpdatedMs),
  };
  await host.reducers.startPreparedYoutube(valid);
  await until(() => state(guest).status === "playing");
  assert.equal(state(guest).positionSeconds, 0.125);
  await host.reducers.startPreparedYoutube(valid);
  assert.equal(state(host).positionSeconds, 0.125);
  const joined = await connect("rejoin", "guest");
  assert.equal(state(joined).status, "playing");
  assert.equal(state(joined).positionSeconds, 0.125);
  const active = state(host);
  await host.reducers.advanceQueueItem({
    actorMemberId: "host",
    roomId,
    autoplay: true,
    expectedSourceUrl: active.sourceUrl,
    expectedActiveQueueItemId: active.activeQueueItemId,
    expectedPlaybackOccurrenceId: active.playbackOccurrenceId,
  });
  await until(
    () => state(guest).activeQueueItemId !== active.activeQueueItemId,
  );
  assert.equal(state(guest).status, "playing");
  if (process.argv[2]) {
    const legacy = await loadSpacetimeBindings({
      generatedDir: path.resolve(process.argv[2]),
      tempRoot: path.resolve(".tmp"),
    });
    const oldClient = await connect("host", "host", legacy.bindings);
    await oldClient.reducers.setPlaybackState({
      actorMemberId: "host",
      roomId,
      playbackRate: 1,
      positionSeconds: 0.25,
      status: "paused",
    });
    await until(() => state(guest).status === "paused");
    assert.equal(state(guest).positionSeconds, 0.25);
    console.log(
      "PASS: previous client bindings connect and control the extended module unchanged.",
    );
  }
  console.log(
    "PASS: real local clients preserve the opening through 3.2s preparation; deny guest/stale/duplicate ready; rejoin and legacy advance remain correct.",
  );
} finally {
  for (const c of clients) c.disconnect();
}
