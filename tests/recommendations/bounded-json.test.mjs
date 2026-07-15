import assert from "node:assert/strict";
import test from "node:test";

import { loadRecommendationModule } from "./ranking-test-helpers.mjs";

const { readBoundedJson } = await loadRecommendationModule("bounded-json.ts");

test("bounded JSON accepts a valid request within its byte budget", async () => {
  const result = await readBoundedJson(
    new Request("http://localhost/test", {
      body: JSON.stringify({ roomId: "fixture" }),
      method: "POST",
    }),
    128,
  );

  assert.deepEqual(result, { ok: true, value: { roomId: "fixture" } });
});

test("bounded JSON rejects oversized streamed bodies without trusting headers", async () => {
  const result = await readBoundedJson(
    new Request("http://localhost/test", {
      body: JSON.stringify({ payload: "x".repeat(256) }),
      method: "POST",
    }),
    64,
  );

  assert.deepEqual(result, { ok: false, reason: "too-large" });
});

test("bounded JSON rejects malformed input", async () => {
  const result = await readBoundedJson(
    new Request("http://localhost/test", {
      body: "{not-json",
      method: "POST",
    }),
    64,
  );

  assert.deepEqual(result, { ok: false, reason: "invalid" });
});
