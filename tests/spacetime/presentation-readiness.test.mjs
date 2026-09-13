import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { Timestamp } from "spacetimedb";

const root = process.cwd();

function presentationClient() {
  let now = 700_000;
  let hookIndex = 0;
  const slots = [];
  let effects = [];
  let connectionCallbacks;
  let admissionSequence = 0;
  let joinedAdmissionId = null;
  const timeouts = new Map();
  let nextTimerId = 1;
  let room = {
    id: "readiness-room",
    name: "Readiness room",
    hostMemberId: "host",
    mode: "watch",
    currentMember: { id: "guest", name: "Guest", role: "guest" },
    participantsList: [],
    queue: [],
  };
  const rows = {
    room_session: [
      {
        roomId: room.id,
        roomName: room.name,
        hostMemberId: room.hostMemberId,
        mode: "watch",
        playbackRate: 1,
        positionSeconds: 100,
        serverUpdatedMs: 100_000n,
        sourceType: "direct",
        sourceUrl: "uploaded:fixture",
        status: "playing",
      },
    ],
    room_participant_presence: [],
  };
  const tables = new Map();

  const react = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in slots)) {
        slots[index] = typeof initial === "function" ? initial() : initial;
      }
      return [
        slots[index],
        (value) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = hookIndex++;
      return (slots[index] ??= { current: initial });
    },
    useEffect(effect, dependencies) {
      const index = hookIndex++;
      const previous = slots[index];
      if (
        !previous ||
        dependencies.some(
          (dependency, dependencyIndex) =>
            !Object.is(dependency, previous.dependencies[dependencyIndex]),
        )
      ) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };

  function table(name) {
    if (!tables.has(name)) {
      const listeners = {
        Delete: new Set(),
        Insert: new Set(),
        Update: new Set(),
      };
      const value = {
        iter: () => rows[name] ?? [],
      };
      for (const kind of Object.keys(listeners)) {
        value[`on${kind}`] = (callback) => listeners[kind].add(callback);
        value[`removeOn${kind}`] = (callback) => listeners[kind].delete(callback);
      }
      value.emit = (kind, context) => {
        for (const callback of listeners[kind]) callback(context, {}, {});
      };
      tables.set(name, value);
    }
    return tables.get(name);
  }

  const reducerContext = (admissionId = undefined) => ({
    event: {
      tag: "Reducer",
      value: {
        timestamp: new Timestamp(BigInt(now) * 1_000n),
        reducer: {
          name: admissionId ? "join_room" : "heartbeat",
          args: admissionId ? { admissionId } : {},
        },
        outcome: { tag: "Ok" },
      },
    },
  });
  const db = new Proxy({}, { get: (_, name) => table(name) });
  const connected = {
    db,
    reducers: {
      async joinRoom(input) {
        joinedAdmissionId = input.admissionId;
      },
      async heartbeat() {},
      async leaveRoom() {},
    },
    disconnect() {},
    subscriptionBuilder() {
      let onApplied;
      const builder = {
        onApplied(callback) {
          onApplied = callback;
          return builder;
        },
        onError() {
          return builder;
        },
        subscribe() {
          table("room_session").emit("Insert", {
            event: { tag: "SubscribeApplied" },
          });
          onApplied({ event: { tag: "SubscribeApplied" } });
        },
      };
      return builder;
    },
  };
  const DbConnection = {
    builder() {
      connectionCallbacks = {};
      const builder = { build: () => connected };
      for (const name of ["withUri", "withDatabaseName", "withToken"]) {
        builder[name] = () => builder;
      }
      for (const name of ["onConnect", "onConnectError", "onDisconnect"]) {
        builder[name] = (callback) => {
          connectionCallbacks[name] = callback;
          return builder;
        };
      }
      return builder;
    },
  };
  const window = {
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout(callback) {
      const timerId = nextTimerId++;
      timeouts.set(timerId, callback);
      return timerId;
    },
    clearTimeout(timerId) {
      timeouts.delete(timerId);
    },
    setInterval: () => nextTimerId++,
    clearInterval() {},
    addEventListener() {},
    removeEventListener() {},
  };
  const replacements = {
    react,
    "@/lib/identity/avatar-selection": { readStoredAvatarKey: () => "fixture" },
    "@/lib/identity/avatars": {
      getDeterministicAvatarKey: () => "fixture",
      isAvatarKey: () => true,
    },
    "@/lib/rooms/actions": {
      touchRoomActivityAction: async () => ({ touched: true }),
    },
  };
  const moduleCache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (moduleCache.has(file)) return moduleCache.get(file).exports;
    const loadedModule = { exports: {} };
    moduleCache.set(file, loadedModule);
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
      if (specifier === "../config") {
        return {
          getSpacetimeConfig: () => ({ uri: "fixture", databaseName: "fixture" }),
        };
      }
      if (specifier === "../adapter") return { getRoomSubscriptions: () => [] };
      if (specifier === "./admission") {
        return {
          readSpacetimeIdentityHex: () => "fixture",
          requestLiveRoomAdmission: async () => {
            admissionSequence += 1;
            return {
              admissionId: `admission-${admissionSequence}`,
              admissionToken: "fixture",
            };
          },
        };
      }
      assert.ok(specifier.startsWith("."), `unexpected dependency: ${specifier}`);
      return load(path.resolve(path.dirname(file), `${specifier}.ts`));
    };
    vm.runInNewContext(
      source,
      {
        module: loadedModule,
        exports: loadedModule.exports,
        require,
        window,
        document: {
          hidden: false,
          visibilityState: "visible",
          addEventListener() {},
          removeEventListener() {},
        },
        console,
        Date: class extends Date {
          static now() {
            return now;
          }
        },
      },
      { filename: file },
    );
    return loadedModule.exports;
  }
  const { useRoomConnection: runConnectionHook } = load(
    path.join(root, "lib/spacetime/live-room/use-room-connection.ts"),
  );
  function render() {
    hookIndex = 0;
    const result = runConnectionHook(room);
    const pendingEffects = effects;
    effects = [];
    pendingEffects.forEach((effect) => effect());
    return result;
  }
  async function connect() {
    render();
    connectionCallbacks.onConnect(connected, {}, "fixture");
    await Promise.resolve();
    await Promise.resolve();
    return render();
  }

  return {
    advance(milliseconds) {
      now += milliseconds;
    },
    connect,
    currentAdmissionId: () => joinedAdmissionId,
    markCurrentAdmissionOnline(context) {
      rows.room_participant_presence = [
        {
          admissionId: joinedAdmissionId,
          lastSeenMs: BigInt(now),
          memberId: "guest",
          roomId: room.id,
          status: "online",
        },
      ];
      table("room_participant_presence").emit("Insert", context);
      return render();
    },
    readiness: () => render().presentationReadiness,
    async reconnect() {
      connectionCallbacks.onDisconnect();
      for (const [timerId, callback] of [...timeouts]) {
        timeouts.delete(timerId);
        callback();
      }
      return connect();
    },
    reducerContext,
    sample() {
      table("room_participant_presence").emit("Update", reducerContext());
      return render();
    },
  };
}

