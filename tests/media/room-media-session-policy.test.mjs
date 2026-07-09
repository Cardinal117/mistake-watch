import assert from "node:assert/strict";
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
  path.join(tmpdir(), "mistake-watch-room-media-session-policy-"),
);
const policyPath = path.join(
  rootDir,
  "lib/media/room-media-session-policy.ts",
);
const cataloguePolicyPath = path.join(
  rootDir,
  "lib/media/uploaded-catalogue-policy.ts",
);
const cataloguePolicySource = await readFile(cataloguePolicyPath, "utf8");
const cataloguePolicyJs = ts.transpileModule(cataloguePolicySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: cataloguePolicyPath,
}).outputText;
const cataloguePolicyModulePath = path.join(
  tempDir,
  "uploaded-catalogue-policy.mjs",
);
const policySource = (await readFile(policyPath, "utf8")).replace(
  /from "\.\/uploaded-catalogue-policy"/g,
  'from "./uploaded-catalogue-policy.mjs"',
);
const policyJs = ts.transpileModule(policySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: policyPath,
}).outputText;
const policyModulePath = path.join(tempDir, "room-media-session-policy.mjs");

await writeFile(cataloguePolicyModulePath, cataloguePolicyJs);
await writeFile(policyModulePath, policyJs);

const { canStartUploadedMedia, canWatchRoomMedia } = await import(
  pathToFileURL(policyModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const activeMemberAccount = {
  accountStatus: "active",
  id: "member-1",
  role: "member",
  status: "signed-in",
};
const activeOwnerAccount = {
  accountStatus: "active",
  id: "owner-1",
  role: "owner",
  status: "signed-in",
};
const activeAuthorization = {
  status: "active",
  user_id: "member-1",
};
const activeParticipant = {
  roomId: "room-1",
  status: "active",
};
const activeSession = {
  endedAt: null,
  expiresAt: "2026-07-09T13:00:00.000Z",
  roomId: "room-1",
  status: "active",
};
const now = new Date("2026-07-09T12:00:00.000Z");

test("authorized uploaded media start requires catalogue access, room authority, and ready asset", () => {
  assert.equal(
    canStartUploadedMedia({
      account: activeMemberAccount,
      assetStatus: "ready",
      authorization: activeAuthorization,
      roomAuthority: "allowed",
    }),
    true,
  );
  assert.equal(
    canStartUploadedMedia({
      account: activeOwnerAccount,
      assetStatus: "ready",
      authorization: null,
      roomAuthority: "allowed",
    }),
    true,
  );
});

test("uploaded media start denies missing allowlist, missing room authority, and non-ready assets", () => {
  assert.equal(
    canStartUploadedMedia({
      account: activeMemberAccount,
      assetStatus: "ready",
      authorization: null,
      roomAuthority: "allowed",
    }),
    false,
  );
  assert.equal(
    canStartUploadedMedia({
      account: activeMemberAccount,
      assetStatus: "ready",
      authorization: activeAuthorization,
      roomAuthority: "denied",
    }),
    false,
  );
  assert.equal(
    canStartUploadedMedia({
      account: activeMemberAccount,
      assetStatus: "processing",
      authorization: activeAuthorization,
      roomAuthority: "allowed",
    }),
    false,
  );
});

test("active room participants can watch an active uploaded room session", () => {
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: activeParticipant,
      roomId: "room-1",
      session: activeSession,
    }),
    {
      allowed: true,
      reason: "active_room_session",
    },
  );
});

test("watch access does not require catalogue allowlist state", () => {
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: {
        roomId: "room-1",
        status: "active",
      },
      roomId: "room-1",
      session: activeSession,
    }),
    {
      allowed: true,
      reason: "active_room_session",
    },
  );
});

test("inactive or missing participants cannot watch uploaded room media", () => {
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: null,
      roomId: "room-1",
      session: activeSession,
    }),
    {
      allowed: false,
      reason: "missing_participant",
    },
  );
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: {
        roomId: "room-1",
        status: "inactive",
      },
      roomId: "room-1",
      session: activeSession,
    }),
    {
      allowed: false,
      reason: "inactive_participant",
    },
  );
});

test("unrelated room sessions are denied", () => {
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: activeParticipant,
      roomId: "room-2",
      session: activeSession,
    }),
    {
      allowed: false,
      reason: "unrelated_room",
    },
  );
});

test("inactive, expired, and non-ready sessions are denied", () => {
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: activeParticipant,
      roomId: "room-1",
      session: {
        ...activeSession,
        status: "ended",
      },
    }),
    {
      allowed: false,
      reason: "inactive_session",
    },
  );
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "ready",
      now,
      participant: activeParticipant,
      roomId: "room-1",
      session: {
        ...activeSession,
        expiresAt: "2026-07-09T11:59:00.000Z",
      },
    }),
    {
      allowed: false,
      reason: "expired_session",
    },
  );
  assert.deepEqual(
    canWatchRoomMedia({
      assetStatus: "failed",
      now,
      participant: activeParticipant,
      roomId: "room-1",
      session: activeSession,
    }),
    {
      allowed: false,
      reason: "asset_not_ready",
    },
  );
});

test("room media session migration keeps session authority server-owned", async () => {
  const migrationSource = await readFile(
    path.join(
      rootDir,
      "supabase/migrations/20260709092938_room_media_sessions.sql",
    ),
    "utf8",
  );

  assert.match(migrationSource, /create table if not exists public\.room_media_sessions/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /revoke all on public\.room_media_sessions/);
  assert.match(migrationSource, /to service_role/);
  assert.match(migrationSource, /room_media_sessions_one_active_per_room_idx/);
  assert.doesNotMatch(migrationSource, /to authenticated/);
  assert.doesNotMatch(migrationSource, /to anon/);
});
