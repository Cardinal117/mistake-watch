import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createExternalBridgeController,
  isAllowedExternalPageUrl,
} from "../../extensions/watch-audio-companion/external-bridge.mjs";

const BRIDGE_NAME = "mistake-watch-audio-v1";

test("manifest exposes one stable exact-origin private bridge", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../../extensions/watch-audio-companion/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  assert.equal(manifest.version, "0.6.0");
  assert.match(manifest.key, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(
    extensionIdFromPublicKey(manifest.key),
    "gjhgbhjblbbpcpallbnpakijoheemgdb",
  );
  assert.deepEqual(manifest.externally_connectable, {
    matches: [
      "https://watch.mistakestudios.com/rooms/*",
      "https://mistake-watch.vercel.app/rooms/*",
      "http://127.0.0.1:5371/*",
      "http://localhost:5371/*",
    ],
  });
  assert.equal(
    isAllowedExternalPageUrl("http://127.0.0.1:5371/rooms/room-1"),
    true,
  );
  assert.equal(
    isAllowedExternalPageUrl("http://localhost:5372/rooms/room-1"),
    false,
  );
});

test("external bridge serves only the captured approved top-level tab", async () => {
  const harness = await createBridgeHarness();
  const approved = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();

  assert.equal(approved.disconnected, false);
  assert.equal(approved.messages[0].type, "capture-state");
  assert.equal(approved.messages[0].version, 1);
  assert.equal(approved.messages[0].status.active, true);
  assert.equal("tabId" in approved.messages[0].status, false);
  assert.equal(approved.messages[1].type, "rhythm-frame");
  assert.equal(approved.messages[1].frame.bpm, 120);

  const wrongTab = harness.connect({
    tabId: 43,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  const wrongOrigin = harness.connect({
    tabId: 42,
    url: "https://example.com/rooms/room-1",
  });
  const nestedFrame = harness.connect({
    frameId: 2,
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();

  assert.equal(wrongTab.disconnected, false);
  assert.equal(wrongTab.messages.at(-1).status.active, false);
  assert.equal(
    wrongTab.messages.some((message) => message.type === "rhythm-frame"),
    false,
  );
  assert.equal(wrongOrigin.disconnected, true);
  assert.equal(nestedFrame.disconnected, true);
});

test("inactive approved pages remain dormant and activate without reconnect polling", async () => {
  const harness = await createBridgeHarness();
  harness.setStatus({
    active: false,
    hasSignal: false,
    phase: "idle",
    rhythm: null,
    tabId: null,
  });
  const port = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();

  assert.equal(port.disconnected, false);
  assert.equal(port.messages.at(-1).status.active, false);
  assert.equal(
    harness.sentRuntimeMessages.some(
      (message) => message.type === "bridge-visuals",
    ),
    false,
  );

  await harness.emitWorkerMessage({
    status: {
      active: true,
      hasSignal: true,
      phase: "active",
      rhythm: createRhythmFrame(),
      tabId: 42,
    },
    target: "watch-audio-worker",
    type: "capture-state",
  });
  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 9 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });

  assert.equal(port.messages.at(-2).type, "rhythm-frame");
  assert.equal(port.messages.at(-1).type, "visual-frame");
  assert.equal(harness.sentRuntimeMessages.at(-1).enabled, true);
});

test("external bridge ignores capture commands and normalizes frame versions", async () => {
  const harness = await createBridgeHarness();
  const port = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();
  port.messages.length = 0;

  port.receive({ type: "start-capture", version: 1 });
  port.receive({ sequence: 1, type: "visual-ack", version: 99 });
  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 1, version: 99 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });

  assert.equal(harness.captureStarts, 0);
  assert.deepEqual(port.messages, []);
});

test("external bridge keeps the latest visual frame under backpressure", async () => {
  const harness = await createBridgeHarness();
  const port = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();
  port.messages.length = 0;

  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 1 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });
  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 2 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });
  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 3 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });

  assert.deepEqual(
    port.messages.map((message) => message.frame.sequence),
    [1],
  );

  port.receive({ sequence: 1, type: "visual-ack", version: 1 });
  await harness.flush();
  assert.deepEqual(
    port.messages.map((message) => message.frame.sequence),
    [1, 3],
  );
});

test("external bridge replaces stale ports and clears visual state on stop", async () => {
  const harness = await createBridgeHarness();
  const first = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();
  const replacement = harness.connect({
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });
  await harness.flush();

  assert.equal(first.disconnected, true);
  assert.equal(replacement.disconnected, false);

  await harness.emitWorkerMessage({
    status: {
      active: false,
      hasSignal: false,
      phase: "idle",
      reason: "user-stopped",
      rhythm: null,
      tabId: null,
    },
    target: "watch-audio-worker",
    type: "capture-state",
  });
  await harness.flush();

  assert.equal(replacement.messages.at(-1).status.active, false);
  assert.equal(replacement.disconnected, false);
  const messageCount = replacement.messages.length;
  await harness.emitWorkerMessage({
    frame: createVisualFrame({ sequence: 7 }),
    target: "watch-audio-worker",
    type: "visual-frame",
  });
  assert.equal(replacement.messages.length, messageCount);
});

test("external bridge does not retain a page that disconnects during status lookup", async () => {
  let resolveStatus;
  const statusPromise = new Promise((resolve) => {
    resolveStatus = resolve;
  });
  const controller = createExternalBridgeController({
    getStatus: () => statusPromise,
  });
  const port = createPort({
    frameId: 0,
    tabId: 42,
    url: "https://watch.mistakestudios.com/rooms/room-1",
  });

  const connecting = controller.connect(port);
  port.disconnectFromPage();
  resolveStatus({
    active: true,
    hasSignal: true,
    phase: "active",
    rhythm: createRhythmFrame(),
    tabId: 42,
  });
  await connecting;
  controller.publishVisualFrame(createVisualFrame({ sequence: 8 }));

  assert.equal(port.postAttempts, 0);
  assert.deepEqual(port.messages, []);
});

