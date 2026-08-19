import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const sourcePath = path.join(root, "spacetime/src/index.ts");
const roomTablesPath = path.join(root, "spacetime/src/room-tables.ts");
const serverHelperPath = path.join(root, "lib/rooms/live-authority.ts");
const mediaReferencesPath = path.join(
  root,
  "spacetime/src/media-references.ts",
);
const queueCalculationsPath = path.join(
  root,
  "spacetime/src/queue-calculations.ts",
);

const spacetimeSource = await readFile(sourcePath, "utf8");
const roomTablesSource = await readFile(roomTablesPath, "utf8");
const serverHelperSource = await readFile(serverHelperPath, "utf8");
const mediaReferencesSource = await readFile(mediaReferencesPath, "utf8");
const queueCalculationsSource = await readFile(queueCalculationsPath, "utf8");

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);

  return source.slice(startIndex, endIndex);
}

test("room seed grant authority tables are private", () => {
  const grantTable = sectionBetween(
    roomTablesSource,
    "export const roomSeedGrant = table(",
    "export const trustedSeedIssuer = table(",
  );
  const trustedIssuerTable = roomTablesSource.slice(
    roomTablesSource.indexOf("export const trustedSeedIssuer = table("),
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
  const trustCheckIndex = reducer.indexOf(
    "!isTrustedRecommendationAuthority(ctx)",
  );
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
  const deleteIndex = reducer.indexOf(
    "ctx.db.room_seed_grant.delete(seedGrant)",
  );
  const insertIndex = reducer.indexOf(
    "ctx.db.room_session.insert",
    deleteIndex,
  );

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
    "function getAuthorizedHost",
  );

  assert.match(helper, /grant\.expires_ms\s*<\s*nowMs\(\)/);
  assert.match(helper, /ctx\.db\.room_seed_grant\.delete\(grant\)/);
  assert.match(helper, /grant\.room_id\s*!==\s*roomId/);
  assert.match(helper, /grant\.host_member_id\s*!==\s*hostMemberId/);
  assert.match(
    helper,
    /constantTimeStringEqual\(grant\.seed_token,\s*seedToken\.trim\(\)\)/,
  );
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

  assert.match(
    reducer,
    /getAuthorizedPlaybackActor\(ctx,\s*room_id,\s*actor_member_id\)/,
  );
  assert.doesNotMatch(
    reducer,
    /getAuthorizedHost\(ctx,\s*room_id,\s*actor_member_id\)/,
  );
});

test("queue management reducers use queue-management authority", () => {
  for (const [name, nextName] of [
    ["export const set_queue_item_priority", "export const play_queue_item"],
    ["export const move_queue_item", "export const remove_queue_item"],
    ["export const remove_queue_item", "export const clear_queue"],
    ["export const clear_queue", "export const set_member_permissions"],
  ]) {
    const reducer = sectionBetween(spacetimeSource, name, nextName);

    assert.match(
      reducer,
      /getAuthorizedQueueManager\(ctx,\s*room_id,\s*actor_member_id\)/,
      `${name} must use queue-management authority`,
    );
  }
});

test("member queue permission grants add and manage authority together", () => {
  const permissionTable = sectionBetween(
    roomTablesSource,
    "export const roomPermission = table(",
    "export const liveQueueItem = table(",
  );
  const reducer = sectionBetween(
    spacetimeSource,
    "export const set_member_permissions",
    "export const grant_room_control",
  );

  assert.match(permissionTable, /can_manage_queue/);
  assert.match(reducer, /can_manage_queue:\s*t\.bool\(\)/);
  assert.match(
    reducer,
    /canManageQueue:\s*targetIsHost\s*\|\|\s*can_add_queue\s*\|\|\s*can_manage_queue/,
  );
});

test("add queue item prevents duplicate active sources", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const add_queue_item",
    "export const remove_queue_item",
  );

  assert.match(
    reducer,
    /findDuplicateActiveQueueItem\(ctx,\s*room_id,\s*source_type,\s*trimmedUrl\)/,
  );
  assert.match(reducer, /queue_duplicate_ignored/);
});

test("duplicate queue protection allows explicit add-anyway override", () => {
  const reducer = sectionBetween(
    spacetimeSource,
    "export const add_queue_item",
    "export const send_room_chat_message",
  );

  assert.match(reducer, /allow_duplicate:\s*t\.bool\(\)\.default\(false\)/);
  assert.match(reducer, /!allow_duplicate\s*&&\s*findDuplicateActiveQueueItem/);
});

