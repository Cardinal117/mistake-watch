import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

if (!process.argv.includes("--local-fixture"))
  throw new Error(
    "Pass --local-fixture for disposable local claim verification.",
  );
const database = "task030_catalogue_replay";
const account = randomUUID();
const mbids = [randomUUID(), randomUUID()];
const sources = mbids.map((id) => `qamb${id.replaceAll("-", "")}`);
function sql(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn(
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
    child.stdout.on("data", (value) => {
      out += value;
    });
    child.stderr.on("data", (value) => {
      err += value;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err)),
    );
    child.stdin.end(statement);
  });
}
let seeded = false;
let priorRate;
let token;
try {
  assert.equal(await sql("select current_database();"), database);
  assert.equal(
    await sql("select count(*) from private.musicbrainz_jobs;"),
    "0",
    "requires an empty disposable provider job table",
  );
  priorRate = JSON.parse(
    await sql(
      "select row_to_json(r) from private.musicbrainz_rate r where id;",
    ),
  );
  assert.equal(
    await sql(
      "select (next_at<=clock_timestamp() and coalesce(lease_until<=clock_timestamp(),true) and used<100)::text from private.musicbrainz_rate where id;",
    ),
    "true",
    "local provider rate slot must be idle",
  );
  await sql(`begin;
    insert into auth.users(id,is_anonymous,raw_user_meta_data) values('${account}',false,'{}');
    ${sources
      .map(
        (
          source,
          i,
        ) => `insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at) values('${account}','youtube','${source}','liked','${randomUUID()}',now());
      select public.queue_musicbrainz_reference('${account}','${source}','${mbids[i]}');`,
      )
      .join("\n")}
    commit;`);
  seeded = true;
  const results = await Promise.all([
    sql("select public.claim_musicbrainz_lookup();"),
    sql("select public.claim_musicbrainz_lookup();"),
  ]);
  const claims = results.map((value) => JSON.parse(value));
  const winners = claims.filter((claim) => claim.token);
  assert.equal(
    winners.length,
    1,
    "only one parallel claimant owns the shared provider slot",
  );
  token = winners[0].token;
  assert.ok(mbids.includes(winners[0].mbid));
  assert.equal(
    await sql(
      `select sum(attempts) from private.musicbrainz_jobs where mbid in ('${mbids[0]}','${mbids[1]}');`,
    ),
    "1",
  );
  assert.equal(await sql("select public.claim_musicbrainz_lookup();"), "{}");
  console.log(
    "PASS: two parallel claims produce one global lease, one reserved attempt, and no overlapping claimant.",
  );
} finally {
  if (seeded) {
    const restore = token
      ? `update private.musicbrainz_rate set next_at='${priorRate.next_at}'::timestamptz,day='${priorRate.day}'::date,used=${priorRate.used},token=null,lease_until=null where id and token='${token}'::uuid;`
      : "";
    await sql(`begin;delete from auth.users where id='${account}';
      delete from private.musicbrainz_jobs where mbid in ('${mbids[0]}','${mbids[1]}');
      delete from private.music_catalogue_sources where media_id in ('${sources[0]}','${sources[1]}');
      ${restore}commit;`);
    console.log(
      "PASS: random synthetic fixtures removed; only this test's owned rate reservation restored. No provider request made.",
    );
  }
}
