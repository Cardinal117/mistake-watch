import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempDir = await mkdtemp(path.join(tmpdir(), "mw-discovery-refresh-"));
const sourcePath = path.join(
  rootDir,
  "lib/recommendations/discovery-refresh-coordinator.ts",
);
const outputPath = path.join(tempDir, "discovery-refresh-coordinator.mjs");

test.before(async () => {
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);
});

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

async function loadCoordinator() {
  return import(`${pathToFileURL(outputPath).href}?run=${Math.random()}`);
}

test("inactive refreshes wait and coalesce until activation", async () => {
  const { createDiscoveryRefreshCoordinator } = await loadCoordinator();
  let runs = 0;
  const coordinator = createDiscoveryRefreshCoordinator(async () => {
    runs += 1;
  });

  await Promise.all([coordinator.request(), coordinator.request()]);
  assert.equal(runs, 0);
  assert.equal(coordinator.hasQueued(), true);

  await coordinator.setActive(true);
  assert.equal(runs, 1);
  assert.equal(coordinator.hasQueued(), false);
});

test("active refresh bursts share one read without a redundant follow-up", async () => {
  const { createDiscoveryRefreshCoordinator } = await loadCoordinator();
  const releases = [];
  let runs = 0;
  const coordinator = createDiscoveryRefreshCoordinator(
    () =>
      new Promise((resolve) => {
        runs += 1;
        releases.push(resolve);
      }),
  );
  await coordinator.setActive(true);

  const first = coordinator.request();
  const burst = [
    coordinator.request(),
    coordinator.request(),
    coordinator.request(),
  ];
  assert.equal(runs, 1);
  releases.shift()();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));
  const observedRuns = runs;
  releases.shift()?.();
  await Promise.all(burst);
  await coordinator.whenIdle();
  assert.equal(observedRuns, 1);
});

test("an active invalidation during a read retains exactly one follow-up", async () => {
  const { createDiscoveryRefreshCoordinator } = await loadCoordinator();
  const releases = [];
  let runs = 0;
  const coordinator = createDiscoveryRefreshCoordinator(
    () =>
      new Promise((resolve) => {
        runs += 1;
        releases.push(resolve);
      }),
  );
  await coordinator.setActive(true);
  const first = coordinator.request();
  const invalidations = [
    coordinator.invalidate(),
    coordinator.invalidate(),
    coordinator.invalidate(),
  ];
  assert.equal(runs, 1);
  releases.shift()();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(runs, 2);
  releases.shift()();
  await Promise.all(invalidations);
  await coordinator.whenIdle();
  assert.equal(runs, 2);
});

test("queued work stays paused after deactivation and resumes once", async () => {
  const { createDiscoveryRefreshCoordinator } = await loadCoordinator();
  const releases = [];
  let runs = 0;
  const coordinator = createDiscoveryRefreshCoordinator(
    () =>
      new Promise((resolve) => {
        runs += 1;
        releases.push(resolve);
      }),
  );
  await coordinator.setActive(true);
  const first = coordinator.request();
  void coordinator.invalidate();
  await coordinator.setActive(false);
  releases.shift()();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(runs, 1);
  assert.equal(coordinator.hasQueued(), true);

  const resumed = coordinator.setActive(true);
  assert.equal(runs, 2);
  releases.shift()();
  await resumed;
  await coordinator.whenIdle();
});

test("dispose prevents queued work from running", async () => {
  const { createDiscoveryRefreshCoordinator } = await loadCoordinator();
  let runs = 0;
  const coordinator = createDiscoveryRefreshCoordinator(async () => {
    runs += 1;
  });
  void coordinator.request();
  coordinator.dispose();
  await coordinator.setActive(true);
  assert.equal(runs, 0);
});
