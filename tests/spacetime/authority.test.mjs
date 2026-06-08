import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(root, "spacetime/src/index.ts");
const serverHelperPath = path.join(root, "lib/rooms/live-authority.ts");

const spacetimeSource = await readFile(sourcePath, "utf8");
const serverHelperSource = await readFile(serverHelperPath, "utf8");

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);

  return source.slice(startIndex, endIndex);
}

test("room seed grant authority tables are private", () => {
  const grantTable = sectionBetween(
    spacetimeSource,
    "const roomSeedGrant = table(",
    "const trustedSeedIssuer = table(",
  );
  const trustedIssuerTable = sectionBetween(
    spacetimeSource,
    "const trustedSeedIssuer = table(",
    "const spacetimedb = schema(",
  );

  assert.match(grantTable, /name:\s*"room_seed_grant"/);
  assert.match(trustedIssuerTable, /name:\s*"trusted_seed_issuer"/);
  assert.doesNotMatch(grantTable, /public:\s*true/);
  assert.doesNotMatch(trustedIssuerTable, /public:\s*true/);
});

test("env-secret room seed validation has been removed", () => {
  for (const removedSymbol of [
    "SPACETIME_ROOM_SEED_SECRET",
    "LIVE_ROOM_SEED_SECRET",
    "getRoomSeedSecret",
    "hasValidRoomSeedToken",
    "buildRoomSeedToken",
    "roomSeedTokenVersion",
  ]) {
    assert.equal(
      spacetimeSource.includes(removedSymbol),
      false,
      `${removedSymbol} should not remain in the SpacetimeDB module`,
    );
  }
});

test("seed grant issuer requires trusted server identity before insert", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const issue_room_seed_grant",
    "export const seed_room_session",
  );
  const trustCheckIndex = reducer.indexOf("!isTrustedSeedIssuer(ctx)");
  const insertIndex = reducer.indexOf("ctx.db.room_seed_grant.insert");

  assert.notEqual(trustCheckIndex, -1);
  assert.notEqual(insertIndex, -1);
  assert.ok(
    trustCheckIndex < insertIndex,
    "trusted issuer check must happen before inserting seed grants",
  );
});

test("seed room session requires and consumes a private grant", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const seed_room_session",
    "export const update_room_name",
  );
  const validationIndex = reducer.indexOf("getValidRoomSeedGrant");
  const deleteIndex = reducer.indexOf("ctx.db.room_seed_grant.delete(seedGrant)");
  const insertIndex = reducer.indexOf("ctx.db.room_session.insert", deleteIndex);

  assert.notEqual(validationIndex, -1);
  assert.notEqual(deleteIndex, -1);
  assert.notEqual(insertIndex, -1);
  assert.ok(validationIndex < insertIndex);
  assert.ok(deleteIndex < insertIndex);
});

test("seed grant validation rejects expired and mismatched grants", () => {
  const helper = sectionBetween(
    spacetimeSource,
    "function getValidRoomSeedGrant",
    "function kickKey",
  );

  assert.match(helper, /grant\.expires_ms\s*<\s*nowMs\(\)/);
  assert.match(helper, /ctx\.db\.room_seed_grant\.delete\(grant\)/);
  assert.match(helper, /grant\.room_id\s*!==\s*roomId/);
  assert.match(helper, /grant\.host_member_id\s*!==\s*hostMemberId/);
  assert.match(helper, /constantTimeStringEqual\(grant\.seed_token,\s*seedToken\.trim\(\)\)/);
});

test("server helper issues random one-time seed grants with server auth token", () => {
  assert.match(serverHelperSource, /SPACETIME_SERVER_AUTH_TOKEN/);
  assert.match(
    serverHelperSource,
    /randomBytes\(SEED_TOKEN_BYTES\)\.toString\("base64url"\)/,
  );
  assert.match(serverHelperSource, /issueRoomSeedGrant/);
  assert.doesNotMatch(serverHelperSource, /SPACETIME_ROOM_SEED_SECRET/);
  assert.doesNotMatch(serverHelperSource, /LIVE_ROOM_SEED_SECRET/);
});

test("play queue item reducer uses playback authority", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const play_queue_item",
    "export const move_queue_item",
  );

  assert.match(reducer, /getAuthorizedPlaybackActor\(ctx,\s*room_id,\s*actor_member_id\)/);
  assert.doesNotMatch(reducer, /getAuthorizedHost\(ctx,\s*room_id,\s*actor_member_id\)/);
});

test("add queue item prevents duplicate active sources", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const add_queue_item",
    "export const remove_queue_item",
  );

  assert.match(reducer, /findDuplicateActiveQueueItem\(ctx,\s*room_id,\s*source_type,\s*trimmedUrl\)/);
  assert.match(reducer, /queue_duplicate_ignored/);
});
