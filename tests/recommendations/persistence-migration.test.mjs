import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBoundedColumn,
  assertServiceOnlyTable,
  functionDefinition,
  loadMigration,
  tableDefinition,
} from "./persistence-test-helpers.mjs";

test("durable recommendation tables are service-only and URL-free", async () => {
  const sql = await loadMigration();
  const tableNames = [
    "recommendation_event_tombstones",
    "recommendation_events",
    "recommendation_media_aggregates",
    "media_preferences",
  ];

  for (const tableName of tableNames) {
    assertServiceOnlyTable(sql, tableName);
  }

  assert.match(
    tableDefinition(sql, "recommendation_events"),
    /expires_at timestamptz not null/,
  );
  assert.match(
    tableDefinition(sql, "recommendation_media_aggregates"),
    /expires_at timestamptz not null/,
  );
  assert.match(
    tableDefinition(sql, "media_preferences"),
    /neutral_expires_at timestamptz/,
  );
  assert.doesNotMatch(
    tableNames.map((name) => tableDefinition(sql, name)).join(" "),
    /\b(?:source_url|signed_url|public_url|r2_url)\b/,
  );
  for (const definition of [
    tableDefinition(sql, "recommendation_events"),
    tableDefinition(sql, "recommendation_media_aggregates"),
    tableDefinition(sql, "media_preferences"),
  ]) {
    assert.match(
      definition,
      /references auth\.users\s*\(id\) on delete cascade/,
    );
  }
  assert.doesNotMatch(
    sql,
    /grant .* on (?:table )?public\.(?:recommendation_event_tombstones|recommendation_events|recommendation_media_aggregates|media_preferences) to (?:public|anon|authenticated)/,
  );
  assert.match(sql, /grant select on public\.room_members to service_role/);
});

test("durable schema constrains identity, scope, retention, and read paths", async () => {
  const sql = await loadMigration();
  const tombstones = tableDefinition(sql, "recommendation_event_tombstones");
  const events = tableDefinition(sql, "recommendation_events");
  const aggregates = tableDefinition(sql, "recommendation_media_aggregates");
  const preferences = tableDefinition(sql, "media_preferences");

  assert.match(
    events,
    /(?:event_id|authority_event_id) [^,]*(?:primary key|unique)/,
  );
  assert.match(events, /idempotency_key [^,]*(?:primary key|unique)/);
  assert.match(tombstones, /authority_event_id [^,]*(?:primary key|unique)/);
  assert.match(tombstones, /idempotency_key [^,]*unique/);
  assert.match(tombstones, /payload_fingerprint text not null/);
  assert.doesNotMatch(
    tombstones,
    /account_user_id|actor_member_id|media_id|source_type/,
  );
  for (const definition of [events, aggregates, preferences]) {
    assertBoundedColumn(definition, "source_type");
    assertBoundedColumn(definition, "media_id");
  }
  assertBoundedColumn(events, "reason");
  assert.match(
    events,
    /room_id uuid not null references public\.rooms\s*\(id\) on delete cascade/,
  );
  assert.match(events, /room_session_id text not null/);
  assert.match(
    aggregates,
    /check \([^;]*scope_type = 'account'[^;]*account_user_id is not null[^;]*scope_type = 'room_session'[^;]*account_user_id is null[^;]*room_id is not null[^;]*room_session_id is not null[^;]*\)/,
  );
  assert.match(preferences, /unique \(user_id, source_type, media_id\)/);
  assert.match(
    sql,
    /create index [^;]+recommendation_events[^;]+room_id[^;]+room_session_id[^;]+occurred_at/,
  );
  assert.match(
    sql,
    /create unique index [^;]+recommendation_media_aggregates[^;]+account_user_id[^;]+source_type[^;]+media_id/,
  );
  assert.match(
    sql,
    /create unique index [^;]+recommendation_media_aggregates[^;]+room_id[^;]+room_session_id[^;]+source_type[^;]+media_id/,
  );
  assert.match(
    sql,
    /create index [^;]+media_preferences[^;]+user_id[^;]+preference_state[^;]+updated_at/,
  );
  assert.match(sql, /delete from public\.recommendation_events[^;]+expires_at/);
  assert.match(
    sql,
    /delete from public\.recommendation_event_tombstones[^;]+expires_at/,
  );
  assert.match(
    sql,
    /delete from public\.recommendation_media_aggregates[^;]+expires_at/,
  );
  assert.match(
    sql,
    /delete from public\.media_preferences[^;]+neutral_expires_at/,
  );
});

test("ingest RPC is invoker-only, collision-safe, and updates only new rows", async () => {
  const sql = await loadMigration();
  const publicFunction = functionDefinition(
    sql,
    "public",
    "ingest_recommendation_events",
  );
  const ingestFunction = functionDefinition(
    sql,
    "private",
    "ingest_recommendation_events",
  );

  assert.match(publicFunction, /security invoker/);
  assert.match(ingestFunction, /security invoker/);
  assert.doesNotMatch(publicFunction, /security definer/);
  assert.doesNotMatch(ingestFunction, /security definer/);
  assert.match(
    sql,
    /revoke all(?: privileges)? on function public\.ingest_recommendation_events\([^;]+\) from public(?:, anon, authenticated)?/,
  );
  assert.match(
    sql,
    /grant execute on function public\.ingest_recommendation_events\([^;]+\) to service_role/,
  );
  assert.match(
    ingestFunction,
    /insert into public\.recommendation_event_tombstones[^]*on conflict do nothing/,
  );
  assert.match(
    ingestFunction,
    /payload_fingerprint is distinct from event_fingerprint/,
  );
  assert.match(ingestFunction, /returning [^;]+ into inserted_event/);
  assert.match(
    ingestFunction,
    /if inserted_tombstone\.authority_event_id is null then[^]*idempotency collision has conflicting payload[^]*continue; end if;/,
  );
  assert.match(
    ingestFunction,
    /input_event - array\['account_user_id', 'ingested_at', 'expires_at'\]::text\[\]/,
  );
  assert.match(ingestFunction, /event_ingested_at \+ interval '180 days'/);
  assert.match(
    ingestFunction,
    /verified_account_user_id is null then interval '30 days'[^]*else interval '180 days'/,
  );
  assert.doesNotMatch(ingestFunction, /input_event->>'expires_at'/);
  assert.match(
    ingestFunction,
    /'room_session'[^]*inserted_event\.ingested_at \+ interval '30 days'/,
  );
  assert.match(
    ingestFunction,
    /'account'[^]*inserted_event\.ingested_at \+ interval '180 days'/,
  );
  assert.ok(
    ingestFunction.indexOf("inserted_tombstone.authority_event_id is null") <
      ingestFunction.indexOf(
        "insert into public.recommendation_media_aggregates",
      ),
  );
  assert.match(ingestFunction, /insert into public\.media_preferences/);
  assert.match(
    ingestFunction,
    /on conflict[^;]+do update[^;]+where[^;]+excluded\.source_event_at[^;]+media_preferences\.source_event_at/,
  );
});
