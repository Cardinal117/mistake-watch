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
const worker = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

function createBucketMock() {
  return {
    getCalls: 0,
    async get() {
      this.getCalls += 1;
      throw new Error("Authorization timeout must not read storage");
    },
  };
}

function createWorkerEnv(bucket) {
  return {
    AUTHORIZATION_ORIGIN: "https://watch.example",
    MEDIA_BUCKET: bucket,
    MEDIA_GATEWAY_ORIGIN_SECRET: "fixture-origin-secret",
  };
}

for (const stalledStage of ["headers", "body"]) {
  test("authorization timeout bounds stalled " + stalledStage, async () => {
    const bucket = createBucketMock();
    let timer;
    const pending = worker.handleRangeGatewayRequest(
      new Request(
        "https://media.watch.example/room-sessions/session-1/content",
        {
          headers: { Cookie: "__Secure-mw_media_access=fixture" },
        },
      ),
      createWorkerEnv(bucket),
      {
        fetch: async (url, init) => {
          if (new URL(url).pathname === "/api/health") {
            return new Response(null, { status: 200 });
          }
          if (stalledStage === "headers") {
            return new Promise((_, reject) => {
              init.signal?.addEventListener(
                "abort",
                () => reject(init.signal.reason),
                { once: true },
              );
            });
          }
          return new Response(
            new ReadableStream({
              start(controller) {
                init.signal?.addEventListener(
                  "abort",
                  () => controller.error(init.signal.reason),
                  { once: true },
                );
              },
            }),
          );
        },
      },
    );
    try {
      const result = await Promise.race([
        pending,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(null), 6500);
        }),
      ]);
      assert.ok(
        result,
        "stalled authorization must finish within its bounded deadline",
      );
      assert.equal(result.status, 503);
      assert.equal(bucket.getCalls, 0);
    } finally {
      clearTimeout(timer);
    }
  });
}

test("diagnostic health timeout does not prevent fail-closed response", async () => {
  const bucket = createBucketMock();
  let timer;
  const pending = worker.handleRangeGatewayRequest(
    new Request("https://media.watch.example/room-sessions/session-1/content", {
      headers: { Cookie: "__Secure-mw_media_access=fixture" },
    }),
    createWorkerEnv(bucket),
    {
      reportAuthorizationFailure() {},
      fetch: async (url, init) => {
        if (new URL(url).pathname !== "/api/health")
          throw new Error("Network connection lost");
        return new Promise((_, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(init.signal.reason),
            { once: true },
          );
        });
      },
    },
  );
  try {
    const result = await Promise.race([
      pending,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), 3500);
      }),
    ]);
    assert.ok(
      result,
      "diagnostic health probe must also have a bounded deadline",
    );
    assert.equal(result.status, 503);
    assert.equal(bucket.getCalls, 0);
  } finally {
    clearTimeout(timer);
  }
});
