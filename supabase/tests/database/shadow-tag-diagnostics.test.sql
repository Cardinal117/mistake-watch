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
select throws_ok($$select public.complete_shadow_enrichment((select(value->>'jobId')::uuid from tag_claim),(select(value->>'token')::uuid from tag_claim),' {"status":"invalid","reason":"raw private text"}')$$,'22023',null,'arbitrary diagnostic text is rejected');
select throws_ok($$select public.complete_shadow_enrichment((select(value->>'jobId')::uuid from audio_claim),(select(value->>'token')::uuid from audio_claim),' {"status":"invalid","reason":"title-mismatch"}')$$,'22023',null,'tag reasons cannot be attached to audio outcomes');
select throws_ok($$select public.complete_shadow_enrichment((select(value->>'jobId')::uuid from tag_claim),(select(value->>'token')::uuid from tag_claim),' {"status":"missing","reason":"title-mismatch"}')$$,'22023',null,'identity conflict cannot be mislabeled as missing tags');
select is(public.complete_shadow_enrichment((select(value->>'jobId')::uuid from tag_claim),(select(value->>'token')::uuid from tag_claim),'{"status":"invalid","reason":"mbid-mismatch"}'),true,'validated reason persists behind normal completion fence');
select is(public.read_shadow_enrichment('311e0000-0000-4000-8000-000000000001','shadowtest1')->'tags'->>'reason','mbid-mismatch','private shadow reader exposes compact reason');
select * from finish();
rollback;
