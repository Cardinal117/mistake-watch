import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIO_COMPANION_EXTENSION_ID,
  createAudioCompanionClient,
} from "../../lib/audio-companion/client.ts";

test("website client connects to the stable private extension without polling", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);

  assert.equal(
    AUDIO_COMPANION_EXTENSION_ID,
    "gjhgbhjblbbpcpallbnpakijoheemgdb",
  );
  assert.deepEqual(client.getSnapshot(), {
    hasVisualDetail: false,
    rhythm: null,
    status: "unavailable",
  });

  client.connect();
  assert.equal(harness.connections.length, 1);
  assert.deepEqual(harness.connections[0].request, {
    extensionId: AUDIO_COMPANION_EXTENSION_ID,
    name: "mistake-watch-audio-v1",
  });
  assert.equal(harness.intervalCalls, 0);
});

test("website client reports inactive detecting locked stale and disconnected", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);
  const states = [];
  client.subscribeState(() => states.push(client.getSnapshot()));
  client.connect();
  const port = harness.connections[0].port;

  port.emitMessage(createCaptureState({ active: false }));
  port.emitMessage(createCaptureState({ active: true, hasSignal: false }));
  port.emitMessage({
    frame: createRhythmFrame(),
    type: "rhythm-frame",
    version: 1,
  });

  assert.deepEqual(
    states.map((state) => state.status),
    ["inactive", "detecting", "locked"],
  );
  assert.equal(client.getSnapshot().rhythm.bpm, 120);
  const lockTimer = harness.latestTimeoutId;
  port.emitMessage({
    frame: createVisualFrame({ sequence: 1 }),
    type: "visual-frame",
    version: 1,
  });
  assert.notEqual(harness.latestTimeoutId, lockTimer);

  port.emitMessage(createCaptureState({ active: true, hasSignal: false }));
  assert.deepEqual(client.getSnapshot(), {
    hasVisualDetail: false,
    rhythm: null,
    status: "detecting",
  });
  port.emitMessage({
    frame: createRhythmFrame({ sequence: 5 }),
    type: "rhythm-frame",
    version: 1,
  });

  harness.runLatestTimeout();
  assert.equal(client.getSnapshot().status, "stale");

  port.disconnect();
  assert.equal(client.getSnapshot().status, "disconnected");
});

test("website client validates visual frames and acknowledges only accepted data", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);
  const frames = [];
  client.subscribeVisual((frame) => frames.push(frame));
  client.connect();
  const port = harness.connections[0].port;

  port.emitMessage({
    frame: createVisualFrame({ sequence: 4 }),
    type: "visual-frame",
    version: 1,
  });
  port.emitMessage({
    frame: createVisualFrame({ sequence: 5, spectrumLength: 2 }),
    type: "visual-frame",
    version: 1,
  });
  port.emitMessage({
    frame: createVisualFrame({ sequence: 6 }),
    type: "visual-frame",
    version: 2,
  });

  assert.deepEqual(
    frames.map((frame) => frame.sequence),
    [4],
  );
  assert.deepEqual(port.sent, [
    { sequence: 4, type: "visual-ack", version: 1 },
  ]);
  assert.equal(client.getSnapshot().hasVisualDetail, true);

  port.emitMessage({
    status: { active: false, hasSignal: false },
    type: "capture-state",
    version: 1,
  });
  assert.equal(client.getSnapshot().hasVisualDetail, false);
});

test("website client acknowledges valid frames even when a visual listener fails", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);
  client.subscribeVisual(() => {
    throw new Error("renderer failed");
  });
  client.connect();
  const port = harness.connections[0].port;

  assert.doesNotThrow(() =>
    port.emitMessage({
      frame: createVisualFrame({ sequence: 7 }),
      type: "visual-frame",
      version: 1,
    }),
  );
  assert.deepEqual(port.sent, [
    { sequence: 7, type: "visual-ack", version: 1 },
  ]);
});

test("website client expires visual detail without resetting a timer per frame", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);
  client.connect();
  const port = harness.connections[0].port;

  port.emitMessage({
    frame: createVisualFrame({ sequence: 1 }),
    type: "visual-frame",
    version: 1,
  });
  const freshnessTimer = harness.latestTimeoutId;
  harness.advanceTime(650);
  port.emitMessage({
    frame: createVisualFrame({ sequence: 2 }),
    type: "visual-frame",
    version: 1,
  });

  assert.equal(client.getSnapshot().hasVisualDetail, true);
  assert.equal(harness.latestTimeoutId, freshnessTimer);
  harness.runTimeout(freshnessTimer);
  assert.equal(client.getSnapshot().hasVisualDetail, true);

  harness.advanceTime(701);
  harness.runLatestTimeout();
  assert.equal(client.getSnapshot().hasVisualDetail, false);
});

