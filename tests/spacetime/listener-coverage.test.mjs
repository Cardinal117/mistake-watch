import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// The pre-feature baseline has no listener coverage and cannot qualify a receipt.
const path = "spacetime/src/listener-policy.ts";
const policy = existsSync(path)
  ? await import(
      `data:text/javascript;base64,${Buffer.from(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText).toString("base64")}`
    )
  : {
      qualifyingInterval: () => null,
      mergeCoverage: () => [],
      coverageRatio: () => 0,
    };
const { qualifyingInterval, mergeCoverage, coverageRatio } = policy;
const sample = (patch = {}) => ({
  atMs: 1000,
  position: 0,
  sequence: 1,
  anchorMs: 1000,
  audible: true,
  ...patch,
});
const context = {
  duration: 100,
  canonicalPosition: 10,
  rate: 1,
  playing: true,
  validFromMs: 0,
};

test("a real observed interval qualifies, while a first observation supplies no inherited coverage", () => {
  assert.deepEqual(
    qualifyingInterval(
      sample(),
      sample({ atMs: 11000, position: 10, sequence: 2 }),
      context,
    ),
    [0, 10],
  );
  assert.equal(
    qualifyingInterval(null, sample({ position: 80 }), context),
    null,
  );
});
test("pause, buffer, mute and zero volume are represented by nonaudible observations and cannot qualify either endpoint", () => {
  for (const [a, b] of [
    [false, true],
    [true, false],
    [false, false],
  ]) {
    assert.equal(
      qualifyingInterval(
        sample({ audible: a }),
        sample({ atMs: 11000, position: 10, sequence: 2, audible: b }),
        context,
      ),
      null,
    );
  }
  assert.equal(
    qualifyingInterval(
      sample(),
      sample({ atMs: 11000, position: 10, sequence: 2 }),
      { ...context, playing: false },
    ),
    null,
  );
});
test("rejects replayed sequences, clock reversal, long gaps, seeks, and canonical discontinuities", () => {
  for (const patch of [
    { sequence: 1 },
    { atMs: 999 },
    { atMs: 40000 },
    { position: 70 },
    { position: -1 },
    { anchorMs: 2000 },
  ]) {
    assert.equal(
      qualifyingInterval(
        sample(),
        sample({ atMs: 11000, position: 10, sequence: 2, ...patch }),
        context,
      ),
      null,
      JSON.stringify(patch),
    );
  }
  assert.equal(
    qualifyingInterval(
      sample(),
      sample({ atMs: 11000, position: 10, sequence: 2 }),
      { ...context, canonicalPosition: 80 },
    ),
    null,
  );
});
test("unknown duration, invalid rate and a pre-consent starting sample cannot qualify", () => {
  for (const patch of [
    { duration: undefined },
    { duration: 0 },
    { duration: Infinity },
    { rate: 0 },
    { validFromMs: 2000 },
  ]) {
    assert.equal(
      qualifyingInterval(
        sample(),
        sample({ atMs: 11000, position: 10, sequence: 2 }),
        { ...context, ...patch },
      ),
      null,
    );
  }
});
test("observed progress is constrained to server elapsed time at allowed rate", () => {
  assert.deepEqual(
    qualifyingInterval(
      sample(),
      sample({ atMs: 11000, position: 20, sequence: 2 }),
      { ...context, rate: 2, canonicalPosition: 20 },
    ),
    [0, 20],
  );
  assert.equal(
    qualifyingInterval(
      sample(),
      sample({ atMs: 11000, position: 20, sequence: 2 }),
      context,
    ),
    null,
  );
});
test("multi-device overlaps and replays union rather than sum, and gaps remain gaps", () => {
  const first = mergeCoverage(
    [
      [0, 40],
      [60, 80],
    ],
    [20, 70],
  );
  assert.deepEqual(first, [[0, 80]]);
  assert.equal(coverageRatio(first, 100), 8000);
  assert.deepEqual(mergeCoverage(first, [10, 20]), first);
  assert.equal(coverageRatio(mergeCoverage(first, [90, 100]), 100), 9000);
  assert.equal(
    coverageRatio(
      [
        [0, 40],
        [60, 80],
      ],
      100,
    ),
    6000,
  );
});
test("fragmentation is bounded without filling gaps", () => {
  const fragmented = Array.from({ length: 128 }, (_, i) => [i * 2, i * 2 + 1]);
  assert.deepEqual(mergeCoverage(fragmented, [300, 301]), fragmented);
});
