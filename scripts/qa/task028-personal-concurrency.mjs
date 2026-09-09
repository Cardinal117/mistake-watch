import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Explicitly local. No URL or container override can target a hosted database.
const container = "supabase_db_mistake-watch-task028";
const account = "28200000-0000-4000-8000-000000000099";
function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [
      "exec",
      "-i",
      container,
      "psql",
      "-XAtq",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ]);
    let output = "",
      errors = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(errors)),
    );
    child.stdin.end(query);
  });
}
const previous = await sql(
  "select enabled from private.room_kind_features where room_kind='personal'",
);
try {
  await sql(
    `insert into auth.users(id,is_anonymous,raw_user_meta_data) values ('${account}',false,'{"display_name":"Concurrent QA"}'); update private.room_kind_features set enabled=true;`,
  );
  const query = `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${account}',true); select public.open_personal_room(); select pg_sleep(1); commit;`;
  const outcomes = await Promise.all(
    Array.from({ length: 4 }, () => sql(query)),
  );
  const ids = outcomes.map((output) =>
    output
      .split("\n")
      .filter((line) => /^[0-9a-f-]{36}$/.test(line) && line !== account),
  );
  assert.ok(ids.every((result) => result.length === 1));
  assert.equal(
    new Set(ids.flat()).size,
    1,
    "four simultaneous sessions must return one ID",
  );
  const counts = await sql(
    `select (select count(*) from public.rooms where owner_user_id='${account}'), (select count(*) from public.room_members where user_id='${account}'), (select count(*) from public.room_settings where room_id='${ids[0][0]}')`,
  );
  assert.equal(counts, "1|1|1");
  console.log(
    "PASS: four independent transactions returned one room, one membership and one settings row.",
  );
} finally {
  await sql(
    `delete from auth.users where id='${account}'; update private.room_kind_features set enabled=${previous === "t"};`,
  );
}
