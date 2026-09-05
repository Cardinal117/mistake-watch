import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Timestamp } from "spacetimedb";

const root = process.cwd();
const session = (overrides = {}) => ({
  roomId: "clock-room",
  roomName: "Clock test",
  hostMemberId: "host",
  mode: "watch",
  playbackRate: 1,
  positionSeconds: 100,
  serverUpdatedMs: 100_000n,
  sourceType: "direct",
  sourceUrl: "uploaded:fixture",
  status: "playing",
  ...overrides,
});

// Run the production hook, snapshot adapter and sync math with deterministic
// React scheduling and SDK transport. No source-text assertions or live calls.
function client({
  serverNow = 700_000,
  skew = 0,
  row = session(),
  deferSample = false,
} = {}) {
  let now = serverNow + skew;
  let index = 0;
  let slots = [];
  let effects = [];
  let callbacks;
  let currentRow = row;
  const tables = new Map();
  const timers = new Map();
  let nextTimer = 1;
  const room = {
    id: "clock-room",
    name: "Clock test",
    hostMemberId: "host",
    mode: "watch",
    currentMember: { id: "guest", name: "Guest", role: "guest" },
    participantsList: [],
    queue: [],
  };
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = index++;
      return (slots[i] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const i = index++;
      const prior = slots[i];
      if (!prior || deps.some((value, j) => !Object.is(value, prior.deps[j]))) {
        effects.push(() => {
          prior?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  function table(name) {
    if (!tables.has(name)) {
      const listeners = {
        Insert: new Set(),
        Update: new Set(),
        Delete: new Set(),
      };
      const value = {
        iter: () => (name === "room_session" ? [currentRow] : []),
      };
      for (const kind of Object.keys(listeners)) {
        value[`on${kind}`] = (callback) => listeners[kind].add(callback);
        value[`removeOn${kind}`] = (callback) =>
          listeners[kind].delete(callback);
      }
      value.emit = (kind, context) => {
        for (const callback of listeners[kind])
          callback(context, currentRow, currentRow);
      };
      tables.set(name, value);
    }
    return tables.get(name);
  }
  const db = new Proxy({}, { get: (_, name) => table(name) });
  function freshContext(time = now - skew) {
    return {
      event: {
        tag: "Reducer",
        id: "fresh-reducer",
        value: {
          timestamp: new Timestamp(BigInt(time) * 1000n),
          reducer: { name: "join_room", args: {} },
          outcome: { tag: "Ok" },
        },
      },
    };
  }
  const connected = {
    db,
    reducers: {
      async joinRoom() {
        if (!deferSample)
          table("room_participant_presence").emit("Insert", freshContext());
      },
      async heartbeat() {
        table("room_participant_presence").emit("Update", freshContext());
      },
      async leaveRoom() {},
    },
    disconnect() {},
    subscriptionBuilder() {
      let applied;
      const builder = {
        onApplied(cb) {
          applied = cb;
          return builder;
        },
        onError() {
          return builder;
        },
        subscribe() {
          table("room_session").emit("Insert", {
            event: { tag: "SubscribeApplied" },
          });
          applied({});
        },
      };
      return builder;
    },
  };
  const DbConnection = {
    builder() {
      callbacks = {};
      const builder = { build: () => connected };
      for (const name of ["withUri", "withDatabaseName", "withToken"])
        builder[name] = () => builder;
      for (const name of ["onConnect", "onConnectError", "onDisconnect"]) {
        builder[name] = (callback) => {
          callbacks[name] = callback;
          return builder;
        };
      }
      return builder;
    },
  };
  const window = {
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout(cb) {
      const id = nextTimer++;
      timers.set(id, cb);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    setInterval() {
      return nextTimer++;
    },
    clearInterval() {},
  };
  const cache = new Map();
  const replacements = {
    react,
    "@/lib/identity/avatar-selection": { readStoredAvatarKey: () => "fixture" },
    "@/lib/identity/avatars": {
      getDeterministicAvatarKey: () => "fixture",
      isAvatarKey: () => true,
    },
    "@/lib/rooms/actions": { touchRoomActivityAction: async () => {} },
  };
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const testModule = { exports: {} };
    cache.set(file, testModule);
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: file,
    }).outputText;
    const require = (specifier) => {
      if (specifier in replacements) return replacements[specifier];
      if (specifier === "../generated") return { DbConnection };
      if (specifier === "../config")
        return {
          getSpacetimeConfig: () => ({
            uri: "fixture",
            databaseName: "fixture",
          }),
        };
      if (specifier === "../adapter") return { getRoomSubscriptions: () => [] };
      if (specifier === "./admission")
        return {
          readSpacetimeIdentityHex: () => "fixture",
          requestLiveRoomAdmission: async () => ({
            admissionId: "fixture",
            admissionToken: "fixture",
          }),
        };
      assert.ok(
        specifier.startsWith("."),
        `unexpected external dependency: ${specifier}`,
      );
      return load(path.resolve(path.dirname(file), specifier + ".ts"));
    };
    vm.runInNewContext(
      source,
      {
        module: testModule,
        exports: testModule.exports,
        require,
        window,
        console,
        Date: class extends Date {
          static now() {
            return now;
          }
        },
      },
      { filename: file },
    );
    return testModule.exports;
  }
  const { useRoomConnection: runConnectionHook } = load(
    path.join(root, "lib/spacetime/live-room/use-room-connection.ts"),
  );
  const { expectedPositionAt } = load(path.join(root, "lib/player/sync.ts"));
  function render() {
    index = 0;
    const result = runConnectionHook(room);
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return result;
  }
  async function connect() {
    render();
    callbacks.onConnect(connected, {}, "fixture");
    await Promise.resolve();
    await Promise.resolve();
    return render();
  }
  return {
    connect,
    advance(ms) {
      now += ms;
    },
    source() {
      return render().snapshot.session?.sourceUrl;
    },
    sample(context = freshContext()) {
      table("room_participant_presence").emit("Update", context);
    },
    position() {
      const value = render().snapshot.session;
      return expectedPositionAt(
        { ...value, serverUpdatedAtMs: value.serverUpdatedMs },
        now,
      );
    },
    update(next, context = { event: { tag: "Transaction" } }) {
      currentRow = next;
      table("room_session").emit("Update", context);
    },
    async reconnect() {
      callbacks.onDisconnect();
      for (const [id, callback] of [...timers]) {
        timers.delete(id);
        callback();
      }
      await connect();
    },
  };
}

for (const skew of [0, 120_000, -90_000]) {
  test(`late join preserves ten minutes of elapsed playback with client skew ${skew}ms`, async () => {
    const guest = client({ skew });
    await guest.connect();
    assert.equal(guest.position(), 700);
    guest.advance(30_000);
    assert.equal(guest.position(), 730);
  });
}

test("reconnect preserves playback age instead of resetting to the last control", async () => {
  const guest = client({ serverNow: 100_000, skew: 60_000 });
  await guest.connect();
  assert.equal(guest.position(), 100);
  guest.advance(448_540);
  await guest.reconnect();
  assert.equal(guest.position(), 548.54);
});

test("unrelated session updates do not reset elapsed playback", async () => {
  const guest = client({ serverNow: 100_000 });
  await guest.connect();
  guest.advance(60_000);
  guest.update(session({ queueAutoplayEnabled: false }));
  assert.equal(guest.position(), 160);
});

test("paused snapshots stay paused and fresh playback updates use the existing clock offset", async () => {
  const guest = client({ row: session({ status: "paused" }), skew: 45_000 });
  await guest.connect();
  assert.equal(guest.position(), 100);
  guest.advance(10_000);
  assert.equal(guest.position(), 100);
  guest.update(session({ serverUpdatedMs: 710_000n }));
  guest.advance(5_000);
  assert.equal(guest.position(), 105);
});

test("a new client waits for a valid fresh clock sample before exposing playback", async () => {
  const guest = client({ skew: 120_000, deferSample: true });
  await guest.connect();
  assert.equal(guest.source(), null);
  guest.sample({ event: { tag: "Transaction" } });
  assert.equal(guest.source(), null);
  guest.sample({ event: { tag: "Reducer", value: { timestamp: {} } } });
  assert.equal(guest.source(), null);
  guest.sample();
  assert.equal(guest.source(), "uploaded:fixture");
  assert.equal(guest.position(), 700);
});

test("historical subscription and malformed samples cannot replace a valid clock", async () => {
  const guest = client({ serverNow: 100_000, skew: -60_000 });
  await guest.connect();
  guest.advance(50_000);
  guest.update(session(), { event: { tag: "SubscribeApplied" } });
  guest.sample({
    event: {
      tag: "Reducer",
      value: { timestamp: { microsSinceUnixEpoch: 10n ** 30n } },
    },
  });
  guest.sample({ event: { tag: "Reducer", value: { timestamp: null } } });
  assert.equal(guest.position(), 150);
});
