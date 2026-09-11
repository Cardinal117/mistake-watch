import assert from "node:assert/strict";
import test from "node:test";
import { loadRecommendationModule } from "./ranking-test-helpers.mjs";
const { catalogueViewerCountry } = await loadRecommendationModule(
  "catalogue-region.ts",
);
test("country context uses only the deployment header on Vercel", () => {
  const headers = new Headers({
    "x-vercel-ip-country": "ZA",
    "x-country": "US",
  });
  assert.equal(catalogueViewerCountry(headers, "1"), "ZA");
  assert.equal(catalogueViewerCountry(headers, undefined), null);
  assert.equal(
    catalogueViewerCountry(new Headers({ "x-country": "ZA" }), "1"),
    null,
  );
  for (const value of ["za", "ZA,US", "", "ZZZ"]) {
    assert.equal(
      catalogueViewerCountry(
        new Headers({ "x-vercel-ip-country": value }),
        "1",
      ),
      null,
    );
  }
});
