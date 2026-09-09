import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const selfWithdrawal = process.argv.includes("--self-withdrawal");
const container = "supabase_db_mistake-watch-task028";
const owner = "28400000-0000-4000-8000-000000000091";
const friend = "28400000-0000-4000-8000-000000000092";
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
  "select enabled from private.room_kind_features where room_kind='shared'",
);
function asUser(user, query) {
  return `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${user}',true); ${query}; commit;`;
}
try {
  await sql(
    `insert into auth.users(id,is_anonymous,raw_user_meta_data) values ('${owner}',false,'{}'),('${friend}',false,'{}'); update private.room_kind_features set enabled=true where room_kind='shared'`,
  );
  const request = "28400000-0000-4000-8000-000000000093";
  const outcomes = await Promise.all(
    Array.from({ length: 4 }, () =>
      sql(
        asUser(
          owner,
          `select public.create_shared_room('Concurrent Shared','${request}')`,
        ),
      ),
    ),
  );
  const ids = outcomes.map((x) =>
    x.split("\n").find((x) => /^[0-9a-f-]{36}$/.test(x) && x !== owner),
  );
  assert.ok(ids.every(Boolean));
  assert.equal(new Set(ids).size, 1);
  const room = ids[0];
  const invite = await sql(
    `select invite_code from public.rooms where id='${room}'`,
  );
  await sql(
    asUser(
      friend,
      `select public.request_shared_membership('${room}','${invite}')`,
    ),
  );
  await sql(
    asUser(
      owner,
      `select public.decide_shared_membership('${room}','${friend}',true)`,
    ),
  );
  let locked;
  const ready = new Promise((resolve) => {
    locked = resolve;
  });
  const holding = sql(
    `begin; select pg_advisory_xact_lock(hashtextextended('learning-consent:${room}:${friend}',0)); select 'LOCKED'; select pg_sleep(2); commit;`,
    (output) => {
      if (output.includes("LOCKED")) locked();
    },
  );
  await ready;
  const consent = sql(
    asUser(
      friend,
      `/* shared-consent-race */ select public.set_room_learning_consent('${room}',true,true)`,
    ),
  );
  // Wait for the actual conflicting transaction, not an arbitrary network delay.
  for (let i = 0; i < 40; i++) {
    const waiting = await sql(
      "select count(*) from pg_stat_activity where query like '%/* shared-consent-race */%' and wait_event='advisory'",
    );
    if (Number(waiting) > 0) break;
    if (i === 39) throw new Error("Consent did not reach the lock");
  }
  const removal = sql(
    asUser(
      selfWithdrawal ? friend : owner,
      selfWithdrawal
        ? `select public.leave_shared_room('${room}')`
        : `select public.decide_shared_membership('${room}','${friend}',false)`,
    ),
  );
  await Promise.allSettled([consent, removal, holding]);
  await removal;
  const active = await sql(
    `select count(*) from private.room_learning_consents where room_id='${room}' and user_id='${friend}' and revoked_at is null`,
  );
  assert.equal(
    active,
    "0",
    "a concurrent consent save must not survive removal",
  );
  console.log(
    `PASS: four create transactions returned one room; concurrent consent save and ${selfWithdrawal ? "self-withdrawal" : "owner removal"} left no active consent.`,
  );
} finally {
  await sql(
    `delete from auth.users where id in ('${owner}','${friend}'); update private.room_kind_features set enabled=${previous === "t"} where room_kind='shared'`,
  );
}
