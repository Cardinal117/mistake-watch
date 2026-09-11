begin;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,is_anonymous,raw_user_meta_data) values('311e0000-0000-4000-8000-000000000001',false,'{}');
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
values('311e0000-0000-4000-8000-000000000001','youtube','shadowtest1','liked','shadow-like',now());
insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,fetched_at,expires_at)
values('shadowtest1','Test song','Test artist - Topic',100,now(),now()+interval '1 day');
create function pg_temp.enqueue() returns jsonb language plpgsql as $$ declare r jsonb; begin
 execute 'select public.enqueue_shadow_enrichment($1,$2)' into r using '311e0000-0000-4000-8000-000000000001'::uuid,'shadowtest1';
 return r; exception when undefined_function then return null; end $$;
create function pg_temp.claim() returns jsonb language plpgsql as $$ declare r jsonb; begin
 execute 'select public.claim_shadow_enrichment($1,$2)' into r using '311e0000-0000-4000-8000-000000000001'::uuid,'identity';
 return r; exception when undefined_function then return null; end $$;
select is(pg_temp.enqueue()->>'status','pending','eligible fresh source admits shadow job');
select is(pg_temp.enqueue()->>'status','existing','repeat admission reuses current source job');
select public.queue_musicbrainz_reference('311e0000-0000-4000-8000-000000000001','shadowtest1','311e0000-0000-4000-8000-000000000088');
create temporary table shadow_claim as select pg_temp.claim() value;
select is((select value->'snapshot'->>'title' from shadow_claim),'Test song','claim uses durable fresh source snapshot');
select is(pg_temp.claim(),'{}'::jsonb,'inflight source provider lease prevents duplicate work');
select is(public.claim_musicbrainz_lookup(),'{}'::jsonb,'shadow identity reserves the legacy MusicBrainz provider lease too');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),'311e0000-0000-4000-8000-000000000099','{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'foreign completion token is rejected');
select throws_ok($$select public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"accepted","rule":"test-v1"}')$$,'22023',null,'automatic outcomes cannot be accepted links');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"provisional","rule":"test-v1","recording":{"mbid":"311e0000-0000-4000-8000-000000000011","title":"Test song","artistCredit":"Test artist","disambiguation":"","lengthMs":100000}}'),true,'provisional identity completes privately');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"provisional","rule":"test-v1","recording":{"mbid":"311e0000-0000-4000-8000-000000000011","title":"Test song","artistCredit":"Test artist","disambiguation":"","lengthMs":100000}}'),true,'identical completion retry is idempotent');
select is((select count(*)::integer from private.recording_source_links where account_id='311e0000-0000-4000-8000-000000000001'),0,'automatic identity never creates accepted or owner-authored links');
select is(public.read_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1')->>'mode','shadow','profile remains explicitly shadow');
select is((select count(*)::integer from private.shadow_enrichment_jobs where account_id='311e0000-0000-4000-8000-000000000001' and stage in ('tags','audio')),2,'provisional identity schedules independent optional stages');
create temporary table tag_claim as select public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000001','tags') value;
create temporary table audio_claim as select public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000001','audio') value;
select is((select used from private.shadow_enrichment_rate where provider='acousticbrainz'),2,'audio claim reserves both low and high requests');
select throws_ok($$select public.complete_shadow_enrichment((select(value->>'jobId')::uuid from audio_claim),(select(value->>'token')::uuid from audio_claim),'{"status":"ready","data":{"submission":0,"version":{"low":{"extractor":"v1"},"high":{"extractor":"v1"}},"bpm":120,"key":"C","scale":"major","classifiers":{},"rawAudio":"not-allowed"}}')$$,'22023',null,'audio storage rejects fields outside compact evidence schema');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from tag_claim),(select(value->>'token')::uuid from tag_claim),'{"status":"missing"}'),true,'missing tags are an independent completed outcome');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from audio_claim),(select(value->>'token')::uuid from audio_claim),'{"status":"retry","retrySeconds":120}'),true,'transient audio failure remains retryable');
select is(public.read_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1')->'identity'->>'status','provisional','audio retry does not invalidate identity');
select is(public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000001','audio'),'{}'::jsonb,'retry cooldown is enforced');
update private.shadow_enrichment_jobs set expires_at=now()-interval '1 second' where account_id='311e0000-0000-4000-8000-000000000001' and stage='tags';
select is(pg_temp.enqueue()->>'status','existing','expired optional stage can refresh without a new identity request');
select is((select status from private.shadow_enrichment_jobs where account_id='311e0000-0000-4000-8000-000000000001' and stage='tags'),'pending','optional negative result expiry requeues that provider');
select ok(not has_function_privilege('authenticated','public.claim_shadow_enrichment(uuid,text)','execute'),'browser cannot claim provider jobs');
select ok(not has_table_privilege('service_role','private.shadow_enrichment_jobs','insert'),'service writes use fenced RPC only');
select ok(not has_table_privilege('anon','private.shadow_enrichment_jobs','select'),'private source associations cannot be enumerated');
update private.music_catalogue_metadata set title='Changed title' where media_id='shadowtest1';
select is(public.read_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1'),'{}'::jsonb,'metadata revision invalidates old profile');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"provisional","rule":"test-v1","recording":{"mbid":"311e0000-0000-4000-8000-000000000011","title":"Test song","artistCredit":"Test artist","disambiguation":"","lengthMs":100000}}'),false,'idempotent replay cannot report success after source revision changes');
select is(pg_temp.enqueue()->>'status','pending','new source snapshot can enqueue a fresh identity');
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
truncate shadow_claim;
insert into shadow_claim select pg_temp.claim();
select public.revise_recording_link('311e0000-0000-4000-8000-000000000001','shadowtest1',null,0,'311e0000-0000-4000-8000-000000000077','unresolved','owner:test');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'new correction fences in-flight automatic completion');
delete from public.media_preferences where user_id='311e0000-0000-4000-8000-000000000001' and media_id='shadowtest1';
select is(public.read_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1'),'{}'::jsonb,'withdrawn account evidence is not readable');
select throws_ok($$select public.enqueue_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1')$$,'42501',null,'withdrawn source cannot be admitted');
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
values('311e0000-0000-4000-8000-000000000001','youtube','shadowtest1','liked','shadow-like-again',clock_timestamp());
select is(public.enqueue_shadow_enrichment_batch('311e0000-0000-4000-8000-000000000001',10)->>'queued','1','bounded admission refreshes changed eligibility snapshot');
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null,used=100;
select is(pg_temp.claim(),'{}'::jsonb,'manual and automatic MusicBrainz share hard daily quota');
update private.musicbrainz_rate set used=0;
insert into auth.users(id,is_anonymous,raw_user_meta_data) values('311e0000-0000-4000-8000-000000000002',false,'{}');
select is(public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000002','any'),'{}'::jsonb,'pilot cannot claim a different account job');
truncate shadow_claim;
insert into shadow_claim select public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000001','any');
select is((select value->>'stage' from shadow_claim),'identity','any-stage claim selects pending work');
update private.shadow_enrichment_jobs set token=gen_random_uuid() where id=(select(value->>'jobId')::uuid from shadow_claim);
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'replaced lease rejects old worker completion');
update private.shadow_enrichment_jobs set token=null,lease_until=now()-interval '1 second',attempts=3 where account_id='311e0000-0000-4000-8000-000000000001';
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
select is(pg_temp.claim(),'{}'::jsonb,'third crashed attempt is not claimed a fourth time');
select is((select status from private.shadow_enrichment_jobs where account_id='311e0000-0000-4000-8000-000000000001' and stage='identity'),'invalid','third crash terminalizes rather than permanent pending');
update private.shadow_enrichment_jobs set context=jsonb_set(context,'{snapshot,expiresAt}',to_jsonb(extract(epoch from now()-interval '1 second')*1000)) where account_id='311e0000-0000-4000-8000-000000000001';
select is(public.prune_shadow_enrichment(),1,'maintenance deletes expired source-bearing payloads without pilot activation');
select throws_ok($$select public.enqueue_shadow_enrichment_batch('311e0000-0000-4000-8000-000000000001',61)$$,'22023',null,'admission has a hard source bound');
select lives_ok($$select private.valid_shadow_audio('{"submission":0,"version":{"low":{"extractor":"v1"},"high":{"extractor":"v1"}},"bpm":120,"key":"C","scale":"major","classifiers":{}}')$$,'valid compact audio parses without SQL operator errors');
-- Account state changes after a request has left the worker must fence completion.
select pg_temp.enqueue();
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
truncate shadow_claim;
insert into shadow_claim select pg_temp.claim();
update public.profiles set account_status='disabled' where id='311e0000-0000-4000-8000-000000000001';
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'disabled account fences in-flight completion');
update public.profiles set account_status='active' where id='311e0000-0000-4000-8000-000000000001';
select pg_temp.enqueue();
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
truncate shadow_claim;
insert into shadow_claim select pg_temp.claim();
update auth.users set is_anonymous=true where id='311e0000-0000-4000-8000-000000000001';
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from shadow_claim),(select(value->>'token')::uuid from shadow_claim),'{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'anonymous account fences in-flight completion');
update auth.users set is_anonymous=false where id='311e0000-0000-4000-8000-000000000001';
select pg_temp.enqueue();
-- Fill the reserved identity capacity while leaving a further eligible source.
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
select '311e0000-0000-4000-8000-000000000001','youtube','shadowcap'||n,'liked','shadow-cap-'||n,now() from generate_series(1,256) n;
insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,fetched_at,expires_at)
select 'shadowcap'||n,'Test song','Test artist - Topic',100,now(),now()+interval '1 day' from generate_series(1,256) n;
insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context)
select '311e0000-0000-4000-8000-000000000001','shadowcap'||n,'identity',
 private.shadow_enrichment_context('311e0000-0000-4000-8000-000000000001','shadowcap'||n) from generate_series(1,255) n;
