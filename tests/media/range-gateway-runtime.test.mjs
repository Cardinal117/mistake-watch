import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
// Reuse the runtime pinned by the existing Worker lockfile.
// Prerequisite: npm ci --prefix workers/uploaded-media-gateway
const requireWorker = createRequire(
  path.join(rootDir, "workers/uploaded-media-gateway/package.json"),
);
const { Miniflare, convertV4MiniflareOptions } = requireWorker("miniflare");
const workerSource = await readFile(
  path.join(rootDir, "workers/uploaded-media-gateway/src/index.ts"),
  "utf8",
);
const compiledWorker = ts.transpileModule(workerSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

// Instrument only storage. The production entrypoint and its default fetch
// dependency execute unchanged in workerd; intercept outbound I/O below fetch.
const entrySource = `
import gateway from "./gateway.js";

export default {
  async fetch(request, env) {
    let reads = 0;
    const metrics = [];
    const originalInfo = console.info;
    console.info = (label, metric) => {
      if (label === "[media-gateway] request") metrics.push(metric);
    };
    let response;
    try {
      response = await gateway.fetch(request, {
      ...env,
      MEDIA_BUCKET: {
        async get(key, options) {
          reads += 1;
          if (key !== "fixture-object") throw new Error("Unexpected object");
          const offset = options.range.offset;
          const length = options.range.length;
          return {
            size: 1000,
            range: { offset, length },
            body: new Uint8Array(length).fill(7),
            writeHttpMetadata(headers) {
              headers.set("Content-Type", "video/mp4");
              headers.set("Cache-Control", "public, max-age=86400");
            },
          };
        },
        async head() {
          reads += 1;
          throw new Error("Unexpected head");
        },
      },
      });
    } finally {
      console.info = originalInfo;
    }
    const headers = new Headers(response.headers);
    headers.set("X-Test-Storage-Reads", String(reads));
    headers.set("X-Test-Metrics", JSON.stringify(metrics));
    return new Response(response.body, { status: response.status, headers });
  },
};
`;

test("native Worker fetch reaches authorization and enforces denial before storage", async () => {
  let authorizationStatus = 200;
  const outboundCalls = [];
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      compatibilityDate: "2026-09-01",
      modulesRoot: rootDir,
      modules: [
        { type: "ESModule", path: "entry.js", contents: entrySource },
        { type: "ESModule", path: "gateway.js", contents: compiledWorker },
      ],
      bindings: {
        AUTHORIZATION_ORIGIN: "https://authorization.example",
        MEDIA_GATEWAY_ORIGIN_SECRET: "fixture-origin-secret",
      },
      outboundService: async (request) => {
        const url = new URL(request.url);
        // No external network access: every native outbound request ends here.
        outboundCalls.push({
          origin: url.origin,
          path: url.pathname,
          method: request.method,
          authorization: request.headers.get("Authorization"),
          body: request.method === "POST" ? await request.json() : null,
        });
        return authorizationStatus === 200
          ? Response.json({
              contentType: "video/mp4",
              objectKey: "fixture-object",
            })
          : new Response(null, { status: authorizationStatus });
      },
    }),
  );

  try {
    const request = () =>
      runtime.dispatchFetch(
        "https://gateway.example/room-sessions/fixture-session/content",
        {
          headers: {
            Cookie: "__Secure-mw_media_access=fixture-credential",
            Range: "bytes=100-199",
          },
        },
      );
    const allowed = await request();
    const allowedBody = new Uint8Array(await allowed.arrayBuffer());

    assert.equal(
      allowed.status,
      206,
      "native default fetch must reach authorization and return the requested range",
    );
    assert.equal(allowed.headers.get("Content-Range"), "bytes 100-199/1000");
    assert.equal(allowed.headers.get("Content-Length"), "100");
    assert.equal(allowed.headers.get("Cache-Control"), "private, no-store");
    assert.equal(allowed.headers.get("X-Test-Storage-Reads"), "1");
    const [allowedMetric] = JSON.parse(allowed.headers.get("X-Test-Metrics"));
    assert.equal(allowedMetric.authorizationOutcome, "allowed");
    assert.equal(allowedMetric.r2GetAttempts, 1);
    assert.ok(Number.isFinite(allowedMetric.authorizationMs));
    assert.ok(allowedMetric.authorizationMs >= 0);
    assert.deepEqual(allowedBody, new Uint8Array(100).fill(7));
    assert.deepEqual(outboundCalls, [
      {
        origin: "https://authorization.example",
        path: "/api/internal/media/range-authorize",
        method: "POST",
        authorization: "Bearer fixture-origin-secret",
        body: {
          credential: "fixture-credential",
          sessionId: "fixture-session",
        },
      },
    ]);

    for (const status of [401, 403]) {
      authorizationStatus = status;
      const denied = await request();
      await denied.text();
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get("X-Test-Storage-Reads"), "0");
      const [deniedMetric] = JSON.parse(denied.headers.get("X-Test-Metrics"));
      assert.equal(deniedMetric.authorizationOutcome, "denied");
      assert.equal(deniedMetric.r2GetAttempts, 0);
      assert.equal(deniedMetric.status, 403);
      assert.equal(denied.headers.get("Cache-Control"), "private, no-store");
    }
    assert.equal(outboundCalls.length, 3, "each request must reauthorize");
  } finally {
    await runtime.dispose();
  }
});
