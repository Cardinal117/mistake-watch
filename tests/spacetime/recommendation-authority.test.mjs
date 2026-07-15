import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const indexSource = await readFile(
  path.join(root, "spacetime/src/index.ts"),
  "utf8",
);
const tablesSource = await readFile(
  path.join(root, "spacetime/src/recommendation-tables.ts"),
  "utf8",
);
const eventsSource = await readFile(
  path.join(root, "spacetime/src/recommendation-events.ts"),
  "utf8",
);
const authoritySource = await readFile(
  path.join(root, "spacetime/src/recommendation-authority.ts"),
  "utf8",
);
const queuePanelSource = await readFile(
  path.join(root, "components/room/queue-panel.tsx"),
  "utf8",
);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("recommendation authority state remains private", () => {
  for (const tableName of [
    "recommendation_event_outbox",
    "recommendation_event_overflow",
    "recommendation_playback_occurrence",
    "recommendation_processed_action",
    "guest_media_preference",
  ]) {
    const tableStart = tablesSource.indexOf(`name: "${tableName}"`);
    assert.notEqual(tableStart, -1, tableName);
    const surrounding = tablesSource.slice(
      Math.max(0, tableStart - 250),
      tableStart + 250,
    );
    assert.doesNotMatch(surrounding, /public:\s*true/, tableName);
  }
});

test("trusted procedure checks identity before reading the outbox", () => {
  const procedure = sectionBetween(
    authoritySource,
    "export const read_recommendation_event_outbox",
    "export const acknowledge_recommendation_event_outbox",
  );
  assert.ok(
    procedure.indexOf("trusted_seed_issuer") <
      procedure.indexOf("recommendation_event_outbox.iter"),
  );
});

test("acknowledgement is trusted, bounded, and retry-safe", () => {
  const reducer = sectionBetween(
    authoritySource,
    "export const acknowledge_recommendation_event_outbox",
    "export const set_guest_media_preference",
  );
  assert.match(reducer, /!isTrustedRecommendationAuthority\(ctx\)/);
  assert.match(reducer, /event_ids\.slice\(0, 100\)/);
  assert.match(reducer, /acknowledged\.has\(event\.event_id\)/);
});

test("guest preferences verify identity, revision, and action id", () => {
  const reducer = sectionBetween(
    authoritySource,
    "export const set_guest_media_preference",
    "export const read_my_guest_media_preferences",
  );
  assert.match(reducer, /actor\.identity\.isEqual\(ctx\.sender\)/);
  assert.match(reducer, /expected_revision/);
  assert.match(reducer, /claimRecommendationAction/);
  assert.match(eventsSource, /current\?\.revision \?\? 0/);
  assert.match(eventsSource, /if \(!actionId\) \{\s*return false;/);
});

test("trusted account preference can neutralize a durable Like baseline", () => {
  const reducer = sectionBetween(
    authoritySource,
    "export const set_verified_room_media_preference",
    "export const read_my_guest_media_preferences",
  );

  assert.match(reducer, /!isTrustedRecommendationAuthority\(ctx\)/);
  assert.match(reducer, /record_neutral_without_current: t\.bool\(\)/);
  assert.match(
    reducer,
    /recordNeutralWithoutCurrent: record_neutral_without_current/,
  );
  assert.match(eventsSource, /!input\.recordNeutralWithoutCurrent/);
});

test("playback retries are occurrence-bound and completion is classified", () => {
  for (const reducerName of [
    "advance_queue_item",
    "advance_uploaded_queue_item",
  ]) {
    const start = `export const ${reducerName}`;
    const startIndex = indexSource.indexOf(start);
    const endIndex = indexSource.indexOf("export const ", startIndex + 1);
    const reducer = indexSource.slice(startIndex, endIndex);
    assert.match(reducer, /expected_playback_occurrence_id/);
    assert.match(reducer, /classifyPlaybackAdvance/);
  }

  const failureReducer = sectionBetween(
    indexSource,
    "export const report_media_failure",
    "export const play_queue_item",
  );
  assert.match(failureReducer, /expected_playback_occurrence_id/);
  assert.match(failureReducer, /session\.playback_occurrence_id/);
});

test("multi-move queue actions share an event id without suppressing later actions", () => {
  const reducer = sectionBetween(
    indexSource,
    "export const move_queue_item",
    "export const remove_queue_item",
  );
  assert.match(reducer, /client_action_id/);
  assert.match(reducer, /!client_action_id\.trim\(\)/);
  assert.match(reducer, /actionId: client_action_id/);
  assert.match(
    eventsSource,
    /input\.actionId\?\.trim\(\)[\s\S]*input\.actorMemberId[\s\S]*input\.actionId\.trim\(\)/,
  );
  assert.match(
    queuePanelSource,
    /const clientActionId = crypto\.randomUUID\(\)/,
  );
  assert.match(
    queuePanelSource,
    /onMoveQueueItem\?\.\(item\.queueItemId, index, clientActionId\)/,
  );
});

test("member ids cannot be rebound to another Spacetime identity", () => {
  const reducer = sectionBetween(
    indexSource,
    "export const join_room",
    "export const leave_room",
  );
  assert.match(reducer, /!existing\.identity\.isEqual\(ctx\.sender\)/);
  assert.match(reducer, /member_identity_conflict/);
});

test("outbox overflow preserves queued rows and records dropped events", () => {
  assert.match(tablesSource, /RECOMMENDATION_OUTBOX_ROOM_LIMIT = 5_000/);
  assert.match(eventsSource, /recommendation_event_overflow\.insert/);
  assert.doesNotMatch(eventsSource, /pruneRecommendationOutbox/);
});

test("authority reducers emit transitions without playback ticks", () => {
  assert.doesNotMatch(indexSource, /playback_tick/);
  assert.match(indexSource, /recordSourceFailureEvent/);
  assert.match(indexSource, /finishPlaybackOccurrence/);
  assert.match(indexSource, /beginPlaybackOccurrence/);
});
