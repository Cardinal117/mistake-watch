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
  path.join(tmpdir(), "mistake-watch-media-failure-"),
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

const failureModule = await transpileModule(
  "spacetime/src/media-failure.ts",
  "media-failure.mjs",
);
const circuitModule = await transpileModule(
  "lib/player/media-failure-circuit.ts",
  "media-failure-circuit.mjs",
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("only confirmed permanent failures qualify for unavailable marking", () => {
  assert.equal(
    failureModule.normalizeMediaFailure("removed-private").permanent,
    true,
  );
  assert.equal(
    failureModule.normalizeMediaFailure("embed-blocked").permanent,
    true,
  );
  assert.equal(
    failureModule.normalizeMediaFailure("player-error").permanent,
    false,
  );
  assert.equal(
    failureModule.normalizeMediaFailure("provider-unavailable").permanent,
    false,
  );
  assert.equal(
    failureModule.normalizeMediaFailure("unexpected").permanent,
    false,
  );
});

test("room events serialize normalized ids without private or signed URLs", () => {
  const privateUrl =
    "https://private.example/media.mp4?X-Amz-Signature=secret-token";
  const directEvent = failureModule.createMediaFailureEvent({
    actorMemberId: "member-1",
    canAdvance: false,
    failure: failureModule.normalizeMediaFailure("player-error"),
    queueItemId: "queue-safe-id",
    roomId: "room-a",
    sourceType: "direct",
    sourceUrl: privateUrl,
    title: "Private upload",
  });
  const youtubeEvent = failureModule.createMediaFailureEvent({
    actorMemberId: "member-1",
    canAdvance: true,
    failure: failureModule.normalizeMediaFailure("embed-blocked"),
    queueItemId: "queue-youtube",
    roomId: "room-a",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=abc123def45&token=secret",
    title: "Blocked video",
  });

  assert.equal(directEvent.providerId, "queue-safe-id");
  assert.equal(youtubeEvent.providerId, "abc123def45");
  assert.equal(youtubeEvent.eventType, "media-auto-skipped");
  assert.equal(youtubeEvent.actorSource, "system");
  assert.doesNotMatch(
    JSON.stringify(directEvent),
    /private\.example|Signature|secret-token/,
  );
  assert.doesNotMatch(JSON.stringify(youtubeEvent), /watch\?v=|token=secret/);
});

test("a 250-item failure sequence cannot silently drain the queue", () => {
  let timestamps = [];
  let permanentAdvances = 0;
  let genericAdvances = 0;

  for (let index = 0; index < 250; index += 1) {
    const generic = failureModule.normalizeMediaFailure("player-error");
    if (generic.permanent) {
      genericAdvances += 1;
    }

    const permanent = failureModule.normalizeMediaFailure("removed-private");
    const reservation = circuitModule.reserveRuntimeErrorAutoSkip(
      timestamps,
      1_000 + index,
    );
    timestamps = reservation.timestamps;

    if (permanent.permanent && reservation.allowed) {
      permanentAdvances += 1;
    }
  }

  assert.equal(genericAdvances, 0);
  assert.equal(permanentAdvances, 3);
  assert.equal(timestamps.length, 3);
});

test("the circuit breaker recovers after its bounded window", () => {
  let timestamps = [];

  for (let index = 0; index < 3; index += 1) {
    const reservation = circuitModule.reserveRuntimeErrorAutoSkip(
      timestamps,
      1_000 + index,
    );
    timestamps = reservation.timestamps;
    assert.equal(reservation.allowed, true);
  }

  assert.equal(
    circuitModule.reserveRuntimeErrorAutoSkip(timestamps, 2_000).allowed,
    false,
  );
  assert.equal(
    circuitModule.reserveRuntimeErrorAutoSkip(timestamps, 32_000).allowed,
    true,
  );
});

test("the room reducer is authority checked, stale safe, and propagates known problems", async () => {
  const source = await readFile(
    path.join(rootDir, "spacetime/src/index.ts"),
    "utf8",
  );
  const reducer = source.slice(
    source.indexOf("export const report_media_failure"),
    source.indexOf("export const play_queue_item"),
  );
  const addReducer = source.slice(
    source.indexOf("export const add_queue_item"),
    source.indexOf("export const send_room_chat_message"),
  );

  assert.match(reducer, /getAuthorizedPlaybackActor/);
  assert.match(reducer, /expectedSourceUrl !== activeSourceUrl/);
  assert.match(reducer, /active_queue_item_id !== expectedActiveQueueItemId/);
  assert.match(
    reducer,
    /Number\(failureCreatedMs - error\.created_ms\) < 5_000/,
  );
  assert.match(reducer, /createMediaFailureEvent/);
  assert.match(
    reducer,
    /is_unavailable: item\.is_unavailable \|\| failure\.permanent/,
  );
  assert.match(reducer, /failure\.permanent[\s\S]*allow_autoplay_advance/);
  assert.match(addReducer, /findKnownProblemQueueItem/);
  assert.match(
    addReducer,
    /is_unavailable: is_unavailable \|\| Boolean\(knownProblem\)/,
  );
});
