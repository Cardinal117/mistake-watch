import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  CaptureSession,
  createTabAudioConstraints,
} from "../../extensions/watch-audio-companion/capture-session.mjs";
import {
  isAllowedWatchUrl,
  normalizeAnalyserTelemetry,
} from "../../extensions/watch-audio-companion/protocol.mjs";
import { createRhythmFrameV1 } from "../../extensions/watch-audio-companion/rhythm-contract.mjs";

test("manifest keeps the private capture permission surface narrow", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        "../../extensions/watch-audio-companion/manifest.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.equal(manifest.version, "0.3.1");
  assert.deepEqual(manifest.permissions.toSorted(), [
    "activeTab",
    "offscreen",
    "tabCapture",
  ]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.web_accessible_resources, undefined);
  assert.match(
    manifest.content_security_policy.extension_pages,
    /connect-src 'none'/,
  );
});

test("extension visualizer remains an internal page without web exposure", async () => {
  const directory = new URL(
    "../../extensions/watch-audio-companion/",
    import.meta.url,
  );
  const [markup, controller] = await Promise.all([
    readFile(new URL("visualizer.html", directory), "utf8"),
    readFile(new URL("visualizer.mjs", directory), "utf8"),
  ]);

  assert.match(markup, /id="visualizer"/);
  assert.match(markup, /Mirror Spectrum/);
  assert.match(markup, /Siri Ribbon/);
  assert.match(controller, /MESSAGE_TYPE\.getStatus/);
  assert.doesNotMatch(markup, /\b(?:href|src)="https?:\/\//);
  assert.doesNotMatch(markup, /\son\w+\s*=/i);
});

test("extension source has no network or persistence API", async () => {
  const directory = new URL(
    "../../extensions/watch-audio-companion/",
    import.meta.url,
  );
  const files = (await readdir(directory)).filter((name) =>
    /\.(?:js|mjs)$/.test(name),
  );
  const source = (
    await Promise.all(
      files.map((name) => readFile(new URL(name, directory), "utf8")),
    )
  ).join("\n");

  assert.doesNotMatch(
    source,
    /\b(?:fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b|chrome\.storage/,
  );
  assert.doesNotMatch(
    source,
    /postMessage\(\s*(?:inputs|channels|samples|pcm)\b/i,
  );
});

test("approved URL matching excludes unrelated tabs", () => {
  assert.equal(
    isAllowedWatchUrl("https://watch.mistakestudios.com/rooms/1"),
    true,
  );
  assert.equal(
    isAllowedWatchUrl("https://mistake-watch.vercel.app/rooms/1"),
    true,
  );
  assert.equal(isAllowedWatchUrl("http://127.0.0.1:5371/rooms/1"), true);
  assert.equal(isAllowedWatchUrl("http://localhost:5371/rooms/1"), true);
  assert.equal(isAllowedWatchUrl("https://youtube.com/watch?v=test"), false);
  assert.equal(isAllowedWatchUrl("not-a-url"), false);
});

test("analyser telemetry is finite, bounded, and versioned", () => {
  const rhythm = createTestRhythmFrame();

  assert.deepEqual(
    normalizeAnalyserTelemetry({ frames: 12.9, peak: 3, rhythm, rms: -1 }),
    {
      frames: 12,
      peak: 1,
      rhythm,
      rms: 0,
    },
  );
  assert.deepEqual(
    normalizeAnalyserTelemetry({ frames: NaN, peak: Infinity }),
    {
      frames: 0,
      peak: 0,
      rhythm: null,
      rms: 0,
    },
  );
});

test("tab capture constraints request audio without video", () => {
  assert.deepEqual(createTabAudioConstraints("stream-1"), {
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: "stream-1",
      },
    },
    video: false,
  });
});

test("capture session routes audible audio, probes silently, and cleans up", async () => {
  const harness = createHarness();
  const states = [];
  const session = new CaptureSession({
    ...harness.dependencies,
    onStateChange: (status) => states.push(status),
  });

  const active = await session.start({ streamId: "stream-1", tabId: 42 });

  assert.equal(active.active, true);
  assert.equal(active.tabId, 42);
  assert.deepEqual(harness.constraints, createTabAudioConstraints("stream-1"));
  assert.deepEqual(harness.context.modules, ["rhythm-analyser-worklet.mjs"]);
  assert.equal(harness.source.connections[0], harness.context.destination);
  assert.equal(harness.source.connections[1], harness.probe);
  assert.equal(harness.probe.connections[0], harness.silentOutput);
  assert.equal(harness.silentOutput.gain.value, 0);
  assert.equal(
    harness.silentOutput.connections[0],
    harness.context.destination,
  );

  harness.probe.port.onmessage({
    data: {
      frames: 24_000,
      peak: 0.8,
      rhythm: createTestRhythmFrame(),
      rms: 0.2,
    },
  });
  assert.equal(session.getStatus().hasSignal, true);
  assert.equal(session.getStatus().rhythm.bpm, 120);
  assert.equal(states.at(-1).hasSignal, true);

  harness.probe.port.onmessage({
    data: {
      frames: 12_000,
      peak: 0.4,
      rhythm: createTestRhythmFrame({
        bpm: 90,
        sampledAtSeconds: 11,
        sequence: 1,
      }),
      rms: 0.1,
    },
  });
  assert.equal(session.getStatus().rhythm.bpm, 120);

  const stopped = await session.stop("test-complete");
  assert.equal(stopped.active, false);
  assert.equal(stopped.reason, "test-complete");
  assert.equal(harness.track.stopCalls, 1);
  assert.equal(harness.context.closeCalls, 1);
  assert.equal(harness.source.disconnectCalls, 1);
  assert.equal(harness.probe.disconnectCalls, 1);
  assert.equal(harness.silentOutput.disconnectCalls, 1);

  await session.stop("second-stop");
  assert.equal(harness.track.stopCalls, 1);
});

test("capture session rejects duplicate active starts", async () => {
  const harness = createHarness();
  const session = new CaptureSession(harness.dependencies);

  await session.start({ streamId: "stream-1", tabId: 42 });
  await assert.rejects(
    session.start({ streamId: "stream-2", tabId: 42 }),
    /already active/,
  );
  await session.stop();
});

test("capture session releases the tab stream when startup fails", async () => {
  const harness = createHarness({ moduleError: new Error("worklet failed") });
  const session = new CaptureSession(harness.dependencies);

  await assert.rejects(
    session.start({ streamId: "stream-1", tabId: 42 }),
    /worklet failed/,
  );

  assert.equal(session.getStatus().active, false);
  assert.equal(session.getStatus().reason, "start-failed");
  assert.equal(harness.track.stopCalls, 1);
  assert.equal(harness.context.closeCalls, 1);
});

test("capture session rejects and releases a stream without audio", async () => {
  const harness = createHarness({ includeAudioTrack: false });
  const session = new CaptureSession(harness.dependencies);

  await assert.rejects(
    session.start({ streamId: "stream-1", tabId: 42 }),
    /did not provide an audio track/,
  );

  assert.equal(harness.track.stopCalls, 1);
  assert.equal(harness.context.closeCalls, 0);
});

function createHarness({ includeAudioTrack = true, moduleError } = {}) {
  const track = createTrack();
  const stream = {
    getAudioTracks: () => (includeAudioTrack ? [track] : []),
    getTracks: () => [track],
  };
  const source = createNode();
  const probe = { ...createNode(), port: { onmessage: null } };
  const silentOutput = { ...createNode(), gain: { value: 1 } };
  const context = {
    audioWorklet: {
      addModule: async (url) => {
        context.modules.push(url);
        if (moduleError) {
          throw moduleError;
        }
      },
    },
    close: async () => {
      context.closeCalls += 1;
      context.state = "closed";
    },
    closeCalls: 0,
    createGain: () => silentOutput,
    createMediaStreamSource: () => source,
    destination: { id: "destination" },
    modules: [],
    resume: async () => {
      context.state = "running";
    },
    state: "suspended",
  };
  const harness = {
    constraints: null,
    context,
    probe,
    silentOutput,
    source,
    track,
  };

  harness.dependencies = {
    createAudioContext: () => context,
    createWorkletNode: () => probe,
    getUserMedia: async (constraints) => {
      harness.constraints = constraints;
      return stream;
    },
    workletModuleUrl: "rhythm-analyser-worklet.mjs",
  };

  return harness;
}

function createTestRhythmFrame(overrides = {}) {
  return createRhythmFrameV1({
    beatIntervalSeconds: 0.5,
    beatOffsetSeconds: 0.1,
    bpm: 120,
    confidence: 0.8,
    energy: 0.7,
    highs: 0.6,
    mids: 0.5,
    bass: 0.4,
    onset: 0.3,
    sampledAtSeconds: 12,
    sequence: 2,
    ...overrides,
  });
}

function createNode() {
  return {
    connections: [],
    connect(target) {
      this.connections.push(target);
      return target;
    },
    disconnect() {
      this.disconnectCalls += 1;
    },
    disconnectCalls: 0,
  };
}

function createTrack() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    stop() {
      this.stopCalls += 1;
    },
    stopCalls: 0,
  };
}
