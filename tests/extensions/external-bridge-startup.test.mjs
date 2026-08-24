import assert from "node:assert/strict";
import test from "node:test";

import { createExternalBridgeController } from "../../extensions/watch-audio-companion/external-bridge.mjs";

const BRIDGE_NAME = "mistake-watch-audio-v1";

test("external bridge sends inactive before an optional status lookup settles", async () => {
  const pending = createPendingStatus();
  const controller = createExternalBridgeController({
    getStatus: () => pending.promise,
  });
  const port = createPort();

  const connecting = controller.connect(port);

  assert.deepEqual(port.messages, [
    {
      status: { active: false, hasSignal: false, phase: "idle" },
      type: "capture-state",
      version: 1,
    },
  ]);

  pending.resolve(createActiveStatus());
  await connecting;

  assert.equal(port.messages.at(-2).status.active, true);
  assert.equal(port.messages.at(-1).type, "rhythm-frame");
  assert.equal(port.disconnected, false);
});

test("external bridge ignores a stale status lookup after a worker update", async () => {
  const pending = createPendingStatus();
  const controller = createExternalBridgeController({
    getStatus: () => pending.promise,
  });
  const port = createPort();

  const connecting = controller.connect(port);
  controller.publishStatus(createActiveStatus());
  const messageCount = port.messages.length;

  pending.resolve({
    active: false,
    hasSignal: false,
    phase: "idle",
    rhythm: null,
    tabId: null,
  });
  await connecting;

  assert.equal(port.messages.length, messageCount);
  assert.equal(port.messages.at(-2).status.active, true);
  assert.equal(port.messages.at(-1).type, "rhythm-frame");
});

function createPendingStatus() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function createPort() {
  const disconnectListeners = new Set();
  const messageListeners = new Set();
  return {
    disconnected: false,
    messages: [],
    name: BRIDGE_NAME,
    onDisconnect: createEvent(disconnectListeners),
    onMessage: createEvent(messageListeners),
    postMessage(message) {
      this.messages.push(message);
    },
    sender: {
      frameId: 0,
      tab: { id: 42 },
      url: "https://watch.mistakestudios.com/rooms/room-1",
    },
    disconnect() {
      this.disconnected = true;
    },
  };
}

function createEvent(listeners) {
  return {
    addListener(listener) {
      listeners.add(listener);
    },
    removeListener(listener) {
      listeners.delete(listener);
    },
  };
}

function createActiveStatus() {
  return {
    active: true,
    hasSignal: true,
    phase: "active",
    rhythm: {
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
    },
    tabId: 42,
  };
}
