import assert from "node:assert/strict";
import test from "node:test";

import { GET as getHealth } from "../../app/api/health/route.ts";
import {
  checkSupabaseAvailability,
  createOperationalReadinessResponse,
  runOperationalReadiness,
} from "../../lib/readiness/operational.ts";

const passingCheck = {
  configured: true,
  async check() {},
};

test("health remains a shallow no-store liveness response", async () => {
  const response = getHealth();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "mistake-watch",
  });
});

test("readiness returns 200 only when both core dependencies are ready", async () => {
  const readiness = await runOperationalReadiness({
    cloudconvertConfigured: false,
    spacetime: passingCheck,
    supabase: passingCheck,
  });
  const response = createOperationalReadinessResponse(readiness);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    checks: {
      cloudconvert: { status: "not_configured" },
      spacetime: { status: "ready" },
      supabase: { status: "ready" },
    },
    ok: true,
    service: "mistake-watch",
    status: "ready",
  });
});

test("readiness bounds failures and exposes no provider error details", async () => {
  const readiness = await runOperationalReadiness({
    cloudconvertConfigured: true,
    spacetime: {
      configured: true,
      check: () => new Promise(() => {}),
    },
    supabase: {
      configured: true,
      async check() {
        throw new Error("secret provider topology");
      },
    },
    timeoutMs: 10,
  });
  const response = createOperationalReadinessResponse(readiness);
  const body = await response.text();

  assert.equal(response.status, 503);
  assert.doesNotMatch(body, /secret|topology|timed out/i);
  assert.deepEqual(JSON.parse(body), {
    checks: {
      cloudconvert: { status: "configured" },
      spacetime: { status: "unavailable" },
      supabase: { status: "unavailable" },
    },
    ok: false,
    service: "mistake-watch",
    status: "not_ready",
  });
});

test("missing core configuration is distinct from an unavailable dependency", async () => {
  const readiness = await runOperationalReadiness({
    cloudconvertConfigured: false,
    spacetime: { ...passingCheck, configured: false },
    supabase: passingCheck,
  });

  assert.equal(readiness.ok, false);
  assert.deepEqual(readiness.checks.spacetime, {
    status: "not_configured",
  });
});

test("Supabase readiness uses the provider health route without table access", async () => {
  let request;
  const controller = new AbortController();

  await checkSupabaseAvailability(
    controller.signal,
    "https://project.supabase.co",
    "publishable-key",
    async (input, init) => {
      request = { input: input.toString(), init };
      return new Response(null, { status: 200 });
    },
  );

  assert.equal(request.input, "https://project.supabase.co/auth/v1/health");
  assert.deepEqual(request.init.headers, { apikey: "publishable-key" });
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.signal, controller.signal);
});

test("Supabase readiness rejects an unhealthy provider response", async () => {
  await assert.rejects(
    checkSupabaseAvailability(
      new AbortController().signal,
      "https://project.supabase.co",
      "publishable-key",
      async () => new Response(null, { status: 503 }),
    ),
    /unavailable/i,
  );
});
