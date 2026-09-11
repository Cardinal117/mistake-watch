import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { shadowFailureCode } =
  await loadRecommendationModule("shadow-failure.ts");
test("database diagnostic exposes only bounded error codes", () => {
  assert.equal(
    shadowFailureCode({ code: "PGRST202", message: "private data" }),
    "PGRST202",
  );
  assert.equal(shadowFailureCode({ code: "57014" }), "57014");
  for (const error of [
    null,
    new Error("private URL"),
    { code: "private user data" },
    { code: "A".repeat(30) },
    { code: 123 },
  ])
    assert.equal(shadowFailureCode(error), "unknown");
});
