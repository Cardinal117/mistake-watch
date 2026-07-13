import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { createQueueFixture } from "../tests/queue/fixtures.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-queue-benchmark-"));
const sourcePath = path.join(rootDir, "lib/queue/derived.ts");
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "derived.mjs");

await mkdir(path.dirname(modulePath), { recursive: true });
await writeFile(modulePath, output);

const { deriveQueueState } = await import(pathToFileURL(modulePath));
const fixtureSize = Number.parseInt(process.env.QUEUE_BENCHMARK_SIZE ?? "250", 10);
const sampleCount = Number.parseInt(process.env.QUEUE_BENCHMARK_SAMPLES ?? "25", 10);
const iterationsPerSample = Number.parseInt(
  process.env.QUEUE_BENCHMARK_ITERATIONS ?? "500",
  10,
);
const items = createQueueFixture(fixtureSize);

try {
  const legacy = benchmark(() => deriveLegacyQueueRenderState(items));
  const optimized = benchmark(() => deriveQueueState(items));
  const improvement =
    ((legacy.p75Ms - optimized.p75Ms) / legacy.p75Ms) * 100;

  console.log(
    JSON.stringify(
      {
        deviceProfile: "Node.js local CPU; no network throttling",
        fixtureSize,
        iterationsPerSample,
        metric: "queue derivation plus row index lookup",
        optimized,
        preChange: legacy,
        sampleCount,
        p75ImprovementPercent: round(improvement),
      },
      null,
      2,
    ),
  );

  if (improvement < 40) {
    process.exitCode = 1;
  }
} finally {
  await rm(tempDir, { force: true, recursive: true });
}

function benchmark(callback) {
  for (let index = 0; index < 5; index += 1) {
    callback();
  }

  const samples = [];

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const startedAt = performance.now();

    for (let iteration = 0; iteration < iterationsPerSample; iteration += 1) {
      callback();
    }

    samples.push(performance.now() - startedAt);
  }

  samples.sort((first, second) => first - second);

  return {
    medianMs: round(percentile(samples, 0.5)),
    p75Ms: round(percentile(samples, 0.75)),
  };
}

function deriveLegacyQueueRenderState(items) {
  const queuedItems = items.filter((item) => item.status === "queued");
  const previousItems = items
    .filter((item) => item.status === "played")
    .sort((first, second) =>
      (first.playedSequence ?? 0) - (second.playedSequence ?? 0),
    );
  const upcomingItems = items.filter((item) => item.status !== "played");
  const currentItem = items.find((item) => item.status === "now") ?? null;
  const historyItems = items.filter((item) => item.status === "played");
  const queuedIndexes = upcomingItems.map((item) =>
    queuedItems.findIndex((queuedItem) => queuedItem.id === item.id),
  );

  return {
    currentItem,
    historyItems,
    previousItems,
    queuedIndexes,
    queuedItems,
    upcomingItems,
  };
}

function percentile(samples, ratio) {
  return samples[Math.min(samples.length - 1, Math.floor(samples.length * ratio))];
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
