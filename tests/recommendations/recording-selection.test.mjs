import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { selectRecordingTrial } = await loadRecommendationModule(
  "recording-selection.ts",
);
const now = 1800000000000;
const options = {
  accountId: "owner",
  now,
  limit: 8,
  strict: true,
  fixtures: true,
};
function candidate(id, patch = {}) {
  return {
    sourceId: id,
    recordingId: id,
    accountId: "owner",
    revision: 1,
    linkStatus: "accepted",
    exactVersion: true,
    available: true,
    suppressed: false,
    metadataExpiresAt: now + 1000,
    liked: false,
    plays: 0,
    lastPlayedAt: null,
    evidence: ["theme", "instrumentation"].map((facet) => ({
      id: `${id}-${facet}`,
      recordingId: id,
      accountId: "owner",
      facet,
      value: facet === "theme" ? "fantasy" : "orchestral",
      polarity: "supports",
      status: "accepted",
      origin: "synthetic",
      reference: `fixture:${id}`,
      license: "test-only",
      reviewedAt: now - 1000,
      expiresAt: now + 1000,
    })),
    ...patch,
  };
}
test("strict Fantasy/orchestral carries inspectable exact-version evidence", () => {
  assert.deepEqual(selectRecordingTrial([candidate("fantasy")], options), [
    {
      sourceId: "fantasy",
      recordingId: "fantasy",
      revision: 1,
      reason: "Supported Fantasy/orchestral classification",
      evidenceIds: ["fantasy-theme", "fantasy-instrumentation"],
    },
  ]);
});
test("owner evidence needs a real reference and private-use provenance", () => {
  const c = candidate("owner-entered");
  c.evidence.forEach((e) => {
    e.origin = "owner_reference";
    e.reference = "owner:confirmed-performance";
    e.license = "owner-authored-private";
  });
  assert.equal(
    selectRecordingTrial([c], { ...options, fixtures: false }).length,
    1,
  );
  c.evidence[0].reference = "owner: ";
  assert.deepEqual(
    selectRecordingTrial([c], { ...options, fixtures: false }),
    [],
  );
  c.evidence[0].reference = "owner:confirmed-performance";
  c.evidence[0].license = "unreviewed";
  assert.deepEqual(
    selectRecordingTrial([c], { ...options, fixtures: false }),
    [],
  );
});
test("favourites and rediscovery lead after eligibility, before limits", () => {
  const rows = [
    candidate("unknown", { linkStatus: "unresolved" }),
    candidate("new"),
    candidate("old", { plays: 2, lastPlayedAt: now - 8 * 86400000 }),
    candidate("liked", { liked: true }),
  ];
  assert.deepEqual(
    selectRecordingTrial(rows, { ...options, limit: 2 }).map((r) => r.sourceId),
    ["liked", "old"],
  );
});
test("Classical performance cannot inherit another recording's theme", () => {
  const c = candidate("performance-b");
  c.evidence[0].recordingId = "performance-a";
  assert.deepEqual(selectRecordingTrial([c], options), []);
});
test("phonk edit, cover and compilation unresolved links abstain", () => {
  assert.deepEqual(
    selectRecordingTrial(
      [
        candidate("sped", { exactVersion: false }),
        candidate("cover", { linkStatus: "disputed" }),
        candidate("compilation", { linkStatus: "unresolved" }),
      ],
      options,
    ),
    [],
  );
});
test("synthetic evidence is never production eligible", () => {
  assert.deepEqual(
    selectRecordingTrial([candidate("fixture")], {
      ...options,
      fixtures: false,
    }),
    [],
  );
});
test("contradiction outweighs repeated positive assertions", () => {
  const c = candidate("conflict");
  c.evidence.push({ ...c.evidence[0], id: "negative", polarity: "excludes" });
  assert.deepEqual(selectRecordingTrial([c], options), []);
});
for (const [label, change] of Object.entries({
  expired: (e) => (e.expiresAt = now),
  future: (e) => (e.reviewedAt = now + 1),
  disputed: (e) => (e.status = "disputed"),
  private: (e) => (e.accountId = "other"),
  license: (e) => (e.license = ""),
  reference: (e) => (e.reference = ""),
})) {
  test(`${label} evidence cannot prove strict eligibility`, () => {
    const c = candidate(label);
    change(c.evidence[0]);
    assert.deepEqual(selectRecordingTrial([c], options), []);
  });
}
test("genre alone never proves Fantasy theme", () => {
  const c = candidate("genre");
  c.evidence[0].facet = "genre";
  assert.deepEqual(selectRecordingTrial([c], options), []);
});
test("unavailable, expired, suppressed or other-account sources never appear", () => {
  for (const patch of [
    { available: false },
    { metadataExpiresAt: now },
    { suppressed: true },
    { accountId: "other" },
  ])
    assert.deepEqual(
      selectRecordingTrial([candidate("bad", patch)], options),
      [],
    );
});
test("distinct performances stay distinct and duplicates are excluded", () => {
  assert.deepEqual(
    selectRecordingTrial([candidate("a"), candidate("b")], options).map(
      (r) => r.recordingId,
    ),
    ["a", "b"],
  );
  assert.deepEqual(
    selectRecordingTrial([candidate("a"), candidate("a")], options),
    [],
  );
});
