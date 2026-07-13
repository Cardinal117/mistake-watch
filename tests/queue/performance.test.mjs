import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempDir = await mkdtemp(path.join(tmpdir(), "mistake-watch-queue-performance-"));
const sourcePath = path.join(rootDir, "lib/performance/queue.ts");
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const modulePath = path.join(tempDir, "queue-performance.mjs");

await mkdir(path.dirname(modulePath), { recursive: true });
await writeFile(modulePath, output);

const {
  beginQueueMetadataRequest,
  getQueueMetadataPerformanceSnapshot,
  resetQueueMetadataPerformanceSnapshot,
} = await import(pathToFileURL(modulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test.beforeEach(() => {
  resetQueueMetadataPerformanceSnapshot();
});

test("queue metadata instrumentation records count active work and peak concurrency", () => {
  const finishFirst = beginQueueMetadataRequest({ client: "test" });
  const finishSecond = beginQueueMetadataRequest({ client: "test" });

  assert.deepEqual(getQueueMetadataPerformanceSnapshot(), {
    activeRequests: 2,
    peakConcurrency: 2,
    requestCount: 2,
  });

  finishFirst();
  finishFirst();
  assert.deepEqual(getQueueMetadataPerformanceSnapshot(), {
    activeRequests: 1,
    peakConcurrency: 2,
    requestCount: 2,
  });

  finishSecond();
  assert.deepEqual(getQueueMetadataPerformanceSnapshot(), {
    activeRequests: 0,
    peakConcurrency: 2,
    requestCount: 2,
  });
});

test("queue metadata instrumentation is inert in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const finish = beginQueueMetadataRequest({ client: "test" });
    finish();

    assert.deepEqual(getQueueMetadataPerformanceSnapshot(), {
      activeRequests: 0,
      peakConcurrency: 0,
      requestCount: 0,
    });
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
