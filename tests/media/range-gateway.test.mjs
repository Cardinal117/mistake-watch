import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-range-gateway-"),
);
const missingContract = {
  async authorizeMediaGatewayRequest() {
    return { allowed: false, status: 501 };
  },
  createMediaGatewayCredential() {
    return "missing";
  },
  verifyMediaGatewayCredential() {
    return null;
  },
};
const missingWorker = {
  async handleRangeGatewayRequest() {
    return new Response("Missing range gateway", { status: 501 });
  },
};
const contract = await loadTypeScriptModule(
  "lib/media/range-gateway.ts",
  missingContract,
);
const worker = await loadTypeScriptModule(
  "workers/uploaded-media-gateway/src/index.ts",
  missingWorker,
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const now = new Date("2026-09-01T10:00:00.000Z");
const signingSecret = "s".repeat(48);
const originSecret = "o".repeat(48);
const credentialPayload = {
  expiresAt: new Date("2026-09-01T11:00:00.000Z").getTime(),
  memberId: "member-1",
  roomId: "room-1",
  sessionId: "session-1",
  tokenId: "token-1",
};

test("media gateway credentials round-trip and reject tampering or expiry", () => {
  const credential = contract.createMediaGatewayCredential({
    payload: credentialPayload,
    secret: signingSecret,
  });

  assert.ok(credential.length > 40);
  assert.deepEqual(
    contract.verifyMediaGatewayCredential({
      credential,
      now,
      secret: signingSecret,
    }),
    {
      ...credentialPayload,
      version: 1,
    },
  );
  assert.equal(
    contract.verifyMediaGatewayCredential({
      credential: `${credential.slice(0, -1)}x`,
      now,
      secret: signingSecret,
    }),
    null,
  );
  assert.equal(
    contract.verifyMediaGatewayCredential({
      credential,
      now: new Date("2026-09-01T11:00:00.000Z"),
      secret: signingSecret,
    }),
    null,
  );
  assert.equal(
    contract.verifyMediaGatewayCredential({
      credential,
      now,
      secret: "wrong".repeat(12),
    }),
    null,
  );
});

test("gateway authorization requires both origin and current room access", async () => {
  const credential = contract.createMediaGatewayCredential({
    payload: credentialPayload,
    secret: signingSecret,
  });
  let accessChecks = 0;
  const loadAccess = async () => {
    accessChecks += 1;
    return {
      allowed: true,
      contentType: "video/mp4",
      objectKey: "private/object.mp4",
    };
  };

  assert.deepEqual(
    await contract.authorizeMediaGatewayRequest({
      credential,
      expectedOriginSecret: originSecret,
      loadAccess,
      now,
      originSecret,
      sessionId: "session-1",
      signingSecret,
    }),
    {
      allowed: true,
      contentType: "video/mp4",
      objectKey: "private/object.mp4",
    },
  );
  assert.equal(accessChecks, 1);

  assert.deepEqual(
    await contract.authorizeMediaGatewayRequest({
      credential,
      expectedOriginSecret: originSecret,
      loadAccess,
      now,
      originSecret: "invalid",
      sessionId: "session-1",
      signingSecret,
    }),
    { allowed: false, status: 401 },
  );
  assert.equal(accessChecks, 1);

  assert.deepEqual(
    await contract.authorizeMediaGatewayRequest({
      credential,
      expectedOriginSecret: originSecret,
      loadAccess,
      now,
      originSecret,
      sessionId: "session-2",
      signingSecret,
    }),
    { allowed: false, status: 403 },
  );
  assert.equal(accessChecks, 1);

  assert.deepEqual(
    await contract.authorizeMediaGatewayRequest({
      credential,
      expectedOriginSecret: originSecret,
      loadAccess: async () => {
        accessChecks += 1;
        return { allowed: false };
      },
      now,
      originSecret,
      sessionId: "session-1",
      signingSecret,
    }),
    { allowed: false, status: 403 },
  );
  assert.equal(accessChecks, 2);
});

test("playback bootstrap creates a clean stable URL and session-scoped cookie", () => {
  const createBootstrap = contract.createMediaGatewayBootstrap ?? (() => null);
  const bootstrap = createBootstrap({
    expiresAt: new Date("2026-09-01T11:00:00.000Z"),
    memberId: "member-1",
    roomId: "room-1",
    sessionId: "session-1",
    signingSecret,
    tokenId: "token-1",
  });

  assert.ok(bootstrap);
  assert.equal(
    bootstrap.playbackUrl,
    "/media-gateway/room-sessions/session-1/content",
  );
  assert.deepEqual(
    {
      domain: bootstrap.cookie.domain,
      expires: bootstrap.cookie.expires,
      httpOnly: bootstrap.cookie.httpOnly,
      name: bootstrap.cookie.name,
      path: bootstrap.cookie.path,
      sameSite: bootstrap.cookie.sameSite,
      secure: bootstrap.cookie.secure,
    },
    {
      domain: undefined,
      expires: new Date("2026-09-01T11:00:00.000Z"),
      httpOnly: true,
      name: "__Secure-mw_media_access",
      path: "/media-gateway/room-sessions/session-1/content",
      sameSite: "strict",
      secure: true,
    },
  );
  assert.equal(
    contract.verifyMediaGatewayCredential({
      credential: bootstrap.cookie.value,
      now,
      secret: signingSecret,
    })?.sessionId,
    "session-1",
  );
  assert.doesNotMatch(JSON.stringify(bootstrap), /objectKey|private\/object/);
});

test("Next rewrites the same-origin media path to the configured Worker upstream", async () => {
  const variableName = "MEDIA_GATEWAY_UPSTREAM_ORIGIN";
  const previousValue = process.env[variableName];

  process.env[variableName] = "https://gateway.example.workers.dev";

  try {
    const configUrl = pathToFileURL(path.join(rootDir, "next.config.mjs"));

    configUrl.searchParams.set("range-gateway-test", String(Date.now()));

    const nextConfig = (await import(configUrl)).default;

    assert.equal(typeof nextConfig.rewrites, "function");
    assert.deepEqual(await nextConfig.rewrites(), [
      {
        destination:
          "https://gateway.example.workers.dev/room-sessions/:sessionId/content",
        source: "/media-gateway/room-sessions/:sessionId/content",
      },
    ]);

    process.env[variableName] =
      "https://gateway.example.workers.dev/unapproved-path";
    await assert.rejects(
      () => nextConfig.rewrites(),
      /must contain only an origin/,
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env[variableName];
    } else {
      process.env[variableName] = previousValue;
    }
  }
});

test("range gateway streams an authorized partial response with private headers", async () => {
  const bucket = createBucketMock();
  const response = await worker.handleRangeGatewayRequest(
    new Request("https://media.watch.example/room-sessions/session-1/content", {
      headers: {
        Cookie: "__Secure-mw_media_access=credential",
        Range: "bytes=100-199",
      },
    }),
    createWorkerEnv(bucket),
    {
      fetch: async () =>
        Response.json({
          contentType: "video/mp4",
          objectKey: "private/object.mp4",
        }),
    },
  );

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(response.headers.get("content-range"), "bytes 100-199/1000");
  assert.equal(response.headers.get("content-length"), "100");
  assert.equal(response.headers.get("content-type"), "video/mp4");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(await response.text(), "range-body");
  assert.equal(bucket.getCalls, 1);
  assert.deepEqual(bucket.lastRange, { length: 100, offset: 100 });
});

test("range gateway denies before reading R2", async () => {
  const bucket = createBucketMock();
  const response = await worker.handleRangeGatewayRequest(
    new Request("https://media.watch.example/room-sessions/session-1/content", {
      headers: {
        Cookie: "__Secure-mw_media_access=credential",
        Range: "bytes=0-",
      },
    }),
    createWorkerEnv(bucket),
    {
      fetch: async () =>
        Response.json({ error: "Not allowed." }, { status: 403 }),
    },
  );

  assert.equal(response.status, 403);
  assert.equal(bucket.getCalls, 0);
});

test("range gateway rejects invalid and multi-range input without reading R2", async () => {
  for (const range of ["bytes=nope", "bytes=0-1,3-4", "items=0-1"]) {
    const bucket = createBucketMock();
    const response = await worker.handleRangeGatewayRequest(
      new Request(
        "https://media.watch.example/room-sessions/session-1/content",
        {
          headers: {
            Cookie: "__Secure-mw_media_access=credential",
            Range: range,
          },
        },
      ),
      createWorkerEnv(bucket),
      {
        fetch: async () =>
          assert.fail("Invalid ranges must fail before authorization."),
      },
    );

    assert.equal(response.status, 416);
    assert.equal(bucket.getCalls, 0);
  }
});

test("range gateway rejects malformed or oversized session paths before authorization", async () => {
  for (const sessionPath of ["%ZZ", "s".repeat(201)]) {
    const bucket = createBucketMock();
    const response = await worker.handleRangeGatewayRequest(
      new Request(
        `https://media.watch.example/room-sessions/${sessionPath}/content`,
        {
          headers: {
            Cookie: "__Secure-mw_media_access=credential",
            Range: "bytes=0-",
          },
        },
      ),
      createWorkerEnv(bucket),
      {
        fetch: async () =>
          assert.fail("Invalid paths must fail before authorization."),
      },
    );

    assert.equal(response.status, 400);
    assert.equal(bucket.getCalls, 0);
  }
});

test("range gateway returns a bounded 416 for an unsatisfiable R2 range", async () => {
  const rangeError = Object.assign(new Error("InvalidRange (10039)"), {
    code: 10039,
  });
  const bucket = {
    getCalls: 0,
    headCalls: 0,
    async get() {
      this.getCalls += 1;
      throw rangeError;
    },
    async head() {
      this.headCalls += 1;
      return { size: 1000 };
    },
  };
  const response = await worker.handleRangeGatewayRequest(
    new Request("https://media.watch.example/room-sessions/session-1/content", {
      headers: {
        Cookie: "__Secure-mw_media_access=credential",
        Range: "bytes=1000-",
      },
    }),
    createWorkerEnv(bucket),
    {
      fetch: async () =>
        Response.json({
          contentType: "video/mp4",
          objectKey: "private/object.mp4",
        }),
    },
  );

  assert.equal(response.status, 416);
  assert.equal(response.headers.get("content-range"), "bytes */1000");
  assert.equal(bucket.getCalls, 1);
  assert.equal(bucket.headCalls, 1);
});

function createBucketMock() {
  return {
    getCalls: 0,
    lastRange: null,
    async get(_key, options) {
      this.getCalls += 1;
      this.lastRange = options.range;

      return {
        body: new TextEncoder().encode("range-body"),
        httpEtag: '"etag-1"',
        range: { length: 100, offset: 100 },
        size: 1000,
        writeHttpMetadata(headers) {
          headers.set("Content-Type", "video/mp4");
        },
      };
    },
  };
}

function createWorkerEnv(bucket) {
  return {
    AUTHORIZATION_ORIGIN: "https://watch.example",
    MEDIA_BUCKET: bucket,
    MEDIA_GATEWAY_ORIGIN_SECRET: originSecret,
  };
}

async function loadTypeScriptModule(relativePath, fallback) {
  const sourcePath = path.join(rootDir, relativePath);

  if (!existsSync(sourcePath)) {
    return fallback;
  }

  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const outputPath = path.join(
    tempDir,
    relativePath.replaceAll(/[\\/]/g, "-").replace(/\.ts$/, ".mjs"),
  );

  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}
