import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { recordingReference, lookupRecording } = await loadRecommendationModule(
  "musicbrainz-core.ts",
);
const id = "311c0000-0000-4000-8000-000000000011";
const data = {
  id,
  title: "Independent recording",
  disambiguation: "live performance",
  length: 123456,
  "artist-credit": [
    { name: "Artist A", joinphrase: " & " },
    { name: "Artist B", joinphrase: "" },
  ],
  tags: [{ name: "not imported" }],
};
test("only an explicit canonical HTTPS recording URL is accepted", () => {
  assert.equal(
    recordingReference(`https://musicbrainz.org/recording/${id}`),
    id,
  );
  for (const value of [
    `https://musicbrainz.org/work/${id}`,
    `http://musicbrainz.org/recording/${id}`,
    `https://musicbrainz.org.evil/recording/${id}`,
    `https://user@musicbrainz.org/recording/${id}`,
    `https://musicbrainz.org/recording/${id}?inc=tags`,
    id,
  ])
    assert.equal(recordingReference(value), null);
});
test("lookup sends only fixed recording identity and returns compact core fields", async () => {
  const result = await lookupRecording(id, async (url, init) => {
    assert.equal(
      url,
      `https://musicbrainz.org/ws/2/recording/${id}?inc=artist-credits&fmt=json`,
    );
    assert.equal(init.redirect, "error");
    assert.match(init.headers["User-Agent"], /^MistakeWatch\//);
    return Response.json(data);
  });
  assert.deepEqual(result, {
    status: "ready",
    core: {
      mbid: id,
      title: data.title,
      artistCredit: "Artist A & Artist B",
      disambiguation: data.disambiguation,
      lengthMs: 123456,
    },
  });
});
test("a different returned recording ID never silently relinks", async () =>
  assert.equal(
    (
      await lookupRecording(id, async () =>
        Response.json({ ...data, id: "311c0000-0000-4000-8000-000000000012" }),
      )
    ).status,
    "invalid",
  ));
test("not found and provider throttling have distinct outcomes", async () => {
  assert.equal(
    (await lookupRecording(id, async () => new Response(null, { status: 404 })))
      .status,
    "not_found",
  );
  assert.deepEqual(
    await lookupRecording(
      id,
      async () =>
        new Response(null, { status: 503, headers: { "Retry-After": "120" } }),
    ),
    { status: "retry", retrySeconds: 120 },
  );
});
test("invalid/oversized result never enters cache", async () => {
  for (const payload of [
    { ...data, length: -1 },
    { ...data, title: "" },
    { ...data, "artist-credit": [{ name: "X".repeat(201) }] },
  ])
    assert.equal(
      (await lookupRecording(id, async () => Response.json(payload))).status,
      "invalid",
    );
  assert.equal(
    (await lookupRecording(id, async () => new Response(" ".repeat(131073))))
      .status,
    "invalid",
  );
});
test("network failure retries without leaking exception text", async () =>
  assert.deepEqual(
    await lookupRecording(id, async () => {
      throw new Error("private credential");
    }),
    { status: "retry", retrySeconds: 60 },
  ));
