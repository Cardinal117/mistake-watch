import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const container = "supabase_db_mistake-watch-task028";
const room = "28600000-0000-4000-8000-000000000091";
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


const previous=await sql("select enabled from private.room_kind_features where room_kind='temporary'");
try {
 await sql(`update private.room_kind_features set enabled=true where room_kind='temporary';select public.create_temporary_room('${room}','Concurrency QA','Host','watch','CONC286',repeat('1',64),repeat('2',64));`);
 const member=await sql(`select id from public.room_members where room_id='${room}'`);
 await sql(`update private.temporary_room_lifecycle set last_activity_at=now()-interval '59 minutes' where room_id='${room}'`);
 let signal;const locked=new Promise(resolve=>signal=resolve);
 const touch=sql(`begin;select id from public.rooms where id='${room}' for update;select 'locked';select pg_sleep(2);select public.access_temporary_room('${room}','${member}',null,repeat('2',64),true);commit;`,text=>{if(text.includes('locked'))signal()});
 await locked;
 assert.equal(await sql("select private.close_expired_temporary_rooms(now()+interval '2 minutes')"),'0');
 await touch;
 assert.equal(await sql(`select status from public.rooms where id='${room}'`),'open');
 await sql(`update private.temporary_room_lifecycle set last_activity_at=now()-interval '61 minutes' where room_id='${room}';select private.close_expired_temporary_rooms();`);
 assert.equal(await sql(`select public.access_temporary_room('${room}','${member}',null,repeat('2',64),true)`),'f');
 await sql(`select public.finish_temporary_room_cleanup('${room}',false);update private.temporary_room_lifecycle set closed_at=now()-interval '25 hours' where room_id='${room}'`);
 const results=await Promise.all(Array.from({length:4},()=>sql(`select public.finish_temporary_room_cleanup('${room}',true)`)));
 assert.equal(results.filter(x=>x==='t').length,1);
 assert.equal(results.filter(x=>x==='f').length,3);
 console.log('PASS: in-flight verified activity is not expired; closed room rejects late touch; four purge acknowledgements yield one deletion.');
} finally {
 await sql(`delete from public.rooms where id='${room}' and room_kind='temporary';update private.room_kind_features set enabled=${previous==='t'?'true':'false'} where room_kind='temporary'`);
}
