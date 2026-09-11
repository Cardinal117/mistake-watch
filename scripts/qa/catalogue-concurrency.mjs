import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// Explicit local synthetic database only. Never accepts a URL or active postgres.
assert.equal(process.env.CATALOGUE_QA_DATABASE, "task030_catalogue");
const database = "task030_catalogue";
const container = "supabase_db_mistake-watch-task028";
// Retired room IDs intentionally cannot be reused, even in synthetic reruns.
const account = randomUUID();
const room = randomUUID();
const member = randomUUID();

function sql(source) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-q", "-At"], { windowsHide: true });
    let output = "", error = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { error += data; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(source);
  });
}
const claim = () => sql("set role service_role; select public.claim_music_catalogue_jobs(100);").then(JSON.parse);
const complete = (token, ids) => sql(`set role service_role; select public.complete_music_catalogue_jobs('${token}', '${JSON.stringify(ids.map(mediaId => ({ mediaId, status: "public", title: "Concurrent synthetic source" })))}');`).then(JSON.parse);
const decision = ids => sql(`set role service_role; select public.issue_personal_catalogue_decision('${room}','${account}',array[${ids.map(id => `'${id}'`).join(",")}]);`).then(JSON.parse);
const observe = id => sql(`set role service_role; select public.record_personal_discover('${room}','${account}', '${JSON.stringify({ mediaId: "conc0300001", actionId: "catalogue-concurrent-observation", kind: "shown", surface: "recommended", decisionId: id })}');`).then(JSON.parse);

try {
  await sql(`begin;
    insert into auth.users(id,is_anonymous,raw_user_meta_data) values('${account}',false,'{"display_name":"Catalogue concurrency QA"}');
    insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values('${room}','personal','${account}','Catalogue concurrency QA','QA030CAS','fixture030cas');
    insert into public.room_members(id,room_id,user_id,display_name,role) values('${member}','${room}','${account}','Owner','host');
    insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
      select '${account}','youtube','conc030'||lpad(n::text,4,'0'),'liked',1,'030-concurrent-'||n,now()-interval '1 day' from generate_series(1,51) n;
    commit;`);
  const batches = await Promise.all([claim(), claim()]);
  assert.deepEqual(batches.map(b => b.videoIds.length).sort((a,b) => a-b), [1,50]);
  assert.equal(new Set(batches.flatMap(b => b.videoIds)).size, 51);
  assert.equal(await sql("select reserved_count from private.music_catalogue_budget where budget_day=(now() at time zone 'UTC')::date;"), "2");

  const expired = batches.find(b => b.videoIds.length === 50);
  await sql(`update private.music_catalogue_jobs set leased_at=now()-interval '6 minutes',lease_until=now()-interval '1 minute' where lease_token='${expired.leaseToken}';`);
  const replacement = await claim();
  assert.deepEqual(replacement.videoIds.sort(), [...expired.videoIds].sort());
  assert.notEqual(replacement.leaseToken, expired.leaseToken);
  assert.equal((await complete(expired.leaseToken, expired.videoIds)).discardedCount, 50);
  assert.equal((await complete(replacement.leaseToken, replacement.videoIds)).acceptedCount, 50);
  const single = batches.find(b => b.videoIds.length === 1);
  assert.equal((await complete(single.leaseToken, single.videoIds)).acceptedCount, 1);

  const same = await Promise.all([decision(["conc0300001"]), decision(["conc0300001"])]);
  assert.equal(same[0].decisionId, same[1].decisionId);
  const different = await decision(["conc0300001", "conc0300002"]);
  const outcomes = await Promise.allSettled([observe(same[0].decisionId), observe(different.decisionId)]);
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert.match(outcomes.find(x => x.status === "rejected").reason.message, /different decision/);
  assert.equal(await sql(`select count(*) from private.personal_discover_interactions where user_id='${account}' and action_id='catalogue-concurrent-observation';`), "1");

  await sql("update private.music_catalogue_jobs set due_at=now()-interval '1 minute',lease_token=null,leased_at=null,lease_until=null where media_id like 'conc030%'; update private.music_catalogue_budget set reserved_count=99 where budget_day=(now() at time zone 'UTC')::date;");
  const budgetRace = await Promise.all([claim(), claim()]);
  assert.equal(budgetRace.filter(b => b.videoIds.length === 50).length, 1);
  assert.equal(budgetRace.filter(b => b.budgetExhausted && b.videoIds.length === 0).length, 1);
  assert.equal(await sql("select reserved_count from private.music_catalogue_budget where budget_day=(now() at time zone 'UTC')::date;"), "100");
  console.log("PASS: disjoint concurrent batch claims, expired-lease fencing, atomic daily ceiling, deduplicated server decisions and immutable observation links.");
} finally {
  await sql(`begin;
    delete from auth.users where id='${account}';
    delete from private.music_catalogue_sources where media_id like 'conc030%';
    delete from private.music_catalogue_budget where budget_day=(now() at time zone 'UTC')::date;
    commit;`);
}
