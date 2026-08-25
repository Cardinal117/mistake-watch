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
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-siri-"));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("Siri Ribbon maps five musical roles with faster attack than release", async () => {
  const {
    createSiriRibbonDynamics,
    getSiriRibbonLobeTargets,
    updateSiriRibbonDynamics,
  } = await importRendererModule();
  const bass = getSiriRibbonLobeTargets(
    createInput({
      bass: 1,
      energy: 0.2,
      highs: 0,
      mids: 0,
      onset: 0.8,
      spectrum: createBandFixture("bass"),
    }),
  );
  const mids = getSiriRibbonLobeTargets(
    createInput({
      bass: 0,
      energy: 0.5,
      highs: 0,
      mids: 1,
      onset: 0,
      spectrum: createBandFixture("mids"),
    }),
  );
  const highs = getSiriRibbonLobeTargets(
    createInput({
      bass: 0,
      energy: 0.2,
      highs: 1,
      mids: 0,
      onset: 0.8,
      spectrum: createBandFixture("highs"),
    }),
  );

  assert.equal(bass.length, 5);
  assert.ok(bass[2] > bass[1] && bass[2] > bass[3]);
  assert.ok(mids[1] > mids[0] && mids[3] > mids[4]);
  assert.ok(highs[0] > highs[1] && highs[4] > highs[3]);

  const dynamics = createSiriRibbonDynamics();
  const rise = updateSiriRibbonDynamics(
    dynamics,
    new Float32Array([1, 1, 1, 1, 1]),
    40,
  )[2];
  const fall = updateSiriRibbonDynamics(
    dynamics,
    new Float32Array([0, 0, 0, 0, 0]),
    40,
  )[2];
  assert.ok(rise > 0.55, `expected fast attack, received ${rise}`);
  assert.ok(fall > rise * 0.65, `expected bounded release, received ${fall}`);
});

test("Siri Ribbon draws bounded Bezier layers without costly paint effects", async () => {
  const { createListenCanvasRenderer } = await importRendererModule();
  const context = createCanvasContext(640, 240);
  const renderer = createListenCanvasRenderer("siri-ribbon");
  renderer.resize({ compact: false, height: 240, width: 640 });
  renderer.render(createFrame(context, createInput()));

  assert.ok(
    context.beziers.length >= 36,
    `expected five explicit lobes per layer, received ${context.beziers.length} curves`,
  );
  assert.ok(context.beziers.length <= 44);
  assert.ok(context.calls.fill <= 2);
  assert.ok(context.calls.stroke <= 2);
  assert.notEqual(context.globalCompositeOperation, "lighter");
  assert.equal(context.shadowBlur, 0);
  assert.ok(
    context.beziers.every((points) =>
      points.every((value, index) =>
        index % 2 === 0
          ? value >= 0 && value <= 640
          : value >= 0 && value <= 240,
      ),
    ),
  );
});

async function importRendererModule() {
  for (const file of [
    "listen-canvas-renderer-shared.ts",
    "listen-siri-ribbon.ts",
    "listen-canvas-renderers-experimental.ts",
    "listen-canvas-renderers.ts",
  ]) {
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

function createBandFixture(role) {
  const values = new Array(48).fill(0.04);
  const ranges = { bass: [0, 12], highs: [32, 48], mids: [12, 32] };
  const [start, end] = ranges[role];
  for (let index = start; index < end; index += 1) values[index] = 1;
  return values;
}

function createInput(overrides = {}) {
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
    waveform: new Array(96).fill(0),
    ...overrides,
  };
}

function createFrame(context, input) {
  return {
    compact: false,
    context,
    deltaMs: 40,
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
  };
}

function createCanvasContext(width, height) {
  const beziers = [];
  const calls = { fill: 0, stroke: 0 };
  return {
    beziers,
    calls,
    canvas: { height, width },
    beginPath() {},
    bezierCurveTo(...points) {
      beziers.push(points);
    },
    clearRect() {},
    closePath() {},
    fill() {
      calls.fill += 1;
    },
    moveTo() {},
    restore() {},
    save() {},
    setTransform() {},
    stroke() {
      calls.stroke += 1;
    },
  };
}
