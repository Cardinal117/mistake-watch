import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { matchRecording } = await loadRecommendationModule(
  "automatic-identity.ts",
);
const { normalizeAudio, normalizeTrackTags } = await loadRecommendationModule(
  "enrichment-evidence.ts",
);
const { runEnrichmentBatch } = await loadRecommendationModule(
  "automatic-enrichment.ts",
);
const now = 1800000000000;
const id = "311c0000-0000-4000-8000-000000000011";
const source = {
  mediaId: "abcdefghijk",
  title: "Ivory Tower (feat. Singer)",
  channel: "Composer - Topic",
  durationSeconds: 178,
  expiresAt: now + 86400000,
};
const core = {
  mbid: id,
  title: "Ivory Tower",
  artistCredit: "Composer feat. Singer",
  disambiguation: "",
  lengthMs: 177802,
};
test("Indic combining marks distinguish different recording titles", () => {
  assert.equal(
    matchRecording(
      { ...source, title: "कि", channel: "Composer - Topic" },
      [{ ...core, title: "क", artistCredit: "Composer" }],
      true,
      now,
    ).status,
    "unresolved",
  );
});
test("Last.fm explicit conflicting recording ID or duration invalidates same-name tags", () => {
  const track = {
    name: core.title,
    artist: { name: core.artistCredit },
    toptags: { tag: [{ name: "rock" }] },
  };
  assert.equal(
    normalizeTrackTags(
      { track: { ...track, mbid: id.replace(/11$/, "12") } },
      core,
    ),
    null,
  );
  assert.equal(
    normalizeTrackTags({ track: { ...track, duration: "999000" } }, core),
    null,
  );
});
test("unconfigured optional provider does not poison cache after configuration", async () => {
  let enabled = false;
  const providers = {
    search: async () => ({
      status: "ready",
      candidates: [core],
      complete: true,
    }),
    tags: async () =>
      enabled ? { status: "ready", data: ["rock"] } : { status: "disabled" },
    audio: async () => ({ status: "missing" }),
  };
  const options = {
    providers,
    cache: new Map(),
    now: () => now,
    sleep: async () => {},
    maxItems: 1,
    deadline: now + 60000,
  };
  await runEnrichmentBatch([source], options);
  enabled = true;
  assert.equal(
    (await runEnrichmentBatch([source], options))[0].tags.status,
    "ready",
  );
});
test("cached enrichment retains its own expiry and cannot outlive that evidence", async () => {
  let clock = now;
  const cache = new Map();
  const providers = {
    search: async () => ({
      status: "ready",
      candidates: [core],
      complete: true,
    }),
    tags: async () => ({ status: "ready", data: ["tag"] }),
    audio: async () => ({ status: "missing" }),
  };
  const opts = {
    now: () => clock,
    sleep: async () => {},
    cache,
    providers,
    maxItems: 1,
    deadline: now + 60000,
  };
  const a = await runEnrichmentBatch([source], opts);
  assert.equal(a[0].provenance.tags.fetchedAt, now);
  clock += 1000;
  const b = await runEnrichmentBatch(
    [{ ...source, mediaId: "another", expiresAt: source.expiresAt + 50000 }],
    opts,
  );
  assert.equal(b[0].provenance.tags.fetchedAt, now);
  assert.equal(b[0].provenance.tags.expiresAt, source.expiresAt);
  assert.equal(b[0].expiresAt, source.expiresAt);
});
test("exact identity requires featured artist, version and duration, never search score", () => {
  assert.equal(matchRecording(source, [core], true, now).status, "provisional");
  for (const change of [
    { artistCredit: "Composer" },
    { title: "Ivory Tower (Orchestra Version)" },
    { disambiguation: "instrumental" },
    { lengthMs: null },
    { lengthMs: 0 },
    { artistCredit: "Other Composer feat. Singer" },
  ])
    assert.equal(
      matchRecording(source, [{ ...core, ...change }], true, now).status,
      "unresolved",
    );
  assert.equal(
    matchRecording(
      { ...source, channel: "Composer Fan Uploads" },
      [core],
      true,
      now,
    ).status,
    "unresolved",
  );
  assert.equal(
    matchRecording({ ...source, expiresAt: now }, [core], true, now).status,
    "unresolved",
  );
  assert.equal(matchRecording(source, [core], false, now).status, "unresolved");
});
test("duplicate releases cannot hide ambiguity or contradictory identity", () => {
  assert.equal(
    matchRecording(source, [core, core], true, now).status,
    "provisional",
  );
  assert.equal(
    matchRecording(
      source,
      [core, { ...core, mbid: id.replace(/11$/, "12") }],
      true,
      now,
    ).status,
    "unresolved",
  );
  assert.equal(
    matchRecording(source, [core, { ...core, lengthMs: 999999 }], true, now)
      .status,
    "unresolved",
  );
});
test("title punctuation is normalized but diacritics and version words survive", () => {
  const s = {
    ...source,
    title: "Für Elise (Epic Trailer Version)",
    channel: "Composer - Topic",
  };
  const c = { ...core, title: s.title, artistCredit: "Composer" };
  assert.equal(matchRecording(s, [c], true, now).status, "provisional");
  assert.equal(
    matchRecording(s, [{ ...c, title: "Fur Elise" }], true, now).status,
    "unresolved",
  );
});
test("audio normalization keeps model namespace and winning-class semantics; rejects bad duration/scores", () => {
  const body = {
    metadata: {
      audio_properties: { length: 178 },
      version: { extractor: "test" },
    },
    rhythm: { bpm: 120 },
    tonal: { key_key: "C", key_scale: "minor" },
    highlevel: {
      mood_happy: {
        value: "not_happy",
        probability: 0.9,
        all: { happy: 0.1, not_happy: 0.9 },
        version: { model: "v1" },
      },
    },
  };
  const result = normalizeAudio(body, body, 178);
  assert.equal(result.bpm, 120);
  assert.equal(result.classifiers.mood_happy.all.happy, 0.1);
  assert.equal(result.classifiers.mood_sad, undefined);
  assert.equal(normalizeAudio(body, body, 999), null);
  assert.equal(
    normalizeAudio(
      body,
      {
        ...body,
        highlevel: {
          mood_happy: { ...body.highlevel.mood_happy, probability: 2 },
        },
      },
      178,
    ),
    null,
  );
});
test("Last.fm mismatched track identity cannot contribute tags", () => {
  assert.equal(
    normalizeTrackTags(
      {
        track: {
          name: "Wrong",
          artist: { name: core.artistCredit },
          toptags: { tag: [{ name: "rock" }] },
        },
      },
      core,
    ),
    null,
  );
  assert.deepEqual(
    normalizeTrackTags(
      {
        track: {
          name: core.title,
          artist: { name: core.artistCredit },
          toptags: { tag: [{ name: "Rock" }, { name: "Rock" }] },
        },
      },
      core,
    ),
    ["Rock"],
  );
});
test("batch caches fresh evidence, isolates provider failures and skips stale inputs", async () => {
  let calls = 0;
  const cache = new Map();
  const providers = {
    search: async () => {
      calls++;
      return { status: "ready", candidates: [core], complete: true };
    },
    tags: async () => {
      throw Error("offline");
    },
    audio: async () => ({ status: "missing" }),
  };
  const options = {
    now: () => now,
    sleep: async () => {},
    cache,
    providers,
    maxItems: 5,
    deadline: now + 60000,
  };
  const first = await runEnrichmentBatch(
    [source, { ...source, mediaId: "stale", expiresAt: now }],
    options,
  );
  assert.equal(first[0].identity.status, "provisional");
  assert.equal(first[0].tags.status, "retry");
  assert.equal(first[0].audio.status, "missing");
  assert.equal(first[1].identity.status, "unresolved");
  await runEnrichmentBatch([source], options);
  assert.equal(calls, 1);
  await runEnrichmentBatch([{ ...source, title: "Changed" }], options);
  assert.equal(calls, 2);
});
test("unresolved identity makes no enrichment calls; expiry during provider work invalidates result", async () => {
  let clock = now,
    enrich = 0;
  const providers = {
    search: async () => {
      clock = source.expiresAt;
      return { status: "ready", candidates: [core], complete: true };
    },
    tags: async () => {
      enrich++;
      return { status: "missing" };
    },
    audio: async () => {
      enrich++;
      return { status: "missing" };
    },
  };
  const rows = await runEnrichmentBatch([source], {
    now: () => clock,
    sleep: async () => {},
    cache: new Map(),
    providers,
    maxItems: 1,
    deadline: now + 60000,
  });
  assert.equal(rows[0].identity.status, "unresolved");
  assert.equal(enrich, 0);
});
