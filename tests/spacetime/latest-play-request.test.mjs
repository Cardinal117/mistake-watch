import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = process.cwd();

function loadCoordinator() {
  const relative = "lib/spacetime/live-room/latest-play-request.ts";
  const mod = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path.join(root, relative), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: relative,
    }).outputText,
    { module: mod, exports: mod.exports },
  );
  return mod.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

const { commitLatestPlayAdmission, createLatestPlayRequestCoordinator } =
  loadCoordinator();

test("only the latest out-of-order uploaded admission may commit", async () => {
  const coordinator = createLatestPlayRequestCoordinator();
  const admissionA = deferred();
  const admissionB = deferred();
  const committed = [];

  const pendingA = commitLatestPlayAdmission(
    coordinator.begin(),
    admissionA.promise,
    (source) => committed.push(source),
  );
  const pendingB = commitLatestPlayAdmission(
    coordinator.begin(),
    admissionB.promise,
    (source) => committed.push(source),
  );

  admissionB.resolve("session:B");
  assert.equal(await pendingB, true);
  admissionA.resolve("session:A");
  assert.equal(await pendingA, false);
  assert.deepEqual(committed, ["session:B"]);
});

test("permission loss and invalidation reject a completed admission", async () => {
  const coordinator = createLatestPlayRequestCoordinator();
  let allowed = true;
  const admission = deferred();
  const committed = [];
  const pending = commitLatestPlayAdmission(
    coordinator.begin(() => allowed),
    admission.promise,
    (source) => committed.push(source),
  );

  allowed = false;
  admission.resolve("session:revoked");
  assert.equal(await pending, false);
  assert.deepEqual(committed, []);

  const invalidated = coordinator.begin();
  coordinator.invalidate();
  assert.equal(invalidated.isCurrent(), false);

  const unmounted = coordinator.begin();
  coordinator.dispose();
  assert.equal(unmounted.isCurrent(), false);
});

test("disconnect and reconnect cannot revive an older request", async () => {
  const coordinator = createLatestPlayRequestCoordinator();
  let connected = true;
  const admission = deferred();
  const request = coordinator.begin(() => connected);
  const committed = [];
  const pending = commitLatestPlayAdmission(
    request,
    admission.promise,
    (source) => committed.push(source),
  );

  connected = false;
  coordinator.invalidate();
  connected = true;
  admission.resolve("session:old-connection");

  assert.equal(await pending, false);
  assert.deepEqual(committed, []);
});

test("a stale admission rejection does not surface an error", async () => {
  const coordinator = createLatestPlayRequestCoordinator();
  const admission = deferred();
  const request = coordinator.begin();
  const errors = [];
  const pending = commitLatestPlayAdmission(
    request,
    admission.promise,
    () => {},
  ).catch((error) => {
    if (request.isCurrent()) errors.push(error.message);
  });

  coordinator.begin();
  admission.reject(new Error("stale admission failed"));
  await pending;
  assert.deepEqual(errors, []);
});

test("catalogue and live-room bindings carry the same request identity", () => {
  const actions = readFileSync(
    path.join(root, "components/room/watch/browse/use-watch-media-actions.ts"),
    "utf8",
  );
  const liveRoom = readFileSync(
    path.join(root, "lib/spacetime/use-live-room.ts"),
    "utf8",
  );
  const liveRequestHook = readFileSync(
    path.join(root, "lib/spacetime/live-room/use-latest-play-request.ts"),
    "utf8",
  );

  assert.match(
    actions,
    /playQueueItemNow\(item\.id,\s*\{\s*isCurrent:\s*\(\)\s*=>\s*playCoordinator\.isCurrent\(requestGeneration\)/,
  );
  assert.match(liveRoom, /commitLatestPlayAdmission\(\s*request,/);
  assert.match(
    liveRoom,
    /function loadMediaSource[\s\S]*?latestPlayRequest\.invalidate\(\)/,
  );
  assert.match(
    liveRoom,
    /authorized:\s*connectionStatus === "connected" && canControlPlayback/,
  );
  assert.match(
    liveRequestHook,
    /previous\.authorized !== nextState\.authorized[\s\S]*coordinator\.current\.invalidate\(\)/,
  );
  assert.match(
    liveRoom,
    /catch \(error\)[\s\S]*?if \(request\.isCurrent\(\)\)[\s\S]*?setErrorMessage/,
  );
});
