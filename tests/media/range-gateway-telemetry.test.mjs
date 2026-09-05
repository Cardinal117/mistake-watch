import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../../workers/uploaded-media-gateway/src/index.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { handleRangeGatewayRequest } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

function fixture(options = {}) {
  const events = [];
  const calls = { get: 0, head: 0 };
  let clock = 100;
  const privateMarker = "private-fixture-never-log";
  const bucket = {
    async get() {
      calls.get++;
      clock += 900;
      if (options.storageError) throw options.storageError;
      if (options.missing) return null;
      return {
        body: options.body ?? new Uint8Array([7]),
        size: 1,
        range: options.full ? undefined : { offset: 0, length: 1 },
        writeHttpMetadata(headers) {
          headers.set("Content-Type", "video/mp4");
        },
      };
    },
    async head() {
      calls.head++;
      return { size: 1 };
    },
  };
  const env = {
    AUTHORIZATION_ORIGIN: "https://authorization.example",
    MEDIA_GATEWAY_ORIGIN_SECRET: privateMarker,
    MEDIA_BUCKET: bucket,
  };
  const dependencies = {
    now: () => clock,
    reportRequest: (event) => {
      events.push(event);
      if (options.reportError) throw new Error(privateMarker);
    },
    reportAuthorizationFailure() {},
    async fetch(url) {
      if (new URL(url).pathname === "/api/health") {
        clock += 2000;
        return new Response(null, { status: 200 });
      }
      clock += 25;
      if (options.fetchError) throw options.fetchError;
      if (options.status) return new Response(null, { status: options.status });
      return {
        ok: true,
        status: 200,
        async json() {
          clock += 15;
          return options.malformed ? {} : { objectKey: privateMarker };
        },
      };
    },
  };
  const request = new Request(
    `https://gateway.example/room-sessions/${privateMarker}/content?private=${privateMarker}`,
    {
      headers: {
        ...(options.noCookie
          ? {}
          : { Cookie: `__Secure-mw_media_access=${privateMarker}` }),
        ...(options.full ? {} : { Range: options.range ?? "bytes=0-0" }),
      },
    },
  );
  return {
    events,
    calls,
    run: () => handleRangeGatewayRequest(request, env, dependencies),
  };
}

test("gateway telemetry measures complete authorization, excludes storage, and preserves streaming", async () => {
  let controller;
  const body = new ReadableStream({
    start(value) {
      controller = value;
    },
  });
  const f = fixture({ body });
  const response = await f.run();
  assert.equal(response.status, 206);
  assert.equal(
    response.body,
    body,
    "metrics must not wrap or consume the media stream",
  );
  assert.equal(body.locked, false);
  assert.deepEqual(f.events, [
    {
      authorizationMs: 40,
      authorizationOutcome: "allowed",
      requestKind: "range",
      r2GetAttempts: 1,
      r2HeadAttempts: 0,
      status: 206,
    },
  ]);
  assert.deepEqual(f.calls, { get: 1, head: 0 });
  assert.equal(JSON.stringify(f.events).includes("private-fixture"), false);
  controller.close();
});

for (const [name, options, status, outcome, duration, gets, heads] of [
  ["full media", { full: true }, 200, "allowed", 40, 1, 0],
  ["missing cookie", { noCookie: true }, 401, "not_attempted", null, 0, 0],
  [
    "unsupported range",
    { range: "bytes=0-1,4-5" },
    416,
    "not_attempted",
    null,
    0,
    0,
  ],
  ["denied access", { status: 403 }, 403, "denied", 25, 0, 0],
  ["invalid credential", { status: 401 }, 403, "denied", 25, 0, 0],
  ["upstream failure", { status: 500 }, 503, "upstream_status", 25, 0, 0],
  [
    "malformed authorization",
    { malformed: true },
    503,
    "malformed_success",
    40,
    0,
    0,
  ],
  [
    "fetch exception excludes health probe",
    { fetchError: new Error("private-fixture-never-log") },
    503,
    "fetch_exception",
    25,
    0,
    0,
  ],
  [
    "timeout",
    {
      fetchError: new DOMException("private-fixture-never-log", "TimeoutError"),
    },
    503,
    "timeout",
    25,
    0,
    0,
  ],
  ["missing object", { missing: true }, 404, "allowed", 40, 1, 0],
  [
    "storage failure",
    { storageError: new Error("private-fixture-never-log") },
    502,
    "allowed",
    40,
    1,
    0,
  ],
  [
    "unsatisfiable range",
    { storageError: { code: 10039 } },
    416,
    "allowed",
    40,
    1,
    1,
  ],
]) {
  test("gateway telemetry accounts for " + name, async () => {
    const f = fixture(options);
    const response = await f.run();
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(f.events.length, 1, "exactly one safe outcome per request");
    assert.deepEqual(f.events[0], {
      authorizationMs: duration,
      authorizationOutcome: outcome,
      requestKind: options.full ? "full" : options.range ? "invalid" : "range",
      r2GetAttempts: gets,
      r2HeadAttempts: heads,
      status,
    });
    assert.deepEqual(f.calls, { get: gets, head: heads });
    assert.equal(JSON.stringify(f.events).includes("private-fixture"), false);
    await response.body?.cancel();
  });
}

test("a broken metric reporter cannot change the media response", async () => {
  const f = fixture({ reportError: true });
  const response = await f.run();
  assert.equal(response.status, 206);
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([7]),
  );
  assert.equal(f.events.length, 1);
});