test("a delayed join over five seconds still readies from its reducer clock", async () => {
  const client = presentationClient();
  await client.connect();
  assert.equal(client.readiness().roomId, "readiness-room");
  assert.equal(client.readiness().epoch, 1);
  assert.equal(client.readiness().ready, false);
  assert.equal(client.readiness().mode, "watch");

  client.advance(5_001);
  const admissionId = client.currentAdmissionId();
  const result = client.markCurrentAdmissionOnline(
    client.reducerContext(admissionId),
  );

  assert.equal(result.presentationReadiness.ready, true);
});

test("reconnect requires the current admission and a current reducer clock", async () => {
  const client = presentationClient();
  await client.connect();
  client.markCurrentAdmissionOnline(
    client.reducerContext(client.currentAdmissionId()),
  );
  assert.equal(client.readiness().ready, true);

  const afterSubscription = await client.reconnect();
  assert.equal(afterSubscription.presentationReadiness.roomId, "readiness-room");
  assert.equal(afterSubscription.presentationReadiness.epoch, 2);
  assert.equal(afterSubscription.presentationReadiness.ready, false);
  assert.equal(afterSubscription.presentationReadiness.mode, "watch");

  const afterAdmission = client.markCurrentAdmissionOnline({
    event: { tag: "Transaction" },
  });
  assert.equal(afterAdmission.presentationReadiness.ready, false);

  const afterFreshSample = client.sample();
  assert.equal(afterFreshSample.presentationReadiness.ready, true);
});
