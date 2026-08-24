import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-listen-renderers-"),
);

async function importTypeScript(relativePath) {
  const sourcePath = path.join(rootDir, relativePath);
  const output = ts.transpileModule(await readFile(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const modulePath = path.join(
    tempDir,
    `${path.basename(relativePath, ".ts")}.mjs`,
  );
  await writeFile(modulePath, output);
  return import(pathToFileURL(modulePath));
}

async function importRendererModule() {
  const files = [
    "listen-canvas-renderer-shared.ts",
    "listen-canvas-renderers-experimental.ts",
    "listen-canvas-renderers.ts",
  ];
  for (const file of files) {
    const sourcePath = path.join(rootDir, "lib/player", file);
    const output = ts
      .transpileModule(await readFile(sourcePath, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ES2022,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: sourcePath,
      })
      .outputText.replace(/from "(\.\/[^".]+)"/g, 'from "$1.mjs"');
    await writeFile(path.join(tempDir, file.replace(/\.ts$/, ".mjs")), output);
  }
  return import(
    pathToFileURL(path.join(tempDir, "listen-canvas-renderers.mjs"))
  );
}

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("capability resolution fails closed without the required signal", async () => {
  const { resolveListenVisualizationCapability } = await importTypeScript(
    "lib/player/listen-visualizer-input.ts",
  );

  assert.deepEqual(
    resolveListenVisualizationCapability("mirror-spectrum", {
      hasLocalDetail: false,
      hasSharedRhythm: true,
      preview: false,
    }),
    {
      effectiveMode: "static-artwork",
      reason: "companion-required",
      source: "fallback",
    },
  );
  assert.deepEqual(
    resolveListenVisualizationCapability("siri-ribbon", {
      hasLocalDetail: false,
      hasSharedRhythm: false,
      preview: false,
    }),
    {
      effectiveMode: "static-artwork",
      reason: "shared-rhythm-unavailable",
      source: "fallback",
    },
  );
  assert.equal(
    resolveListenVisualizationCapability("signal-bloom", {
      hasLocalDetail: true,
      hasSharedRhythm: false,
      preview: false,
    }).source,
    "local-detail",
  );
  assert.equal(
    resolveListenVisualizationCapability("constellation", {
      hasLocalDetail: false,
      hasSharedRhythm: false,
      preview: true,
    }).source,
    "preview",
  );
});

test("shared rhythm creates deterministic bounded renderer input", async () => {
  const { createSharedRhythmVisualizerInput } = await importTypeScript(
    "lib/player/listen-visualizer-input.ts",
  );
  const profile = {
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.91,
    mediaBeatOffsetSeconds: 0.125,
  };

  const first = createSharedRhythmVisualizerInput(profile, 14.375);
  const samePhase = createSharedRhythmVisualizerInput(profile, 16.375);
  const offBeat = createSharedRhythmVisualizerInput(profile, 14.625);

  assert.equal(first.kind, "shared-rhythm");
  assert.equal(first.phase, 0.5);
  assert.equal(first.spectrum.length, 48);
  assert.equal(first.waveform.length, 96);
  assert.deepEqual(first, samePhase);
  assert.notDeepEqual(first.spectrum, offBeat.spectrum);
  assert.ok(first.spectrum.every((value) => value >= 0 && value <= 1));
  assert.ok(first.waveform.every((value) => value >= -1 && value <= 1));
});

test("local detailed frames normalize bytes without publishing them", async () => {
  const { createLocalDetailVisualizerInput } = await importTypeScript(
    "lib/player/listen-visualizer-input.ts",
  );
  const input = createLocalDetailVisualizerInput(
    {
      bass: 0.7,
      confidence: 0.8,
      energy: 0.6,
      highs: 0.3,
      mids: 0.5,
      onset: 0.4,
      bpm: 100,
    },
    {
      spectrum: Array.from({ length: 48 }, (_, index) => index * 5),
      waveform: Array.from({ length: 96 }, (_, index) =>
        index % 2 === 0 ? 0 : 255,
      ),
    },
  );

  assert.equal(input.kind, "local-detail");
  assert.equal(input.spectrum[0], 0);
  assert.equal(input.spectrum.at(-1), 235 / 255);
  assert.equal(input.waveform[0], -1);
  assert.equal(input.waveform[1], 127 / 128);
});

test("renderer input reuses fixed buffers at frame cadence", async () => {
  const {
    createListenVisualizerInputBuffers,
    createLocalDetailVisualizerInput,
    createSharedRhythmVisualizerInput,
  } = await importTypeScript("lib/player/listen-visualizer-input.ts");
  const localBuffers = createListenVisualizerInputBuffers();
  const sharedBuffers = createListenVisualizerInputBuffers();
  const visual = {
    spectrum: Array.from({ length: 48 }, (_, index) => index),
    waveform: Array.from({ length: 96 }, (_, index) => 128 + (index % 10)),
  };
  const rhythm = {
    bass: 0.6,
    bpm: 120,
    confidence: 0.9,
    energy: 0.5,
    highs: 0.3,
    mids: 0.4,
    onset: 0.7,
  };
  const profile = {
    beatIntervalSeconds: 0.5,
    bpm: 120,
    confidence: 0.91,
    mediaBeatOffsetSeconds: 0.125,
  };

  const localFirst = createLocalDetailVisualizerInput(
    rhythm,
    visual,
    localBuffers,
  );
  const localSecond = createLocalDetailVisualizerInput(
    rhythm,
    visual,
    localBuffers,
  );
  const sharedFirst = createSharedRhythmVisualizerInput(
    profile,
    14.375,
    sharedBuffers,
  );
  const sharedSecond = createSharedRhythmVisualizerInput(
    profile,
    14.625,
    sharedBuffers,
  );

  assert.equal(localFirst.spectrum, localSecond.spectrum);
  assert.equal(localFirst.waveform, localSecond.waveform);
  assert.equal(sharedFirst.spectrum, sharedSecond.spectrum);
  assert.equal(sharedFirst.waveform, sharedSecond.waveform);
  assert.notEqual(localFirst.spectrum, sharedFirst.spectrum);
});

test("canvas engine owns one capped loop and releases it deterministically", async () => {
  const { ListenCanvasEngine } = await importTypeScript(
    "lib/player/listen-canvas-engine.ts",
  );
  const callbacks = new Map();
  const cancelled = [];
  let nextId = 1;
  let renders = 0;
  let disposed = 0;
  const engine = new ListenCanvasEngine({
    cancelFrame: (id) => {
      cancelled.push(id);
      callbacks.delete(id);
    },
    fps: 24,
    getInput: () => ({ active: true }),
    render: () => {
      renders += 1;
    },
    requestFrame: (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    onDispose: () => {
      disposed += 1;
    },
  });

  engine.start();
  engine.start();
  assert.equal(callbacks.size, 1);
  const firstFrame = callbacks.get(1);
  callbacks.delete(1);
  firstFrame(0);
  assert.equal(renders, 1);
  assert.equal(callbacks.size, 1);
  engine.stop("paused");
  assert.equal(callbacks.size, 0);
  engine.start();
  assert.equal(callbacks.size, 1);
  engine.dispose();
  assert.equal(callbacks.size, 0);
  assert.equal(disposed, 1);
  assert.equal(engine.snapshot().running, false);
  assert.ok(cancelled.length >= 1);
});

test("canvas engine preserves the browser receiver for animation frame methods", async () => {
  const { ListenCanvasEngine } = await importTypeScript(
    "lib/player/listen-canvas-engine.ts",
  );
  const originalRequestFrame = globalThis.requestAnimationFrame;
  const originalCancelFrame = globalThis.cancelAnimationFrame;
  let requested = 0;
  let cancelled = 0;

  globalThis.requestAnimationFrame = function () {
    assert.equal(this, globalThis);
    requested += 1;
    return 42;
  };
  globalThis.cancelAnimationFrame = function (id) {
    assert.equal(this, globalThis);
    assert.equal(id, 42);
    cancelled += 1;
  };

  try {
    const engine = new ListenCanvasEngine({
      getInput: () => ({ active: true }),
      render: () => {},
    });
    engine.start();
    engine.stop("paused");
    assert.equal(requested, 1);
    assert.equal(cancelled, 1);
  } finally {
    globalThis.requestAnimationFrame = originalRequestFrame;
    globalThis.cancelAnimationFrame = originalCancelFrame;
  }
});

test("every production renderer draws through the complete lifecycle contract", async () => {
  const { createListenCanvasRenderer } = await importRendererModule();
  const modes = [
    "mirror-spectrum",
    "siri-ribbon",
    "dot-waves",
    "signal-bloom",
    "constellation",
  ];

  for (const mode of modes) {
    const context = createCanvasContext(640, 240);
    const renderer = createListenCanvasRenderer(mode);
    assert.equal(renderer.id, mode);
    assert.doesNotThrow(() => renderer.init());
    assert.doesNotThrow(() =>
      renderer.resize({ compact: false, height: 240, width: 640 }),
    );
    assert.doesNotThrow(() =>
      renderer.render(createRendererFrame(context, createRendererInput())),
    );
    assert.ok(
      context.calls.fill + context.calls.fillRect + context.calls.stroke > 0,
      `${mode} must produce nonblank drawing operations`,
    );
    assert.doesNotThrow(() => renderer.dispose());
  }
});

test("shared Siri rendering is deterministic and responds to beat input", async () => {
  const { createListenCanvasRenderer } = await importRendererModule();
  const first = createCanvasContext(640, 240);
  const second = createCanvasContext(640, 240);
  const changed = createCanvasContext(640, 240);
  const rendererA = createListenCanvasRenderer("siri-ribbon");
  const rendererB = createListenCanvasRenderer("siri-ribbon");
  const rendererC = createListenCanvasRenderer("siri-ribbon");
  const input = createRendererInput();
  const changedInput = createRendererInput({
    bass: 0.15,
    spectrum: new Array(48).fill(0.12),
    waveform: new Array(96).fill(-0.2),
  });

  rendererA.render(createRendererFrame(first, input));
  rendererB.render(createRendererFrame(second, input));
  rendererC.render(createRendererFrame(changed, changedInput));

  assert.deepEqual(first.operations, second.operations);
  assert.notDeepEqual(first.operations, changed.operations);
});

test("Constellation keeps a bounded deterministic particle field", async () => {
  const { createListenCanvasRenderer } = await importRendererModule();
  const context = createCanvasContext(320, 160);
  const renderer = createListenCanvasRenderer("constellation");
  renderer.init();
  renderer.resize({ compact: true, height: 160, width: 320 });
  renderer.render(
    createRendererFrame(context, createRendererInput(), {
      compact: true,
      height: 160,
      width: 320,
    }),
  );

  assert.equal(context.arcs.length, 30);
  assert.ok(
    context.arcs.every(
      ({ radius, x, y }) =>
        radius > 0 && x >= 0 && x <= 320 && y >= 0 && y <= 160,
    ),
  );
  assert.ok(context.calls.stroke <= 96);
});

function createRendererFrame(context, input, overrides = {}) {
  return {
    compact: false,
    context,
    deltaMs: 16.67,
    height: 240,
    input,
    intensity: 0.8,
    theme: {
      primary: "20 210 220",
      secondary: "255 186 32",
      shadow: "20 210 220",
      wave: "120 240 245",
    },
    timeMs: 1_250,
    width: 640,
    ...overrides,
  };
}

function createRendererInput(overrides = {}) {
  return {
    active: true,
    bass: 0.72,
    confidence: 0.9,
    energy: 0.68,
    highs: 0.45,
    kind: "shared-rhythm",
    mids: 0.58,
    onset: 0.76,
    phase: 0.2,
    spectrum: Array.from(
      { length: 48 },
      (_, index) => 0.2 + (index % 9) * 0.07,
    ),
    tempoBpm: 120,
    waveform: Array.from(
      { length: 96 },
      (_, index) => Math.sin((index / 96) * Math.PI * 6) * 0.55,
    ),
    ...overrides,
  };
}

function createCanvasContext(width, height) {
  const arcs = [];
  const operations = [];
  const calls = { fill: 0, fillRect: 0, stroke: 0 };
  const context = {
    arcs,
    calls,
    canvas: { height, width },
    operations,
    arc(x, y, radius) {
      arcs.push({ radius, x, y });
      operations.push(["arc", x, y, radius]);
    },
    beginPath() {
      operations.push(["beginPath"]);
    },
    clearRect() {},
    closePath() {
      operations.push(["closePath"]);
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    fill() {
      calls.fill += 1;
    },
    fillRect(x, y, drawWidth, drawHeight) {
      calls.fillRect += 1;
      operations.push(["fillRect", x, y, drawWidth, drawHeight]);
    },
    lineTo(x, y) {
      operations.push(["lineTo", x, y]);
    },
    moveTo(x, y) {
      operations.push(["moveTo", x, y]);
    },
    restore() {},
    rotate() {},
    save() {},
    setTransform() {},
    stroke() {
      calls.stroke += 1;
    },
    translate() {},
  };
  return context;
}
