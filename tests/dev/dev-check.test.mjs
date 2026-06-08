import assert from "node:assert/strict";
import test from "node:test";

import {
  parseNetstatPortOwners,
  parseEnvFile,
  summarizeChecks,
  validateSpacetimeConfig,
  validateDevEnvironment,
} from "../../scripts/dev-check.mjs";

const validEnv = {
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:5371",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_SPACETIME_URI: "ws://127.0.0.1:5372",
  NEXT_PUBLIC_SPACETIME_MODULE: "mistake-watch-rooms",
  SUPABASE_SECRET_KEY: "server-only",
  SPACETIME_SERVER_AUTH_TOKEN: "server-only",
  YOUTUBE_API_KEY: "server-only",
};

test("parseEnvFile reads simple dotenv files without comments", () => {
  const parsed = parseEnvFile(`
# comment
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5371
SUPABASE_SECRET_KEY="server-only"
YOUTUBE_API_KEY='youtube-key'
`);

  assert.deepEqual(parsed, {
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:5371",
    SUPABASE_SECRET_KEY: "server-only",
    YOUTUBE_API_KEY: "youtube-key",
  });
});

test("validateDevEnvironment passes the expected local env shape", () => {
  const checks = validateDevEnvironment(validEnv, { envLocalExists: true });
  const summary = summarizeChecks(checks);

  assert.equal(summary.fail, 0);
  assert.equal(summary.warn, 0);
});

test("validateDevEnvironment fails missing required values", () => {
  const checks = validateDevEnvironment(
    { NEXT_PUBLIC_APP_URL: "http://127.0.0.1:5371" },
    { envLocalExists: false },
  );
  const summary = summarizeChecks(checks);

  assert.ok(summary.fail > 0);
  assert.ok(checks.some((check) => check.label === ".env.local"));
  assert.ok(checks.some((check) => check.label === "SUPABASE_SECRET_KEY"));
});

test("validateDevEnvironment rejects public secret exposure", () => {
  const checks = validateDevEnvironment(
    {
      ...validEnv,
      NEXT_PUBLIC_YOUTUBE_API_KEY: "do-not-expose",
    },
    { envLocalExists: true },
  );

  assert.ok(
    checks.some(
      (check) =>
        check.level === "fail" && check.label === "NEXT_PUBLIC_YOUTUBE_API_KEY",
    ),
  );
});

test("validateDevEnvironment warns about production URLs in local env", () => {
  const checks = validateDevEnvironment(
    {
      ...validEnv,
      NEXT_PUBLIC_APP_URL: "https://watch.mistakestudios.com",
      NEXT_PUBLIC_SPACETIME_URI: "https://maincloud.spacetimedb.com",
    },
    { envLocalExists: true },
  );
  const warnings = checks.filter((check) => check.level === "warn");

  assert.equal(warnings.length, 2);
});

test("parseNetstatPortOwners reports only local port owners", () => {
  const owners = parseNetstatPortOwners(
    `
  TCP    127.0.0.1:5371         0.0.0.0:0              LISTENING       34828
  TCP    127.0.0.1:5371         127.0.0.1:49585        CLOSE_WAIT      0
  TCP    127.0.0.1:49585        127.0.0.1:5371         FIN_WAIT_2      27668
`,
    5371,
  );

  assert.deepEqual(owners, ["34828"]);
});

test("validateSpacetimeConfig fails env and spacetime.json database mismatch", () => {
  const checks = validateSpacetimeConfig(
    {
      NEXT_PUBLIC_SPACETIME_MODULE: "old-local-db",
    },
    {
      database: "mistake-watch-rooms",
    },
  );

  assert.deepEqual(summarizeChecks(checks), { pass: 0, warn: 0, fail: 1 });
});

test("validateSpacetimeConfig passes matching env and spacetime.json database", () => {
  const checks = validateSpacetimeConfig(
    {
      NEXT_PUBLIC_SPACETIME_MODULE: "mistake-watch-rooms",
    },
    {
      database: "mistake-watch-rooms",
    },
  );

  assert.deepEqual(summarizeChecks(checks), { pass: 1, warn: 0, fail: 0 });
});
