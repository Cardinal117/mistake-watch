import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Explicit local synthetic database only. Never accepts a URL or active postgres.
assert.equal(process.env.CATALOGUE_QA_DATABASE, "task030_catalogue_replay");
const database = "task030_catalogue_replay";
const container = "supabase_db_mistake-watch-task028";

function sql(source) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        database,
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-At",
      ],
      { windowsHide: true },
    );
    let output = "",
      error = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      error += data;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(error || `psql exited ${code}`)),
    );
    child.stdin.end(source);
  });
}

const run = () =>
  sql(
    "set role service_role; select public.run_catalogue_retention_maintenance();",
  ).then(JSON.parse);
const original = await sql(
  "select row_to_json(s)::text from private.catalogue_maintenance_state s;",
);
assert.ok(original, "migration must seed the singleton schedule");

try {
  await sql(`
    update private.catalogue_maintenance_state set next_due_at='-infinity';
    insert into private.music_catalogue_sources(media_id,last_used_at)
      values('schedrace001',clock_timestamp()) on conflict do nothing;
    insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at)
      values('schedrace001','Concurrency fixture',clock_timestamp()-interval '27 days',clock_timestamp()-interval '1 second');
    create or replace function private.qa_delay_catalogue_cleanup() returns trigger
      language plpgsql as $$ begin perform pg_sleep(1); return old; end $$;
    create trigger qa_delay_catalogue_cleanup before delete on private.music_catalogue_metadata
      for each row when(old.media_id='schedrace001') execute function private.qa_delay_catalogue_cleanup();
  `);
  const started = Date.now();
  const results = await Promise.all(Array.from({ length: 8 }, run));
  const elapsed = Date.now() - started;
  assert.equal(
    results.filter((result) => result.status === "completed").length,
    1,
  );
  assert.equal(
    results.filter((result) => ["busy", "not_due"].includes(result.status))
      .length,
    7,
  );
  assert.ok(
    elapsed < 4_000,
    `contenders should not wait for the cleanup lock (${elapsed}ms)`,
  );
  assert.equal(
    await sql(
      "select count(*) from private.music_catalogue_metadata where media_id='schedrace001';",
    ),
    "0",
  );
  console.log(
    "PASS: eight independent callers produce one cleanup; contenders return busy/not-due promptly and the expired row is deleted once.",
  );
} finally {
  const escaped = original.replaceAll("'", "''");
  await sql(`
    drop trigger if exists qa_delay_catalogue_cleanup on private.music_catalogue_metadata;
    drop function if exists private.qa_delay_catalogue_cleanup();
    delete from private.music_catalogue_metadata where media_id='schedrace001';
    delete from private.music_catalogue_sources where media_id='schedrace001';
    delete from private.catalogue_maintenance_state;
    insert into private.catalogue_maintenance_state
      select * from json_populate_record(null::private.catalogue_maintenance_state,'${escaped}'::json);
  `);
}
