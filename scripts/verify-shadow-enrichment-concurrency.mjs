import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
if (!process.argv.includes("--local-fixture"))
  throw Error(
    "Pass --local-fixture for isolated synthetic database verification.",
  );
const database = "task030_catalogue_replay",
  account = randomUUID(),
  media = "shadow" + randomUUID().replaceAll("-", "");
function sql(statement) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_mistake-watch-task028",
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
    let out = "",
      err = "";
    p.stdout.on("data", (v) => (out += v));
    p.stderr.on("data", (v) => (err += v));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(Error(err)),
    );
    p.stdin.end(statement);
  });
}
let prior,
  seeded = false,
  ownedToken;
try {
  assert.equal(await sql("select current_database();"), database);
  assert.equal(
    await sql("select count(*) from private.shadow_enrichment_jobs;"),
    "0",
  );
  assert.equal(
    await sql("select count(*) from private.musicbrainz_jobs;"),
    "0",
  );
  prior = JSON.parse(
    await sql(
      "select row_to_json(r) from private.musicbrainz_rate r where id;",
    ),
  );
  assert.equal(
    await sql(
      "select (next_at<=clock_timestamp() and coalesce(lease_until<=clock_timestamp(),true) and used<99)::text from private.musicbrainz_rate where id;",
    ),
    "true",
  );
  await sql(`begin;insert into auth.users(id,is_anonymous,raw_user_meta_data) values('${account}',false,'{}');
 insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at) values('${account}','youtube','${media}','liked','${randomUUID()}',now());
 insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,fetched_at,expires_at) values('${media}','Synthetic song','Synthetic artist - Topic',100,now(),now()+interval '1 day');
 select public.enqueue_shadow_enrichment('${account}','${media}');commit;`);
  seeded = true;
  const claims = (
    await Promise.all([
      sql(`select public.claim_shadow_enrichment('${account}','any');`),
      sql(`select public.claim_shadow_enrichment('${account}','any');`),
    ])
  ).map(JSON.parse);
  const wins = claims.filter((c) => c.token);
  assert.equal(wins.length, 1);
  const winner = wins[0];
  ownedToken = winner.token;
  assert.equal(winner.snapshot.mediaId, media);
  assert.equal(winner.snapshot.durationSeconds, 100);
  assert.equal(typeof winner.snapshot.expiresAt, "number");
  assert.equal(
    await sql(
      `select attempts from private.shadow_enrichment_jobs where id='${winner.jobId}';`,
    ),
    "1",
  );
  const outcome = JSON.stringify({
    status: "unresolved",
    rule: "exact-credit-version-duration-v1",
    reason: "fixture-abstention",
  });
  const completions = await Promise.all([
    sql(
      `select public.complete_shadow_enrichment('${winner.jobId}','${ownedToken}','${outcome}');`,
    ),
    sql(
      `select public.complete_shadow_enrichment('${winner.jobId}','${ownedToken}','${outcome}');`,
    ),
  ]);
  assert.deepEqual(completions, ["t", "t"]);
  assert.equal(
    await sql(
      `select count(*) from private.recording_source_links where account_id='${account}';`,
    ),
    "0",
  );
  console.log(
    "PASS: concurrent claims reserve one source/provider attempt; duplicate completion is idempotent; source snapshot contract matches worker; no accepted links.",
  );
} finally {
  if (seeded) {
    await sql(`begin;delete from auth.users where id='${account}';delete from private.music_catalogue_sources where media_id='${media}';
  update private.musicbrainz_rate set next_at='${prior.next_at}'::timestamptz,day='${prior.day}'::date,used=${prior.used},token=null,lease_until=null where id and (token is null or token='${ownedToken ?? randomUUID()}');commit;`);
    console.log(
      "PASS: isolated synthetic fixtures removed; no provider request or hosted change.",
    );
  }
}
