import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { createEnrichmentProviders } = await loadRecommendationModule(
  "enrichment-providers.ts",
);
const source = {
  mediaId: "abcdefghijk",
  title: "Song",
  channel: "Artist - Topic",
  durationSeconds: 100,
  expiresAt: 1900000000000,
};
const id = "311c0000-0000-4000-8000-000000000011";
const row = {
  id,
  title: "Song",
  length: 100000,
  "artist-credit": [{ name: "Artist" }],
};
test("provider Retry-After survives parsing for durable shared cooldown", async () => {
  const p = createEnrichmentProviders({
    fetcher: async () =>
      new Response("", { status: 503, headers: { "Retry-After": "600" } }),
  });
  assert.equal((await p.search(source)).retrySeconds, 600);
});
test("search requests only bounded metadata and parses compact recording evidence", async () => {
  const p = createEnrichmentProviders({
    fetcher: async (url, init) => {
      assert.equal(new URL(url).hostname, "musicbrainz.org");
      assert.equal(new URL(url).searchParams.get("limit"), "25");
      assert.equal(String(url).includes(source.mediaId), false);
      assert.equal(init.redirect, "error");
      return Response.json({ count: 1, offset: 0, recordings: [row] });
    },
  });
  assert.deepEqual(await p.search(source), {
    status: "ready",
    complete: true,
    candidates: [
      {
        mbid: id,
        title: "Song",
        lengthMs: 100000,
        artistCredit: "Artist",
        disambiguation: "",
      },
    ],
  });
});
test("truncated or malformed provider data never presents complete match evidence", async () => {
  const p = createEnrichmentProviders({
    fetcher: async () =>
      Response.json({ count: 26, offset: 0, recordings: [row] }),
  });
  assert.equal((await p.search(source)).complete, false);
  const bad = createEnrichmentProviders({
    fetcher: async () =>
      Response.json({
        count: 1,
        offset: 0,
        recordings: [{ ...row, "artist-credit": [] }],
      }),
  });
  assert.equal((await bad.search(source)).status, "invalid");
});
test("throttling stops further same-provider calls in the batch adapter", async () => {
  let calls = 0;
  const p = createEnrichmentProviders({
    fetcher: async () => {
      calls++;
      return new Response("", { status: 429 });
    },
  });
  assert.equal((await p.search(source)).status, "retry");
  await p.search(source);
  assert.equal(calls, 1);
});
test("missing Last.fm key performs no request and an oversized response is invalid", async () => {
  const p = createEnrichmentProviders({
    fetcher: async () => {
      throw Error("unexpected");
    },
  });
  assert.equal((await p.tags({})).status, "disabled");
  const large = createEnrichmentProviders({
    fetcher: async () =>
      new Response("{}", { headers: { "content-length": "99999999" } }),
  });
  assert.equal((await large.search(source)).status, "invalid");
});