test("played queue items receive server-authoritative history sequence", () => {
  const helper = sectionBetween(
    spacetimeSource,
    "function nextPlayedSequence",
    "function playNextQueuePosition",
  );
  const reducer = sectionBetween(
    spacetimeSource,
    "export const play_queue_item",
    "export const move_queue_item",
  );
  const commitHelper = sectionBetween(
    spacetimeSource,
    "function commitQueueAdvance",
    "function normalizeQueuedPositions",
  );

  assert.match(helper, /calculateNextPlayedSequence\(items\)/);
  assert.match(queueCalculationsSource, /played_sequence/);
  assert.match(reducer, /commitQueueAdvance/);
  assert.match(
    commitHelper,
    /played_sequence:\s*nextPlayedSequence\(ctx,\s*session\.room_id\)/,
  );
  assert.match(commitHelper, /played_sequence:\s*0/);
});

test("autoplay queue advancement is atomic and stale-safe", () => {
  const helper = sectionBetween(
    spacetimeSource,
    "function nextPlaybackQueueItem",
    "function playNextQueuePosition",
  );
  const normalReducer = sectionBetween(
    spacetimeSource,
    "export const advance_queue_item",
    "export const advance_uploaded_queue_item",
  );
  const uploadedReducer = sectionBetween(
    spacetimeSource,
    "export const advance_uploaded_queue_item",
    "export const report_media_failure",
  );
  const commitHelper = sectionBetween(
    spacetimeSource,
    "function commitQueueAdvance",
    "function normalizeQueuedPositions",
  );

  assert.match(helper, /queueMode/);
  assert.match(helper, /status === "queued"/);
  assert.match(helper, /normalizeQueueMode\(queueMode\) !== "loop"/);
  assert.match(helper, /status === "played"/);
  assert.match(
    normalReducer,
    /expected_active_queue_item_id:\s*t\.option\(t\.string\(\)\)/,
  );
  assert.match(
    normalReducer,
    /expected_source_url:\s*t\.option\(t\.string\(\)\)/,
  );
  assert.doesNotMatch(normalReducer, /expected_next_queue_item_id/);
  assert.doesNotMatch(normalReducer, /resolved_source_url/);
  assert.match(uploadedReducer, /expected_next_queue_item_id:\s*t\.string\(\)/);
  assert.match(uploadedReducer, /resolved_source_url:\s*t\.string\(\)/);
  assert.match(uploadedReducer, /authority\.session\.queue_autoplay_enabled/);
  assert.match(
    uploadedReducer,
    /nextPlaybackQueueItem\([\s\S]*ctx,[\s\S]*room_id,[\s\S]*authority\.session\.queue_mode/,
  );
  assert.match(
    uploadedReducer,
    /nextQueueItem\.queue_item_id !== expectedNextQueueItemId/,
  );
  assert.match(uploadedReducer, /resolveQueuePlaybackSource/);
  assert.match(uploadedReducer, /commitQueueAdvance/);
  assert.match(
    commitHelper,
    /active_queue_item_id:\s*nextQueueItem\.queue_item_id/,
  );
  assert.match(commitHelper, /source_url:\s*sourceUrl/);
  assert.match(commitHelper, /status:\s*"playing"/);
  assert.match(
    commitHelper,
    /played_sequence:\s*nextPlayedSequence\(ctx,\s*session\.room_id\)/,
  );
  assert.ok(
    uploadedReducer.indexOf(
      "nextQueueItem.queue_item_id !== expectedNextQueueItemId",
    ) < uploadedReducer.indexOf("commitQueueAdvance"),
    "stale next-item rejection must happen before queue mutation",
  );
  assert.ok(
    uploadedReducer.indexOf("if (!nextSourceUrl)") <
      uploadedReducer.indexOf("commitQueueAdvance"),
    "source validation must happen before queue mutation",
  );
});

test("uploaded autoplay source replacement is opaque and type constrained", () => {
  assert.match(spacetimeSource, /from "\.\/media-references"/);
  assert.match(mediaReferencesSource, /mw-uploaded-asset:/);
  assert.match(mediaReferencesSource, /mw-uploaded-session:/);
  assert.match(mediaReferencesSource, /normalized\.length <= 512/);
  assert.match(
    mediaReferencesSource,
    /isUploadedAssetReference\(normalizedQueueSourceUrl\)/,
  );
  assert.match(
    mediaReferencesSource,
    /isUploadedSessionReference\(normalizedResolvedSourceUrl\)/,
  );
  assert.match(
    mediaReferencesSource,
    /return normalizedResolvedSourceUrl \? null : normalizedQueueSourceUrl/,
  );
});
