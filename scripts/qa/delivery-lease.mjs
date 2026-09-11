import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Explicit isolated synthetic database only. Never accepts a remote URL.
assert.equal(process.env.CATALOGUE_QA_DATABASE, "task030_catalogue");
const container = "supabase_db_mistake-watch-task028";
const database = "task030_catalogue";
function sql(source) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-q", "-At"], { windowsHide: true });
    let output = "", error = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { error += data; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(output.trim()) : reject(new Error(error || `psql exited ${code}`)));
    child.stdin.end(source);
  });
}
const claim = () => sql("set role service_role; select public.claim_recommendation_delivery();");
const finish = (token, outcome = "empty", processed = 0) => {
  assert.match(token, /^[0-9a-f-]{36}$/i);
  assert.ok(["empty", "partial", "failed"].includes(outcome));
  assert.ok(Number.isInteger(processed) && processed >= 0 && processed <= 2000);
  return sql(`set role service_role; select public.finish_recommendation_delivery('${token}','${outcome}',${processed});`);
};

// Preserve even the isolated database's prior operational receipt across the run.
const original = await sql("select row_to_json(d)::text from private.recommendation_delivery d;");
assert.ok(original, "migration must seed the singleton before concurrency QA");
try {
  await sql("update private.recommendation_delivery set lease_token=null,lease_until=null,next_run_at=now()-interval '1 second';");
  const results = await Promise.all(Array.from({ length: 8 }, claim));
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1, "exactly one concurrent invocation owns the global lease");
  const old = winners[0];
  assert.equal(await claim(), "", "live lease excludes later instances");
  await sql("update private.recommendation_delivery set lease_until=now()-interval '1 second',next_run_at=now()-interval '1 second';");
  assert.equal(await finish(old), "f", "expired owner cannot finish before replacement");
  const replacement = await claim();
  assert.ok(replacement);
  assert.notEqual(replacement, old);
  assert.equal(await finish(old, "failed"), "f", "old owner cannot clear new lease");
  assert.equal(await sql("select lease_token from private.recommendation_delivery;"), replacement);
  assert.equal(await finish(replacement, "partial", 2000), "t");
  assert.deepEqual(await Promise.all([claim(), claim()]), ["", ""], "cooldown excludes competing active ticks");
  await sql("update private.recommendation_delivery set next_run_at=now()-interval '1 second';");
  const retry = await claim();
  assert.ok(retry);
  assert.equal(await finish(retry, "failed", 100), "t");
  assert.equal(await sql("select last_status || ':' || last_processed from private.recommendation_delivery;"), "failed:100");
  assert.equal(await claim(), "", "failed attempt enters retry cooldown");
  console.log("PASS: eight concurrent claims have one owner; expired and replaced owners are fenced; success/failure cooldowns prevent retry storms.");
} finally {
  const escaped = original.replaceAll("'", "''");
  await sql(`begin; delete from private.recommendation_delivery; insert into private.recommendation_delivery select * from json_populate_record(null::private.recommendation_delivery,'${escaped}'::json); commit;`);
}
