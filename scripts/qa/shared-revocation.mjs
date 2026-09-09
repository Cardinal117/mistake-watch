import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { loadSpacetimeBindings } from "../load-spacetime-bindings.mjs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((l) => {
      const n = l.indexOf("=");
      return [l.slice(0, n), l.slice(n + 1)];
    }),
);
assert.equal(env.NEXT_PUBLIC_SPACETIME_URI, "ws://127.0.0.1:5376");
const { bindings, cleanup } = await loadSpacetimeBindings({
  generatedDir: "lib/spacetime/generated",
  tempRoot: ".tmp",
});
const connections = [];
function connect(token) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Local authority connection timeout")),
      5000,
    );
    let b = bindings.DbConnection.builder()
      .withUri("ws://127.0.0.1:5376")
      .withDatabaseName("mistake-watch-task028");
    if (token) b = b.withToken(token);
    b.onConnect((c, identity) => {
      clearTimeout(timer);
      connections.push(c);
      resolve({ c, identity: identity.toHexString() });
    })
      .onConnectError((e) => {
        clearTimeout(timer);
        reject(e);
      })
      .build();
  });
}
try {
  const trusted = await connect(env.SPACETIME_SERVER_AUTH_TOKEN);
  const stranger = await connect();
  const roomId = `qa284-${randomUUID()}`;
  const memberId = `qa284-${randomUUID()}`;
  await assert.rejects(() =>
    stranger.c.reducers.revokeRoomMembership({ roomId, memberId }),
  );
  const grant = () =>
    trusted.c.reducers.issueRoomAdmissionGrant({
      admissionId: randomUUID(),
      admissionToken: randomUUID(),
      authorizationKind: "account",
      expiresMs: BigInt(Date.now() + 60000),
      identityHex: stranger.identity,
      memberId,
      role: "guest",
      roomId,
    });
  await grant();
  await trusted.c.reducers.revokeRoomMembership({ roomId, memberId });
  await trusted.c.reducers.revokeRoomMembership({ roomId, memberId });
  await assert.rejects(grant);
  console.log(
    "PASS: untrusted revocation denied; trusted revocation is idempotent and blocks late grants for retired member IDs.",
  );
} finally {
  connections.forEach((c) => c.disconnect());
  await cleanup();
}
