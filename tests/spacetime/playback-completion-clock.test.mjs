import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync("spacetime/src/recommendation-policy.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const { sessionCompletionRatioBps, classifyPlaybackAdvance } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function session(patch = {}) {
  return {
    position_seconds: 0.04,
    server_updated_ms: 100n,
    status: "playing",
    source_duration_seconds: 178,
    ...patch,
  };
}

test("projects the server clock anchor through a full song without a final playhead update", () => {
  const ratio = sessionCompletionRatioBps(session(), 178100n);
  assert.equal(ratio, 10000);
  assert.deepEqual(classifyPlaybackAdvance({ autoplay: true, completionRatioBps: ratio, playbackStatus: "playing" }), {
    outcome: "completed", reason: "ended_autoplay",
  });
  assert.equal(sessionCompletionRatioBps(session(), 100n), 2);
});

test("paused, buffering, ended and error states never accumulate wall-clock playback", () => {
  for (const status of ["paused", "buffering", "ended", "error"]) {
    assert.equal(sessionCompletionRatioBps(session({ status, position_seconds: 89 }), 900000n), 5000, status);
  }
});

test("a future clock anchor cannot subtract playback or create a negative ratio", () => {
  assert.equal(sessionCompletionRatioBps(session({ position_seconds: 89 }), 0n), 5000);
  assert.equal(sessionCompletionRatioBps(session({ position_seconds: 0 }), 0), 0);
});

test("projects positive playback rates and caps the completion ratio", () => {
  const anchor = session({ position_seconds: 0, source_duration_seconds: 100 });
  assert.equal(sessionCompletionRatioBps(anchor, 50100), 5000);
  assert.equal(sessionCompletionRatioBps({ ...anchor, playback_rate: 0.5 }, 50100n), 2500);
  assert.equal(sessionCompletionRatioBps({ ...anchor, playback_rate: 2 }, 50100n), 10000);
  assert.equal(sessionCompletionRatioBps({ ...anchor, playback_rate: 2 }, 900000n), 10000);
});

test("invalid rates or nonfinite clocks do not infer extra playback", () => {
  for (const playback_rate of [0, -1, NaN, Infinity]) {
    assert.equal(sessionCompletionRatioBps(session({ position_seconds: 89, playback_rate }), 900000n), 5000);
  }
  for (const atMs of [NaN, Infinity]) {
    assert.equal(sessionCompletionRatioBps(session({ position_seconds: 89 }), atMs), 5000);
  }
});

test("unknown duration does not manufacture completion for a still-playing source", () => {
  for (const source_duration_seconds of [undefined, 0, -1]) {
    const ratio = sessionCompletionRatioBps(session({ source_duration_seconds }), 900000n);
    assert.equal(ratio, undefined);
    assert.equal(classifyPlaybackAdvance({ autoplay: true, completionRatioBps: ratio, playbackStatus: "playing" }).outcome, "skipped");
  }
});

test("manual next remains skipped even after full projected playback or an ended status", () => {
  for (const playbackStatus of ["playing", "ended"]) {
    assert.deepEqual(classifyPlaybackAdvance({
      autoplay: false,
      completionRatioBps: sessionCompletionRatioBps(session(), 900000n),
      playbackStatus,
    }), { outcome: "skipped", reason: "manual_next" });
  }
});

test("autoplay preserves the 90 percent boundary and explicit ended policy", () => {
  const anchor = session({ position_seconds: 0, source_duration_seconds: 100 });
  for (const [atMs, outcome] of [[90080, "skipped"], [90100, "completed"]]) {
    assert.equal(classifyPlaybackAdvance({ autoplay: true, completionRatioBps: sessionCompletionRatioBps(anchor, atMs), playbackStatus: "playing" }).outcome, outcome);
  }
  assert.equal(classifyPlaybackAdvance({ autoplay: true, completionRatioBps: undefined, playbackStatus: "ended" }).outcome, "completed");
});