select throws_ok($$select public.enqueue_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowcap256')$$,'54000',null,'direct admission still enforces capacity');
select lives_ok($$select public.enqueue_shadow_enrichment_batch('311e0000-0000-4000-8000-000000000001',10)$$,'full admission batch does not abort the worker before claiming existing work');
update private.music_catalogue_metadata set title='Changed again' where media_id='shadowtest1';
select lives_ok($$select pg_temp.enqueue()$$,'existing identity replacement is allowed at capacity');
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
select ok(public.claim_shadow_enrichment('311e0000-0000-4000-8000-000000000001','any') ? 'jobId','full capacity still permits a pending claim');
select is(private.valid_shadow_audio('{"submission":0,"version":{"low":{"extractor":"v1"},"high":{"extractor":"v1"}},"bpm":120,"key":"C","scale":"major","classifiers":{"mood_happy":{"value":"happy","probability":0.8,"all":{"happy":0.8,"not_happy":0.2},"version":{"model":"v1"}}}}'),true,'compact audio preserves valid classifier evidence');
select is(private.valid_shadow_audio('{"submission":0,"version":{"low":{"extractor":"v1"},"high":{"extractor":"v1"}},"bpm":120,"key":"C","scale":"major","classifiers":{"mood_happy":{"value":"happy","probability":0.2,"all":{"happy":0.2,"not_happy":0.8},"version":{"model":"v1"}}}}'),false,'classifier winner must agree with class probabilities');
create temporary table deleted_claim as select id,token from private.shadow_enrichment_jobs where account_id='311e0000-0000-4000-8000-000000000001' and token is not null;
delete from auth.users where id='311e0000-0000-4000-8000-000000000001';
select is(public.complete_shadow_enrichment((select id from deleted_claim),(select token from deleted_claim),'{"status":"unresolved","rule":"test-v1","reason":"none"}'),false,'deleted account cannot persist an in-flight completion');
select * from finish();
rollback;
