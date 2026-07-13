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
  path.join(tmpdir(), "mistake-watch-metadata-scheduler-"),
);

async function transpileModule(relativePath, outputName) {
  const sourcePath = path.join(rootDir, relativePath);
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const modulePath = path.join(tempDir, outputName);

  await writeFile(modulePath, output);

  return import(pathToFileURL(modulePath));
}

const { BoundedMetadataScheduler } = await transpileModule(
  "lib/queue/metadata-scheduler.ts",
  "metadata-scheduler.mjs",
);
const { INITIAL_QUEUE_METADATA_COUNT, getQueueMetadataPriority } =
  await transpileModule(
    "lib/queue/metadata-priority.ts",
    "metadata-priority.mjs",
  );

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

function createDeferred() {
  let reject;
  let resolve;
  const promise = new Promise((promiseResolve, promiseReject) => {
    reject = promiseReject;
    resolve = promiseResolve;
  });

  return { promise, reject, resolve };
}

function flushTasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("a 250-item queue starts only the first ten and never exceeds three active requests", async () => {
  const scheduler = new BoundedMetadataScheduler(3);
  const gates = Array.from({ length: INITIAL_QUEUE_METADATA_COUNT }, () =>
    createDeferred(),
  );
  const started = [];
  let active = 0;
  let maxActive = 0;

  const requests = gates.map((gate, index) =>
    scheduler.schedule({
      key: `video-${index}`,
      priority: getQueueMetadataPriority({
        itemIndex: index,
        queuedIndex: index,
      }),
      run: async () => {
        started.push(index);
        active += 1;
        maxActive = Math.max(maxActive, active);
        const value = await gate.promise;
        active -= 1;
        return value;
      },
    }),
  );

  await flushTasks();

  assert.equal(requests.length, 10);
  assert.deepEqual(started, [0, 1, 2]);
  assert.deepEqual(scheduler.getSnapshot(), {
    activeCount: 3,
    jobCount: 10,
    queuedCount: 7,
  });

  gates.forEach((gate, index) => gate.resolve(index));
  assert.deepEqual(await Promise.all(requests), [...Array(10).keys()]);
  assert.equal(maxActive, 3);
  assert.equal(started.length, 10);
});

test("queued work is deduplicated and promoted when a higher-priority subscriber arrives", async () => {
  const scheduler = new BoundedMetadataScheduler(1);
  const blocker = createDeferred();
  const order = [];
  let deduplicatedRuns = 0;
  const blockerRequest = scheduler.schedule({
    key: "blocker",
    priority: 0,
    run: () => blocker.promise,
  });

  await flushTasks();

  const firstSharedRequest = scheduler.schedule({
    key: "shared",
    priority: 500,
    run: async () => {
      deduplicatedRuns += 1;
      order.push("shared");
      return "shared-result";
    },
  });
  const backgroundRequest = scheduler.schedule({
    key: "background",
    priority: 50,
    run: async () => {
      order.push("background");
      return "background-result";
    },
  });
  const promotedSharedRequest = scheduler.schedule({
    key: "shared",
    priority: 1,
    run: async () => "must-not-run",
  });

  blocker.resolve("released");

  assert.equal(await blockerRequest, "released");
  assert.deepEqual(
    await Promise.all([
      firstSharedRequest,
      promotedSharedRequest,
      backgroundRequest,
    ]),
    ["shared-result", "shared-result", "background-result"],
  );
  assert.deepEqual(order, ["shared", "background"]);
  assert.equal(deduplicatedRuns, 1);
});

test("aborted subscribers reject and cannot apply stale active results", async () => {
  const scheduler = new BoundedMetadataScheduler(1);
  const gate = createDeferred();
  const controller = new AbortController();
  let applied = false;
  const request = scheduler
    .schedule({
      key: "stale",
      priority: 0,
      run: () => gate.promise,
      signal: controller.signal,
    })
    .then(() => {
      applied = true;
    });

  await flushTasks();
  controller.abort();

  await assert.rejects(request, { name: "AbortError" });
  gate.resolve("late-result");
  await flushTasks();

  assert.equal(applied, false);
  assert.deepEqual(scheduler.getSnapshot(), {
    activeCount: 0,
    jobCount: 0,
    queuedCount: 0,
  });
});

