import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { evaluateIdentity } = await loadRecommendationModule(
  "identity-evaluation.ts",
);
const now = 1800000000000;
const mbid = "311c0000-0000-4000-8000-000000000011";
test("CLI never exposes malformed private JSON in errors", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "identity-evaluation-test-"));
  try {
    const file = path.join(dir, "input.json");
    await writeFile(file, "PRIVATE-LABEL-EVIDENCE invalid json");
    const result = spawnSync(
      process.execPath,
      ["scripts/evaluate-recording-matches.mjs", file],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(
      result.stderr + result.stdout,
      /PRIVATE-LABEL-EVIDENCE/,
    );
    assert.match(result.stderr, /Invalid evaluation JSON/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
function entry(id = "abcdefghijk") {
  return {
    source: {
      mediaId: id,
      title: "Song",
      channel: "Artist - Topic",
      durationSeconds: 100,
      expiresAt: now + 10000,
    },
    candidates: [
      {
        mbid,
        title: "Song",
        artistCredit: "Artist",
        disambiguation: "",
        lengthMs: 100000,
      },
    ],
    complete: true,
  };
}
test("unlabelled replay reports coverage without accuracy or promotion", () => {
  const result = evaluateIdentity({ now, cases: [entry()] });
  assert.equal(result.provisional, 1);
  assert.equal(result.independentPrecision, null);
  assert.equal(result.promotionAllowed, false);
});
test("synthetic labels never contribute to measured real-song precision", () => {
  const result = evaluateIdentity({
    now,
    kind: "synthetic",
    cases: [{ ...entry(), expectedMbid: mbid }],
  });
  assert.equal(result.correctProvisional, 1);
  assert.equal(result.independentPrecision, null);
  assert.equal(result.zeroErrorPrecisionLowerBound95, null);
});
test("independent labels require provenance and duplicate sources are rejected", () => {
  assert.throws(
    () =>
      evaluateIdentity({
        now,
        kind: "independent",
        cases: [{ ...entry(), expectedMbid: mbid }],
      }),
    /provenance/,
  );
  assert.throws(
    () => evaluateIdentity({ now, cases: [entry(), entry()] }),
    /Duplicate/,
  );
  assert.throws(
    () =>
      evaluateIdentity({ now, cases: [{ ...entry(), expectedMbid: mbid }] }),
    /Observational/,
  );
});
test("one independent correct provisional outcome has very weak confidence", () => {
  const result = evaluateIdentity({
    now,
    kind: "independent",
    cases: [
      {
        ...entry(),
        expectedMbid: mbid,
        labelEvidence:
          "Independent recording reference reviewed separately from matcher",
      },
    ],
  });
  assert.equal(result.independentPrecision, 1);
  assert.equal(result.zeroErrorPrecisionLowerBound95, 0.05);
  assert.equal(result.promotionAllowed, false);
});
test("wrong provisional identity is an error, correct abstention is separate", () => {
  const result = evaluateIdentity({
    now,
    kind: "synthetic",
    cases: [
      { ...entry(), expectedMbid: null },
      { ...entry("bcdefghijkl"), complete: false, expectedMbid: null },
      { ...entry("cdefghijklm"), complete: false, expectedMbid: mbid },
    ],
  });
  assert.equal(result.wrongProvisional, 1);
  assert.equal(result.correctAbstentions, 1);
  assert.equal(result.missedIdentities, 1);
});
test("malformed labels and candidate containers fail without private data in errors", () => {
  assert.throws(
    () =>
      evaluateIdentity({
        now,
        kind: "synthetic",
        cases: [{ ...entry(), expectedMbid: "secret-invalid" }],
      }),
    /^Error: Invalid label$/,
  );
  assert.throws(
    () => evaluateIdentity({ now, cases: [{ ...entry(), candidates: null }] }),
    /Invalid case/,
  );
});

test("version boundary benchmark distinguishes safeguards from unobservable collisions", () => {
  const cases = [];
  function add(title, artist, changes, expectedMbid = null) {
    const item = entry(String(cases.length).padStart(11, "0"));
    item.source.title = title;
    item.source.channel = artist + " - Topic";
    item.candidates[0] = {
      ...item.candidates[0],
      title,
      artistCredit: artist,
      ...changes,
    };
    cases.push({ ...item, expectedMbid });
  }
  add("Fantasy Suite", "Orchestra", {}, mbid);
  add("Fantasy Suite", "Orchestra", { title: "Fantasy Suite (Cover)" });
  add("Fantasy Suite", "Orchestra", { disambiguation: "live performance" });
  add("Symphony No. 5", "Conductor A", { artistCredit: "Conductor B" });
  add("Night Drive (Slowed)", "Producer", { title: "Night Drive" });
  add("Night Drive", "Producer", { lengthMs: 90000 });
  add("Song", "Artist", { title: "Song (Instrumental)" });
  add("Song", "Artist", { artistCredit: "Unrelated Artist" });
  // Known limitation: source and search omit all evidence of a different master.
  // Synthetic truth requires abstention, but metadata-only v1 cannot detect it.
  add("Unmarked Rerecording", "Artist", {});
  // Artist punctuation is also lossy under v1 normalization.
  add("Credit Collision", "A / B", { artistCredit: "A & B" });
  const result = evaluateIdentity({ now, kind: "synthetic", cases });
  assert.equal(result.total, 10);
  assert.equal(result.correctProvisional, 1);
  assert.equal(result.correctAbstentions, 7);
  assert.equal(result.wrongProvisional, 2);
  assert.equal(result.independentPrecision, null);
  assert.equal(result.promotionAllowed, false);
});