test("website client restores its logical bridge after worker termination", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);
  const unsubscribe = client.subscribeState(() => {});

  client.connect();
  const first = harness.connections[0].port;
  first.disconnect();

  assert.equal(client.getSnapshot().status, "disconnected");
  assert.equal(harness.connections.length, 1);
  assert.equal(harness.activeTimeouts, 1);

  client.connect();
  assert.equal(harness.connections.length, 1);
  assert.equal(harness.activeTimeouts, 1);

  harness.runLatestTimeout();
  const second = harness.connections[1].port;

  assert.equal(harness.connections.length, 2);
  assert.equal(first.messageListenerCount, 0);
  assert.equal(first.disconnectListenerCount, 0);
  assert.equal(second.messageListenerCount, 1);
  assert.equal(second.disconnectListenerCount, 1);

  unsubscribe();
  client.disconnect();
  assert.equal(second.disconnected, true);
  assert.equal(second.messageListenerCount, 0);
  assert.equal(second.disconnectListenerCount, 0);
  assert.equal(harness.activeTimeouts, 0);
});

test("website client never reconnects after explicit cleanup", () => {
  const harness = createClientHarness();
  const client = createAudioCompanionClient(harness.dependencies);

  client.connect();
  client.disconnect();

  assert.equal(harness.connections.length, 1);
  assert.equal(harness.activeTimeouts, 0);
  assert.equal(client.getSnapshot().status, "unavailable");
});

function createClientHarness() {
  const connections = [];
  const timeouts = new Map();
  let nextTimeoutId = 1;
  let intervalCalls = 0;
  let nowMs = 0;

  return {
    get activeTimeouts() {
      return timeouts.size;
    },
    connections,
    dependencies: {
      clearTimeout(id) {
        timeouts.delete(id);
      },
      runtime: {
        connect(extensionId, options) {
          const port = createPort();
          connections.push({
            port,
            request: { extensionId, name: options.name },
          });
          return port;
        },
      },
      now: () => nowMs,
      setInterval() {
        intervalCalls += 1;
      },
      setTimeout(callback, delay) {
        const id = nextTimeoutId;
        nextTimeoutId += 1;
        timeouts.set(id, { callback, delay });
        return id;
      },
    },
    advanceTime(milliseconds) {
      nowMs += milliseconds;
    },
    get intervalCalls() {
      return intervalCalls;
    },
    get latestTimeoutId() {
      return [...timeouts.keys()].at(-1) ?? null;
    },
    runLatestTimeout() {
      const [id] = [...timeouts.entries()].at(-1);
      this.runTimeout(id);
    },
    runTimeout(id) {
      const timer = timeouts.get(id);
      timeouts.delete(id);
      timer.callback();
    },
  };
}

function createPort() {
  const disconnectListeners = new Set();
  const messageListeners = new Set();
  return {
    disconnected: false,
    get disconnectListenerCount() {
      return disconnectListeners.size;
    },
    get messageListenerCount() {
      return messageListeners.size;
    },
    onDisconnect: createListenerEvent(disconnectListeners),
    onMessage: createListenerEvent(messageListeners),
    sent: [],
    disconnect() {
      if (this.disconnected) return;
      this.disconnected = true;
      for (const listener of [...disconnectListeners]) listener();
    },
    emitMessage(message) {
      for (const listener of [...messageListeners]) listener(message);
    },
    postMessage(message) {
      this.sent.push(message);
    },
  };
}

function createListenerEvent(listeners) {
  return {
    addListener(listener) {
      listeners.add(listener);
    },
    removeListener(listener) {
      listeners.delete(listener);
    },
  };
}

function createCaptureState({ active, hasSignal = false }) {
  return {
    status: {
      active,
      hasSignal,
      phase: active ? "active" : "idle",
    },
    type: "capture-state",
    version: 1,
  };
}

function createRhythmFrame({ sequence = 4 } = {}) {
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
    sequence,
    version: 1,
  };
}

function createVisualFrame({ sequence, spectrumLength = 48 }) {
  return {
    sampledAtSeconds: 12,
    sequence,
    spectrum: Array.from({ length: spectrumLength }, (_, index) => index),
    version: 1,
    waveform: Array.from({ length: 96 }, (_, index) => 128 + (index % 8)),
  };
}
