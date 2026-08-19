import assert from "node:assert/strict";
import test from "node:test";

import { loadRecommendationModule } from "./ranking-test-helpers.mjs";

const { consumeFixedWindowRequest, recommendationRequestLimits } =
  await loadRecommendationModule("request-budget.ts");
const { preferenceRateLimitCooldownMs, preferenceRetryAfterMs } =
  await loadRecommendationModule("room-client.ts");

test("fixed request windows do not extend when counters increment", () => {
  const initial = consumeFixedWindowRequest({
    current: null,
    limit: 2,
    now: 1_000,
    windowMs: 60_000,
  });
  const second = consumeFixedWindowRequest({
    current: initial.state,
    limit: 2,
    now: 31_000,
    windowMs: 60_000,
  });
  const denied = consumeFixedWindowRequest({
    current: second.state,
    limit: 2,
    now: 41_000,
    windowMs: 60_000,
  });

  assert.equal(second.state.resetAt, 61_000);
  assert.equal(second.ttlMs, 30_000);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterSeconds, 20);

  const reset = consumeFixedWindowRequest({
    current: denied.state,
    limit: 2,
    now: 61_000,
    windowMs: 60_000,
  });
  assert.equal(reset.allowed, true);
  assert.deepEqual(reset.state, { count: 1, resetAt: 121_000 });
});

test("preference reads and writes have independent explicit budgets", () => {
  assert.equal(recommendationRequestLimits["preference-read"], 60);
  assert.equal(recommendationRequestLimits["preference-write"], 20);
  assert.equal(recommendationRequestLimits["recommendation-read"], 30);
});

test("preference retry timing honors valid headers and bounds fallbacks", () => {
  assert.equal(preferenceRetryAfterMs("12", 0), 12_000);
  assert.equal(
    preferenceRetryAfterMs("Thu, 01 Jan 1970 00:00:09 GMT", 1_000),
    8_000,
  );
  assert.equal(preferenceRetryAfterMs("invalid", 0), null);
  assert.equal(preferenceRateLimitCooldownMs(null, 1), 5_000);
  assert.equal(preferenceRateLimitCooldownMs(null, 4), 40_000);
  assert.equal(preferenceRateLimitCooldownMs(null, 20), 60_000);
  assert.equal(preferenceRateLimitCooldownMs(120_000, 1), 60_000);
});
