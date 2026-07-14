import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateFileLengths,
  handwrittenFileCeiling,
  legacyFileCeilings,
} from "../../scripts/check-file-lengths.mjs";

test("file-length policy warns for review-sized files and rejects oversized new files", () => {
  const result = evaluateFileLengths([
    { path: "components/example/review.tsx", lines: 520 },
    {
      path: "components/example/oversized.tsx",
      lines: handwrittenFileCeiling + 1,
    },
  ]);

  assert.deepEqual(
    result.warnings.map((file) => file.path),
    ["components/example/review.tsx"],
  );
  assert.deepEqual(
    result.violations.map((file) => file.path),
    ["components/example/oversized.tsx"],
  );
});

test("legacy exceptions cannot grow past their recorded ceilings", () => {
  const [legacyPath, ceiling] = legacyFileCeilings.entries().next().value;
  const result = evaluateFileLengths([
    { path: legacyPath, lines: ceiling },
    { path: legacyPath, lines: ceiling + 1 },
  ]);

  assert.equal(result.warnings.length, 1);
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0].reason, /legacy ceiling/);
});

test("Batch 3 realtime entries cannot regrow past their reduced sizes", () => {
  assert.equal(legacyFileCeilings.get("lib/spacetime/use-live-room.ts"), 918);
  assert.equal(legacyFileCeilings.get("spacetime/src/index.ts"), 2_205);
});
