-- Synthetic local fixtures. All writes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,is_anonymous,raw_user_meta_data) values
('311a0000-0000-4000-8000-000000000001',false,'{}'),
('311a0000-0000-4000-8000-000000000002',false,'{}');
insert into private.music_catalogue_sources(media_id,last_used_at) values('stage2source',now());
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at) values('311a0000-0000-4000-8000-000000000001','youtube','stage2source','liked','stage2-like',now());
create function pg_temp.recording(account uuid,rec uuid) returns jsonb language plpgsql as $$
declare r jsonb;begin execute 'select public.enter_recording_reference($1,$2,$3,$4)' into r using account,rec,'Independent performance reference','owner:fixture-reference'; return r;
exception when undefined_function then return null; end $$;
create function pg_temp.link(account uuid,rec uuid,rev bigint,op uuid,state text default 'accepted') returns jsonb language plpgsql as $$
declare r jsonb;begin execute 'select public.revise_recording_link($1,$2,$3,$4,$5,$6,$7)' into r using account,'stage2source',rec,rev,op,state,'owner:fixture-reference';return r;
exception when undefined_function then return null;end $$;
create function pg_temp.assertion(rev bigint,state text default 'accepted') returns jsonb language plpgsql as $$
declare r jsonb;begin execute 'select public.revise_recording_assertion($1,$2,$3,$4)' into r using
'311a0000-0000-4000-8000-000000000001'::uuid,'311a0000-0000-4000-8000-000000000031'::uuid,rev,
jsonb_build_object('recordingId','311a0000-0000-4000-8000-000000000011','facet','theme','value','fantasy','polarity','supports','status',state,'reference','owner:fixture-reference','reviewedAt',now(),'expiresAt',now()+interval '30 days');return r;
exception when undefined_function then return null;end $$;
set local role service_role;
select is(pg_temp.recording('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011')->>'id','311a0000-0000-4000-8000-000000000011','independent recording can be entered');
select throws_ok($$select public.enter_recording_reference('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000099','No actual evidence','owner: ')$$,'23514',null,'blank evidence suffix is rejected');
select is((pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000021')->>'revision')::int,1,'initial exact-version link creates revision one');
select is((pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000021')->>'revision')::int,1,'exact retry is idempotent');
select throws_ok($$select pg_temp.link('311a0000-0000-4000-8000-000000000002','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000022')$$,'42501',null,'another account cannot link private recording');
select throws_ok($$select pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000023')$$,'40001',null,'stale revision fails');
select throws_ok($$select pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000021','disputed')$$,'22023',null,'request identity cannot change payload');
select is((pg_temp.link('311a0000-0000-4000-8000-000000000001',null,1,'311a0000-0000-4000-8000-000000000024','unresolved')->>'revision')::int,2,'unlink advances revision');
select is((pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',2,'311a0000-0000-4000-8000-000000000025')->>'revision')::int,3,'relink does not reset revision');
select is((pg_temp.assertion(0)->>'revision')::int,1,'private classification can be entered');
select is((pg_temp.assertion(1,'withdrawn')->>'revision')::int,2,'withdrawal advances assertion revision');
select throws_ok('select pg_temp.assertion(0)','40001',null,'stale assertion cannot resurrect withdrawn evidence');
select is(jsonb_array_length(public.read_recording_evidence('311a0000-0000-4000-8000-000000000001',array['stage2source'])->'links'),1,'owner can read eligible source evidence');
select is(jsonb_array_length(public.read_recording_evidence('311a0000-0000-4000-8000-000000000002',array['stage2source'])->'links'),0,'other account cannot read private source relationship');
select is((public.read_recording_evidence('311a0000-0000-4000-8000-000000000001',array['stage2source'])->'links'->0->'assertions'->0->>'revision')::int,2,'snapshot includes changed assertion revision');
reset role;
select ok(not has_function_privilege('authenticated','public.revise_recording_link(uuid,text,uuid,bigint,uuid,text,text)','EXECUTE'),'browser cannot write another account link');
select ok(not has_table_privilege('service_role','private.recording_source_links','UPDATE'),'service mutations cannot bypass revision function');
select ok(not has_table_privilege('anon','private.recording_assertions','SELECT'),'anonymous cannot enumerate assertions');
delete from private.music_catalogue_sources where media_id='stage2source';
select is(jsonb_array_length(public.read_recording_evidence('311a0000-0000-4000-8000-000000000001',array['stage2source'])->'links'),0,'pruned source is excluded from reads');
select is((select revision::int from private.recording_source_links where media_id='stage2source'),3,'source pruning preserves correction revision tombstone');
insert into private.music_catalogue_sources(media_id,last_used_at) values('stage2source',now());
set local role service_role;
select throws_ok($$select pg_temp.link('311a0000-0000-4000-8000-000000000001','311a0000-0000-4000-8000-000000000011',0,'311a0000-0000-4000-8000-000000000026')$$,'40001',null,'source re-registration cannot reset revision');
reset role;
select * from finish();
rollback;
