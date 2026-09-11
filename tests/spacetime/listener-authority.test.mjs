import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
function load(file, mocks = {}) {
  const mod = { exports: {} };
  new Function(
    "exports",
    "require",
    ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(mod.exports, (k) => mocks[k]);
  return mod.exports;
}
function table(key, initial = []) {
  const rows = new Map(initial.map((r) => [r[key], r]));
  return {
    rows,
    insert: (r) => {
      rows.set(r[key], r);
      return r;
    },
    delete: (r) => rows.delete(r[key]),
    iter: () => rows.values(),
    [key]: { find: (id) => rows.get(id) },
    by_room_id: {
      filter: (room) => [...rows.values()].filter((r) => r.room_id === room),
    },
    ...Object.fromEntries(
      [
        ["by_created", "created_ms"],
        ["by_expiry", "expires_ms"],
        ["by_updated", "updated_ms"],
      ].map(([name, field]) => [
        name,
        {
          filter: (range) =>
            [...rows.values()]
              .filter((r) => !range.to || r[field] < range.to.value)
              .sort((a, b) => Number(a[field] - b[field])),
        },
      ]),
    ),
  };
}
function fixture() {
  let clock = 1000n;
  const key = (r, m, i) => `${r}:${m}:${i}`;
  const identity = (value) => ({
    toHexString: () => value,
    isEqual: (other) => other?.toHexString() === value,
  });
  const db = {
    trusted_seed_issuer: table("identity_hex", [{ identity_hex: "server" }]),
    room_member_revocation: table("revocation_key"),
    room_participant_session: table("session_key"),
    listener_grant: table("session_key"),
    listener_cursor: table("session_key"),
    listener_coverage: table("partition_key"),
    listener_receipt_outbox: table("receipt_id"),
    room_session: table("room_id", [
      {
        room_id: "room",
        active_queue_item_id: "track",
        playback_occurrence_id: "occurrence",
        status: "playing",
        position_seconds: 0,
        server_updated_ms: 1000n,
        playback_rate: 1,
      },
    ]),
    recommendation_playback_occurrence: table("room_id", [
      {
        room_id: "room",
        queue_item_id: "track",
        playback_occurrence_id: "occurrence",
      },
    ]),
    live_queue_item: table("queue_item_id", [
      {
        queue_item_id: "track",
        room_id: "room",
        source_type: "direct",
        source_url: "https://example.test/song.mp3",
        duration_seconds: 100,
      },
    ]),
  };
  const ctx = (id = "server") => ({
    db,
    sender: identity(id),
    connectionId: identity(`connection-${id}`),
    withTx: (fn) => fn(ctx(id)),
  });
  const keys = { nowMs: () => clock, participantSessionKey: key };
  const admission = load("spacetime/src/room-admission.ts", {
    "./room-keys": keys,
  });
  const type = {};
  const t = new Proxy({}, { get: () => () => type });
  const api = load("spacetime/src/listener-authority.ts", {
    "spacetimedb/server": {
      t,
      SenderError: Error,
      Range: class {
        constructor(from, to) {
          this.from = from;
          this.to = to;
        }
      },
    },
    "./module-schema": {
      spacetimedb: { reducer: (_, fn) => fn, procedure: (_, __, fn) => fn },
    },
    "./room-admission": admission,
    "./room-keys": keys,
    "./listener-policy": load("spacetime/src/listener-policy.ts"),
    "./listener-tables": { listenerReceiptOutbox: { rowType: {} } },
  });
  const seq = new Map();
  function admit(id, account = id) {
    db.room_participant_session.insert({
      session_key: key("room", id, id),
      room_id: "room",
      member_id: id,
      admission_id: `admit-${id}`,
      connection_id: identity(`connection-${id}`),
      identity: identity(id),
      last_seen_ms: clock,
      status: "online",
    });
    grant(id, account);
  }
  function grant(id, account = id, patch = {}) {
    api.grant_listener_learning(ctx(), {
      room_id: "room",
      member_id: id,
      admission_id: `admit-${id}`,
      identity_hex: id,
      account_id: account,
      consent_epoch: "epoch",
      history_generation: 0n,
      valid_from_ms: 0n,
      expires_ms: clock + 110000n,
      ...patch,
    });
  }
  function observe(
    id,
    position,
    { at = 1000 + position * 1000, ...patch } = {},
  ) {
    clock = BigInt(at);
    const member = db.room_participant_session.session_key.find(
      key("room", id, id),
    );
    if (member) member.last_seen_ms = clock;
    seq.set(id, (seq.get(id) ?? 0n) + 1n);
    api.observe_listener_playback(ctx(id), {
      room_id: "room",
      member_id: id,
      occurrence_id: "occurrence",
      sequence: seq.get(id),
      position_seconds: position,
      playing: true,
      buffering: false,
      muted: false,
      volume: 1,
      ...patch,
    });
  }
  return {
    api,
    db,
    ctx,
    admit,
    grant,
    observe,
    setTime: (at) => {
      clock = BigInt(at);
    },
    receipts: () => [...db.listener_receipt_outbox.iter()],
  };
}
test("two actual account listeners qualify separately while admitted absent member gets none", () => {
  const f = fixture();
  for (const id of ["a", "b", "absent"]) f.admit(id);
  for (let n = 0; n <= 90; n += 5) {
    f.observe("a", n);
    f.observe("b", n);
  }
  assert.equal(f.receipts().length, 2);
  assert.deepEqual(
    f
      .receipts()
      .map((r) => r.account_id)
      .sort(),
    ["a", "b"],
  );
});
test("partial overlapping devices union to one account occurrence without copying actor taste", () => {
  const f = fixture();
  f.admit("a", "same");
  f.admit("b", "same");
  for (let n = 0; n <= 90; n += 5) {
    if (n <= 50) f.observe("a", n);
    if (n >= 40) f.observe("b", n);
  }
  assert.equal(f.receipts().length, 1);
  assert.equal(f.receipts()[0].account_id, "same");
  assert.deepEqual(JSON.parse(f.receipts()[0].coverage_json), [[0, 90]]);
});
test("guest/ungranted, foreign occurrence, muted, buffering and unavailable/YouTube sources cannot produce receipts", () => {
  for (const patch of [
    { occurrence_id: "foreign" },
    { muted: true },
    { buffering: true },
    { playing: false },
    { volume: 0 },
  ]) {
    const f = fixture();
    f.admit("a");
    for (let n = 0; n <= 100; n += 5) f.observe("a", n, patch);
    assert.equal(f.receipts().length, 0);
  }
  for (const patch of [
    { source_type: "youtube" },
    { is_unavailable: true },
    { duration_seconds: undefined },
  ]) {
    const f = fixture();
    f.admit("a");
    Object.assign(f.db.live_queue_item.queue_item_id.find("track"), patch);
    for (let n = 0; n <= 100; n += 5) f.observe("a", n);
    assert.equal(f.receipts().length, 0);
  }
  const f = fixture();
  for (let n = 0; n <= 100; n += 5) f.observe("guest", n);
  assert.equal(f.receipts().length, 0);
});
test("seek, late arrival, disconnected identity and replayed observations cannot manufacture coverage", () => {
  const f = fixture();
  f.admit("a");
  for (let n = 50; n <= 100; n += 5) f.observe("a", n);
  assert.equal(f.receipts().length, 0);
  const g = fixture();
  g.admit("a");
  for (let n = 0; n <= 20; n += 5) g.observe("a", n);
  for (let n = 80; n <= 100; n += 5)
    g.observe("a", n, { at: 21000 + (n - 80) * 1000 });
  assert.equal(g.receipts().length, 0);
  const h = fixture();
  h.admit("a");
  h.db.room_participant_session.session_key.find("room:a:a").connection_id = {
    isEqual: () => false,
  };
  for (let n = 0; n <= 100; n += 5) h.observe("a", n);
  assert.equal(h.receipts().length, 0);
  const i = fixture();
  i.admit("a");
  for (let n = 0; n <= 100; n += 5) i.observe("a", n, { sequence: 1n });
  assert.equal(i.receipts().length, 0);
});
test("grant epoch/history change partitions partial coverage and same occurrence never reuses old cursor", () => {
  const f = fixture();
  f.admit("a");
  for (let n = 0; n <= 50; n += 5) f.observe("a", n);
  f.grant("a", "a", { history_generation: 1n });
  for (let n = 55; n <= 100; n += 5) f.observe("a", n);
  assert.equal(f.receipts().length, 0);
  assert.equal(f.db.listener_coverage.rows.size, 2);
});
test("rapid mute transitions invalidate the cursor even inside ordinary observation throttle", () => {
  const f = fixture();
  f.admit("a");
  f.observe("a", 0);
  f.observe("a", 0.02, { at: 1020, muted: true });
  assert.equal(
    f.db.listener_cursor.session_key.find("room:a:a").audible,
    false,
  );
  f.observe("a", 0.04, { at: 1040, muted: false });
  f.observe("a", 5, { at: 6000 });
  assert.deepEqual(
    JSON.parse([...f.db.listener_coverage.iter()][0].intervals_json),
    [[0.04, 5]],
  );
});
test("completed coverage emits once; intentional new occurrence can emit again", () => {
  const f = fixture();
  f.admit("a");
  for (let n = 0; n <= 95; n += 5) f.observe("a", n);
  assert.equal(f.receipts().length, 1);
  f.api.acknowledge_listener_receipts(f.ctx(), {
    receipt_ids: [f.receipts()[0].receipt_id],
  });
  f.observe("a", 100);
  assert.equal(f.receipts().length, 0);
  f.db.room_session.room_id.find("room").playback_occurrence_id = "repeat";
  f.db.room_session.room_id.find("room").server_updated_ms = 101000n;
  f.db.recommendation_playback_occurrence.room_id.find(
    "room",
  ).playback_occurrence_id = "repeat";
  f.grant("a");
  for (let n = 0; n <= 90; n += 5)
    f.observe("a", n, { at: 101000 + n * 1000, occurrence_id: "repeat" });
  assert.equal(f.receipts().length, 1);
});
test("receipt read and acknowledge are trusted-only and expired state is cleaned without new room activity", () => {
  const f = fixture();
  f.admit("a");
  for (let n = 0; n <= 90; n += 5) f.observe("a", n);
  assert.throws(
    () => f.api.read_listener_receipts(f.ctx("a"), { limit: 100 }),
    /Trusted/,
  );
  f.api.acknowledge_listener_receipts(f.ctx("a"), {
    receipt_ids: [f.receipts()[0].receipt_id],
  });
  assert.equal(f.receipts().length, 1);
  f.setTime(10 * 86400000);
  assert.equal(f.api.read_listener_receipts(f.ctx(), { limit: 100 }).length, 0);
  assert.equal(f.db.listener_grant.rows.size, 0);
  assert.equal(f.db.listener_cursor.rows.size, 0);
  assert.equal(f.db.listener_coverage.rows.size, 0);
});

test("untrusted or foreign admission grants cannot bind an account to a device", () => {
  const f = fixture();
  f.admit("a");
  f.db.listener_grant.rows.clear();
  const args = { room_id: "room", member_id: "a", admission_id: "admit-a", identity_hex: "a", account_id: "forged", consent_epoch: "epoch", history_generation: 0n, valid_from_ms: 0n, expires_ms: 100000n };
  f.api.grant_listener_learning(f.ctx("a"), args);
  assert.equal(f.db.listener_grant.rows.size, 0);
  f.api.grant_listener_learning(f.ctx(), { ...args, admission_id: "foreign" });
  assert.equal(f.db.listener_grant.rows.size, 0);
  f.api.grant_listener_learning(f.ctx(), { ...args, expires_ms: 900000n });
  assert.equal(f.db.listener_grant.rows.size, 0);
});

test("full room outbox stays bounded and a still-active qualified receipt retries after a slot clears", () => {
  const f = fixture();
  f.admit("a");
  for (let n = 0; n < 512; n++) f.db.listener_receipt_outbox.insert({ receipt_id: `pending-${n}`, room_id: "room", created_ms: 1000n });
  for (let n = 0; n <= 90; n += 5) f.observe("a", n);
  assert.equal(f.receipts().length, 512);
  assert.equal([...f.db.listener_coverage.iter()][0].emitted, false);
  f.db.listener_receipt_outbox.rows.delete("pending-0");
  f.observe("a", 95);
  assert.equal(f.receipts().length, 512);
  assert.equal([...f.db.listener_coverage.iter()][0].emitted, true);
});
