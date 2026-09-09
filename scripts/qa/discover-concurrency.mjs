import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Dedicated schema-only clone. Never accept a host URL or the active postgres DB.
const database = process.env.DISCOVER_QA_DATABASE;
assert.equal(
  database,
  "task029_discover_v2",
  "Use the isolated TASK-029 database",
);
const container = "supabase_db_mistake-watch-task028";
const account = "02900000-0000-4000-8000-000000000090";
const room = "02900000-0000-4000-8000-000000000091";

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
    child.stdout.on("data", (value) => {
      output += value;
    });
    child.stderr.on("data", (value) => {
      error += value;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(error)),
    );
    child.stdin.end(source);
  });
}
function feedback(actionId, state, revision) {
  const body = JSON.stringify({
    mediaId: "track029cas",
    actionId,
    kind: "feedback",
    surface: "recommended",
    state,
    expectedRevision: revision,
  });
  return `select public.record_personal_discover('${room}','${account}','${body}'::jsonb);`;
}

try {
  await sql(`begin;
    insert into auth.users(id,is_anonymous,raw_user_meta_data) values('${account}',false,'{"display_name":"Discover CAS QA"}');
    insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash)
      values('${room}','personal','${account}','Discover CAS QA','QA029CAS','fixture029cas');
    insert into public.room_members(id,room_id,user_id,display_name,role)
      values('02900000-0000-4000-8000-000000000092','${room}','${account}','Owner','host');
    commit;`);
  const results = (
    await Promise.all([
      sql(feedback("cas-a", "not_now", 0)),
      sql(feedback("cas-b", "do_not_suggest", 0)),
    ])
  ).map((value) => JSON.parse(value));
  assert.equal(
    results.filter((value) => value.status === "conflict").length,
    1,
  );
  assert.equal(results.filter((value) => value.item.revision === 1).length, 2);
  const duplicates = await Promise.all([
    sql(feedback("same-undo", "neutral", 1)),
    sql(feedback("same-undo", "neutral", 1)),
  ]);
  assert.deepEqual(JSON.parse(duplicates[0]), JSON.parse(duplicates[1]));
  assert.equal(JSON.parse(duplicates[0]).item.revision, 2);
  assert.equal(
    await sql(
      `select count(*) from private.personal_discover_interactions where user_id='${account}' and action_id='same-undo';`,
    ),
    "1",
  );
  console.log(
    "PASS: concurrent feedback has one winner; simultaneous retry has one revision and one observation.",
  );
} finally {
  await sql(`delete from auth.users where id='${account}';`);
}