async function createBridgeHarness() {
  const originalChrome = globalThis.chrome;
  const originalClients = globalThis.clients;
  const listeners = {
    externalConnect: null,
    runtimeMessage: null,
  };
  const sentRuntimeMessages = [];
  let captureStarts = 0;
  let status = {
    active: true,
    hasSignal: true,
    phase: "active",
    reason: null,
    rhythm: createRhythmFrame(),
    tabId: 42,
  };
  const chrome = {
    action: {
      onClicked: createEvent(),
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async () => {},
      setTitle: async () => {},
    },
    offscreen: {
      closeDocument: async () => {},
      createDocument: async () => {},
    },
    runtime: {
      getContexts: async () => [{ contextType: "OFFSCREEN_DOCUMENT" }],
      getURL: (path) => `chrome-extension://test/${path}`,
      onConnectExternal: createEvent((listener) => {
        listeners.externalConnect = listener;
      }),
      onInstalled: createEvent(),
      onMessage: createEvent((listener) => {
        listeners.runtimeMessage = listener;
      }),
      onStartup: createEvent(),
      sendMessage: async (message) => {
        sentRuntimeMessages.push(message);
        if (message.type === "get-status") {
          return { ok: true, status };
        }
        return { ok: true, status };
      },
    },
    tabCapture: {
      getMediaStreamId: async () => {
        captureStarts += 1;
        return "stream-id";
      },
      onStatusChanged: createEvent(),
    },
    tabs: {
      create: async () => {},
      onRemoved: createEvent(),
      onUpdated: createEvent(),
      update: async () => {},
    },
  };

  globalThis.chrome = chrome;
  globalThis.clients = { matchAll: async () => [] };

  try {
    const workerUrl = new URL(
      "../../extensions/watch-audio-companion/service-worker.mjs",
      import.meta.url,
    );
    workerUrl.searchParams.set("test", `${Date.now()}-${Math.random()}`);
    await import(workerUrl.href);
  } catch (error) {
    restoreGlobals();
    throw error;
  }

  function restoreGlobals() {
    if (originalChrome === undefined) delete globalThis.chrome;
    else globalThis.chrome = originalChrome;
    if (originalClients === undefined) delete globalThis.clients;
    else globalThis.clients = originalClients;
  }

  return {
    get captureStarts() {
      return captureStarts;
    },
    connect({ frameId = 0, tabId, url }) {
      assert.equal(
        typeof listeners.externalConnect,
        "function",
        "service worker must register runtime.onConnectExternal",
      );
      const port = createPort({ frameId, tabId, url });
      listeners.externalConnect(port);
      return port;
    },
    async emitWorkerMessage(message) {
      assert.equal(typeof listeners.runtimeMessage, "function");
      listeners.runtimeMessage(message, {}, () => {});
      await this.flush();
    },
    async flush() {
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
    restoreGlobals,
    sentRuntimeMessages,
    setStatus(nextStatus) {
      status = nextStatus;
    },
  };
}

function createPort({ frameId, tabId, url }) {
  const disconnectEvent = createListenerEvent();
  const messageEvent = createListenerEvent();
  return {
    disconnected: false,
    messages: [],
    name: BRIDGE_NAME,
    onDisconnect: disconnectEvent,
    onMessage: messageEvent,
    postAttempts: 0,
    postMessage(message) {
      this.postAttempts += 1;
      if (this.disconnected) throw new Error("Port is disconnected");
      this.messages.push(message);
    },
    receive(message) {
      messageEvent.emit(message);
    },
    sender: {
      frameId,
      tab: { id: tabId },
      url,
    },
    disconnect() {
      if (this.disconnected) return;
      this.disconnected = true;
    },
    disconnectFromPage() {
      if (this.disconnected) return;
      this.disconnected = true;
      disconnectEvent.emit();
    },
  };
}

function createEvent(onAdd) {
  return {
    addListener(listener) {
      onAdd?.(listener);
    },
  };
}

function createListenerEvent() {
  const listeners = new Set();
  return {
    addListener(listener) {
      listeners.add(listener);
    },
    emit(value) {
      for (const listener of [...listeners]) listener(value);
    },
    removeListener(listener) {
      listeners.delete(listener);
    },
  };
}

function createRhythmFrame() {
  return {
    bass: 0.4,
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.1,
    bpm: 120,
    confidence: 0.9,
    energy: 0.5,
    highs: 0.2,
    mids: 0.3,
    onset: 0.8,
    sampledAtSeconds: 12,
    sequence: 4,
    version: 1,
  };
}

function createVisualFrame({ sequence = 1, version = 1 } = {}) {
  return {
    sampledAtSeconds: 12,
    sequence,
    spectrum: Array.from({ length: 48 }, (_, index) => index),
    version,
    waveform: Array.from({ length: 96 }, (_, index) => 128 + (index % 8)),
  };
}

function extensionIdFromPublicKey(publicKey) {
  const digest = createHash("sha256")
    .update(Buffer.from(publicKey, "base64"))
    .digest()
    .subarray(0, 16);
  return [...digest]
    .flatMap((byte) => [byte >> 4, byte & 15])
    .map((nibble) => String.fromCharCode(97 + nibble))
    .join("");
}
