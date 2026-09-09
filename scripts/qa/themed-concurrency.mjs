import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const container = "supabase_db_mistake-watch-task028";
const owner = "28500000-0000-4000-8000-000000000091";
function sql(query, onOutput = () => {}) {
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
      onOutput(output);
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
  "select enabled from private.room_kind_features where room_kind='themed'",
);
function asOwner(query) {
  return `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${owner}',true); ${query}; commit;`;
}
try {
  await sql(
    `insert into auth.users(id,is_anonymous,raw_user_meta_data) values ('${owner}',false,'{}'); update private.room_kind_features set enabled=true where room_kind='themed'`,
  );
  const outputs = await Promise.all(
    Array.from({ length: 4 }, () =>
      sql(
        asOwner(
          "select public.create_themed_room('Concurrent theme','Fantasy','','28500000-0000-4000-8000-000000000093')",
        ),
      ),
    ),
  );
  const ids = outputs.map((x) =>
    x.split("\n").find((x) => /^[0-9a-f-]{36}$/.test(x) && x !== owner),
  );
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids).size, 1);
  const room = ids[0];
  const edits = await Promise.allSettled(
    Array.from({ length: 4 }, (_, i) =>
      sql(
        asOwner(
          `select public.change_room_direction('${room}',1,'Fantasy ${i}','')`,
        ),
      ),
    ),
  );
  assert.equal(edits.filter((e) => e.status === "fulfilled").length, 1);
  assert.equal(
    edits.filter(
      (e) => e.status === "rejected" && /another device/.test(e.reason.message),
    ).length,
    3,
  );
  assert.equal(
    await sql(
      `select version from private.room_theme_directions where room_id='${room}'`,
    ),
    "2",
  );
  console.log(
    "PASS: four concurrent creates return one room; four competing edits yield one version-2 winner and three explicit conflicts.",
  );
} finally {
  await sql(
    `delete from auth.users where id='${owner}'; update private.room_kind_features set enabled=${previous === "t" ? "true" : "false"} where room_kind='themed'`,
  );
}
