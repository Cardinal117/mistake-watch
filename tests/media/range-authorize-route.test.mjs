import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

test("authorization route fails closed without logging private upstream errors", async () => {
  const logs = [];
  let accessChecks = 0;
  const config = {
    originSecret: "o".repeat(48),
    signingSecret: "s".repeat(48),
  };
  function load(file) {
    const mod = { exports: {} };
    vm.runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
        fileName: file,
      }).outputText,
      {
        module: mod,
        exports: mod.exports,
        Buffer,
        TextDecoder,
        Uint8Array,
        console: { error: (...args) => logs.push(args) },
        require(spec) {
          if (spec === "node:crypto") return require(spec);
          if (spec === "next/server") return { NextResponse: Response };
          if (spec === "@/lib/media/range-gateway") return contract;
          if (spec === "@/lib/media/range-gateway-config")
            return { getMediaGatewayConfig: () => config };
          if (spec === "@/lib/media/room-media-sessions")
            return {
              async getRoomMediaGatewayAccess() {
                accessChecks++;
                throw {
                  message: "fixture database failure",
                  details: "fixture-private-object-key-and-identity",
                };
              },
            };
          throw new Error(`Unexpected dependency: ${spec}`);
        },
      },
    );
    return mod.exports;
  }
  const contract = load("lib/media/range-gateway.ts");
  const route = load("app/api/internal/media/range-authorize/route.ts");
  const credential = contract.createMediaGatewayCredential({
    secret: config.signingSecret,
    payload: {
      memberId: "fixture-member",
      roomId: "fixture-room",
      sessionId: "fixture-session",
      tokenId: "fixture-token",
      expiresAt: Date.now() + 60_000,
    },
  });
  const response = await route.POST(
    new Request("https://fixture.example/api/internal/media/range-authorize", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.originSecret}` },
      body: JSON.stringify({ credential, sessionId: "fixture-session" }),
    }),
  );
  assert.equal(
    accessChecks,
    1,
    "exercise the authenticated database error path",
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), {
    error: "Media authorization is unavailable.",
  });
  assert.deepEqual(logs, [["[media-range-authorize] authorization failed"]]);
});
