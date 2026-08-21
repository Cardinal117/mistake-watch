import assert from "node:assert/strict";
import test from "node:test";

import { createExternalBridgeController } from "../../extensions/watch-audio-companion/external-bridge.mjs";

test("external bridge recovers with the latest frame after an acknowledgement timeout", async () => {
  const timers = createTimerHarness();
  const controller = createExternalBridgeController({
    clearTimeout: timers.clearTimeout,
    getStatus: async () => createActiveStatus(),
    setTimeout: timers.setTimeout,
  });
  const port = createPort();
  await controller.connect(port);
  port.messages.length = 0;

  controller.publishVisualFrame(createVisualFrame(1));
  controller.publishVisualFrame(createVisualFrame(2));
  assert.deepEqual(readSequences(port), [1]);

  timers.runLatest();
  assert.deepEqual(readSequences(port), [1, 2]);
});

test("external bridge enables visual routing only while a captured page is authorized", async () => {
  const demand = [];
  const controller = createExternalBridgeController({
    getStatus: async () => createActiveStatus(),
    onVisualDemandChange: (enabled) => demand.push(enabled),
  });
  const port = createPort();

  await controller.connect(port);
  controller.publishStatus({
    active: false,
    hasSignal: false,
    phase: "idle",
    rhythm: null,
    tabId: null,
  });

  assert.deepEqual(demand, [true, false]);
  assert.equal(port.disconnected, false);
});

test("extension-side tab cleanup removes authorization without a local disconnect event", async () => {
  const demand = [];
  const controller = createExternalBridgeController({
    getStatus: async () => createActiveStatus(),
    onVisualDemandChange: (enabled) => demand.push(enabled),
  });
  const port = createPort();
  await controller.connect(port);
  port.messages.length = 0;

  controller.disconnectTab(42);
  controller.publishVisualFrame(createVisualFrame(8));

  assert.equal(port.disconnected, true);
  assert.deepEqual(port.messages, []);
  assert.deepEqual(demand, [true, false]);
});

test("extension-side post failure removes authorization without a local disconnect event", async () => {
  const demand = [];
  const controller = createExternalBridgeController({
    getStatus: async () => createActiveStatus(),
    onVisualDemandChange: (enabled) => demand.push(enabled),
  });
  const port = createPort();
  await controller.connect(port);
  port.failPosts = true;

  controller.publishVisualFrame(createVisualFrame(8));

  assert.equal(port.disconnected, true);
  assert.deepEqual(demand, [true, false]);
});

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

function createVisualFrame(sequence) {
  return {
    sampledAtSeconds: 12,
    sequence,
    spectrum: Array.from({ length: 48 }, (_, index) => index),
    version: 1,
    waveform: Array.from({ length: 96 }, (_, index) => 128 + (index % 8)),
  };
}

function createPort() {
  const disconnect = createEvent();
  const message = createEvent();
  return {
    disconnected: false,
    failPosts: false,
    messages: [],
    name: "mistake-watch-audio-v1",
    onDisconnect: disconnect,
    onMessage: message,
    postMessage(value) {
      if (this.failPosts) throw new Error("Port is closed");
      this.messages.push(value);
    },
    sender: {
      frameId: 0,
      tab: { id: 42 },
      url: "https://watch.mistakestudios.com/rooms/room-1",
    },
    disconnect() {
      if (this.disconnected) return;
      this.disconnected = true;
    },
  };
}

function createEvent() {
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

function createTimerHarness() {
  const timers = new Map();
  let nextId = 1;
  return {
    clearTimeout(id) {
      timers.delete(id);
    },
    runLatest() {
      const [id, callback] = [...timers.entries()].at(-1);
      timers.delete(id);
      callback();
    },
    setTimeout(callback) {
      const id = nextId;
      nextId += 1;
      timers.set(id, callback);
      return id;
    },
  };
}

function readSequences(port) {
  return port.messages.map((message) => message.frame.sequence);
}