test("queued jobs with no remaining subscribers are cancelled before provider work starts", async () => {
  const scheduler = new BoundedMetadataScheduler(1);
  const blocker = createDeferred();
  const controller = new AbortController();
  let cancelledJobStarted = false;
  const blockerRequest = scheduler.schedule({
    key: "blocker",
    priority: 0,
    run: () => blocker.promise,
  });

  await flushTasks();

  const cancelledRequest = scheduler.schedule({
    key: "cancelled",
    priority: 1,
    run: async () => {
      cancelledJobStarted = true;
      return "unexpected";
    },
    signal: controller.signal,
  });

  controller.abort();
  await assert.rejects(cancelledRequest, { name: "AbortError" });
  blocker.resolve("released");
  await blockerRequest;
  await flushTasks();

  assert.equal(cancelledJobStarted, false);
});

test("provider failures reject all deduplicated subscribers without automatic retries", async () => {
  const scheduler = new BoundedMetadataScheduler(3);
  let providerCalls = 0;
  const run = async () => {
    providerCalls += 1;
    throw new Error("provider unavailable");
  };
  const first = scheduler.schedule({
    key: "failed-video",
    priority: 0,
    run,
  });
  const second = scheduler.schedule({
    key: "failed-video",
    priority: 1,
    run,
  });

  await assert.rejects(first, /provider unavailable/);
  await assert.rejects(second, /provider unavailable/);
  assert.equal(providerCalls, 1);
});

test("priority order keeps current, next, initial, visible, and overscan work ahead of background", () => {
  const current = getQueueMetadataPriority({
    current: true,
    itemIndex: 40,
    queuedIndex: 40,
  });
  const next = getQueueMetadataPriority({ itemIndex: 0, queuedIndex: 0 });
  const initial = getQueueMetadataPriority({ itemIndex: 5, queuedIndex: 5 });
  const visible = getQueueMetadataPriority({
    firstVisibleIndex: 20,
    itemIndex: 22,
    overscanEndIndex: 30,
    overscanStartIndex: 16,
    queuedIndex: 22,
    visibleEndIndex: 26,
  });
  const overscan = getQueueMetadataPriority({
    firstVisibleIndex: 20,
    itemIndex: 18,
    overscanEndIndex: 30,
    overscanStartIndex: 16,
    queuedIndex: 18,
    visibleEndIndex: 26,
  });
  const background = getQueueMetadataPriority({
    itemIndex: 80,
    queuedIndex: 80,
  });

  assert.ok(current < next);
  assert.ok(next < initial);
  assert.ok(initial < visible);
  assert.ok(visible < overscan);
  assert.ok(overscan < background);
});

test("queue integration uses progressive batches, shared cache reuse, and row priorities", async () => {
  const [
    listenHooksSource,
    listenQueueRowSource,
    metadataClientSource,
    nextPreparationSource,
    queueSchedulerSource,
  ] =
    await Promise.all([
      readFile(path.join(rootDir, "components/room/listen/hooks/listen-hooks.ts"), "utf8"),
      readFile(path.join(rootDir, "components/room/listen/queue/queue-row.tsx"), "utf8"),
      readFile(path.join(rootDir, "lib/youtube/metadata-client.ts"), "utf8"),
      readFile(
        path.join(rootDir, "lib/player/next-item-preparation.ts"),
        "utf8",
      ),
      readFile(
        path.join(rootDir, "lib/youtube/queue-metadata-scheduler.ts"),
        "utf8",
      ),
    ]);
  const durationHookSource = listenHooksSource.slice(
    listenHooksSource.indexOf("function useRemainingQueueSeconds"),
    listenHooksSource.indexOf("function toSmartShuffleItem"),
  );

  assert.match(
    durationHookSource,
    /queuedIndex < INITIAL_QUEUE_METADATA_COUNT/,
  );
  assert.match(durationHookSource, /Promise\.allSettled\(/);
  assert.doesNotMatch(durationHookSource, /Promise\.all\(/);
  assert.match(listenQueueRowSource, /queuePriority: metadataPriority/);
  assert.match(queueSchedulerSource, /MAX_QUEUE_METADATA_CONCURRENCY = 3/);
  assert.match(queueSchedulerSource, /readCachedYouTubeMetadata\(input\)/);
  assert.match(metadataClientSource, /metadataCache\.set\(key, fallback\)/);
  assert.match(nextPreparationSource, /scheduleQueueYouTubeMetadata\(/);
  assert.doesNotMatch(
    nextPreparationSource,
    /api\/youtube\/metadata\?videoId/,
  );
});
