import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const container = "supabase_db_mistake-watch-task028";
const room = "28700000-0000-4000-8000-000000000091";
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
      "task028_replay_286_verified",
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

try {
  await sql(
    `insert into public.rooms(id,name,mode,privacy,status,invite_code,invite_token_hash) values('${room}','Retirement race QA','watch','invite','open','R3RACE',repeat('a',64));update public.rooms set status='closed' where id='${room}';`,
  );
  assert.equal(
    JSON.parse(
      await sql(`select public.pending_persistent_room_retirements('${room}')`),
    )[0].purge,
    false,
  );
  let signal;
  const locked = new Promise((resolve) => (signal = resolve));
  const deletion = sql(
    `begin;delete from public.rooms where id='${room}';select 'delete-locked';select pg_sleep(2);commit;`,
    (text) => {
      if (text.includes("delete-locked")) signal();
    },
  );
  await locked;
  // Waits behind DELETE's receipt update, then must see the stronger job.
  const ack = await sql(
    `select public.finish_persistent_room_retirement('${room}',false)`,
  );
  await deletion;
  assert.equal(ack, "f");
  assert.equal(
    JSON.parse(
      await sql(`select public.pending_persistent_room_retirements('${room}')`),
    )[0].purge,
    true,
  );
  const replies = await Promise.all(
    Array.from({ length: 4 }, () =>
      sql(`select public.finish_persistent_room_retirement('${room}',true)`),
    ),
  );
  assert.deepEqual(replies, ["t", "t", "t", "t"]);
  assert.equal(
    await sql(`select public.has_persistent_room_ended('${room}')`),
    "t",
  );
  console.log(
    "PASS: stale close acknowledgement waits for concurrent DELETE and cannot finish its purge; duplicate purge acknowledgements are idempotent; ended receipt survives.",
  );
} finally {
  await sql(
    `delete from public.rooms where id='${room}' and name='Retirement race QA';delete from private.persistent_room_retirements where room_id='${room}';`,
  );
}
