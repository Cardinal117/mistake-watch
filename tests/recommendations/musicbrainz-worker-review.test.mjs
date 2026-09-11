import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const mbid = "311e0000-0000-4000-8000-000000000001";
const token = "311e0000-0000-4000-8000-000000000002";
function fixture(claim, { enabled = true, completion = true } = {}) {
  const calls = [],
    requests = [],
    mod = { exports: {} };
  const mocks = {
    "server-only": {},
    "@/lib/supabase/admin": {
      createSupabaseAdminClient: () => ({
        rpc(name, args) {
          calls.push({ name, args });
          return {
            abortSignal: async () => ({
              error: null,
              data: name === "claim_musicbrainz_lookup" ? claim : completion,
            }),
          };
        },
      }),
    },
    "./musicbrainz-core": {
      MBID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      lookupRecording: async (id) => {
        requests.push(id);
        return { status: "retry", retrySeconds: 60 };
      },
    },
  };
  new Function(
    "exports",
    "require",
    "process",
    ts.transpileModule(
      readFileSync("lib/recommendations/musicbrainz-worker.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
  )(
    mod.exports,
    (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency ${name}`);
      return mocks[name];
    },
    { env: { MUSICBRAINZ_IDENTITY_ENABLED: enabled ? "true" : "false" } },
  );
  return { run: mod.exports.runMusicbrainzJobs, calls, requests };
}

test("disabled provider pump makes no claims or outbound lookups", async () => {
  const f = fixture(
    { mbid, token, leaseUntil: new Date(Date.now() + 30000).toISOString() },
    { enabled: false },
  );
  await f.run();
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.requests, []);
});

test("expired and near-expiry claims cannot dispatch outbound requests", async () => {
  for (const remaining of [-1000, 5000]) {
    const f = fixture({
      mbid,
      token,
      leaseUntil: new Date(Date.now() + remaining).toISOString(),
    });
    await f.run();
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.requests, []);
  }
});

test("missing and malformed lease timestamps fail closed", async () => {
  for (const leaseUntil of [undefined, "invalid-date"]) {
    const f = fixture({ mbid, token, leaseUntil });
    await f.run();
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.requests, []);
  }
});

test("fresh claim dispatches only recording ID and stores retry under its exact lease", async () => {
  const f = fixture({
    mbid,
    token,
    leaseUntil: new Date(Date.now() + 30000).toISOString(),
  });
  await f.run();
  assert.deepEqual(f.requests, [mbid]);
  assert.deepEqual(f.calls, [
    { name: "claim_musicbrainz_lookup", args: undefined },
    {
      name: "complete_musicbrainz_lookup",
      args: {
        claim_token: token,
        recording_mbid: mbid,
        outcome: { status: "retry", retrySeconds: 60 },
      },
    },
  ]);
});
