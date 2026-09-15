-- Synthetic retention scheduling fixtures only; every change rolls back.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to service_role,anon,authenticated;
set local search_path = public, extensions;
select no_plan();

select has_table('private','catalogue_maintenance_state','private singleton schedule exists');
select has_function('public','run_catalogue_retention_maintenance',array[]::text[],'coordinated maintenance RPC exists');
select ok(not has_table_privilege('anon','private.catalogue_maintenance_state','SELECT'),'anonymous cannot inspect cleanup state');
select ok(not has_table_privilege('authenticated','private.catalogue_maintenance_state','SELECT'),'authenticated cannot inspect cleanup state');
select ok(not has_function_privilege('anon','public.run_catalogue_retention_maintenance()','EXECUTE'),'anonymous cannot run cleanup');
select ok(not has_function_privilege('authenticated','public.run_catalogue_retention_maintenance()','EXECUTE'),'authenticated cannot run cleanup');
select ok(has_function_privilege('service_role','public.run_catalogue_retention_maintenance()','EXECUTE'),'service role can run cleanup');

create function pg_temp.run_maintenance() returns jsonb language sql security definer as $$
  select public.run_catalogue_retention_maintenance();
$$;
create function pg_temp.force_due() returns void language sql as $$
  update private.catalogue_maintenance_state set next_due_at='-infinity';
$$;
create function pg_temp.seed_shadow(prefix text, amount integer) returns void language plpgsql as $$
begin
  insert into private.music_catalogue_sources(media_id,last_used_at)
  select prefix||lpad(n::text,6,'0'),clock_timestamp() from generate_series(1,amount) n;
  insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context)
  select '315e0000-0000-4000-8000-000000000001',prefix||lpad(n::text,6,'0'),'identity',
    jsonb_build_object('snapshot',jsonb_build_object('expiresAt',extract(epoch from clock_timestamp()-interval '1 hour')*1000))
  from generate_series(1,amount) n;
end $$;

insert into auth.users(id,is_anonymous,raw_user_meta_data)
values('315e0000-0000-4000-8000-000000000001',false,'{"display_name":"Maintenance QA"}');

set local role service_role;
select is(public.run_catalogue_retention_maintenance()->>'status','completed','service-role first due call performs cleanup');
reset role;
create temporary table empty_result as select pg_temp.run_maintenance() payload;
select is((select payload->>'status' from empty_result),'not_due','repeat call during cooldown skips cleanup');
select is((select (payload->>'shadowDeleted')::integer from empty_result),0,'not-due maintenance performs no shadow deletion');

select pg_temp.force_due();
insert into private.music_catalogue_sources(media_id,last_used_at) values('schedexpired01',clock_timestamp());
insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at)
values('schedexpired01','Expired fixture',clock_timestamp()-interval '27 days',clock_timestamp()-interval '1 second');
select is((pg_temp.run_maintenance()->>'catalogueDeleted')::integer,1,'due cleanup removes expired provider metadata');
select is((select count(*)::integer from private.music_catalogue_metadata where media_id='schedexpired01'),0,'expired metadata is physically absent after cleanup');

select pg_temp.force_due();
insert into private.music_catalogue_sources(media_id,last_used_at)
select 'schedcatx'||lpad(n::text,6,'0'),clock_timestamp() from generate_series(1,513) n;
insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at)
select 'schedcatx'||lpad(n::text,6,'0'),'Expired catalogue batch',clock_timestamp()-interval '27 days',clock_timestamp()-interval '1 second'
from generate_series(1,513) n;
select is((pg_temp.run_maintenance()->>'catalogueDeleted')::integer,513,'catalogue cleanup drains more than one bounded metadata batch');
select is((select count(*)::integer from private.music_catalogue_metadata where media_id like 'schedcatx%'),0,'bounded catalogue batches remove every due fixture');

select pg_temp.force_due();
select pg_temp.seed_shadow('sched512x',512);
create temporary table result_512 as select pg_temp.run_maintenance() payload;
select is((select (payload->>'shadowDeleted')::integer from result_512),512,'one full shadow batch is removed');
select is((select (payload->>'shadowBatches')::integer from result_512),1,'512 rows use one bounded batch');
select is((select (payload->>'backlogPossible')::boolean from result_512),false,'exact 512 boundary is proven drained');

select pg_temp.force_due();
select pg_temp.seed_shadow('sched513x',513);
create temporary table result_513 as select pg_temp.run_maintenance() payload;
select is((select (payload->>'shadowDeleted')::integer from result_513),513,'513 rows drain across two batches');
select is((select (payload->>'shadowBatches')::integer from result_513),2,'513 rows report two batches');
select is((select (payload->>'backlogPossible')::boolean from result_513),false,'short final batch proves no backlog');

select pg_temp.force_due();
select pg_temp.seed_shadow('sched4096x',4096);
create temporary table result_4096 as select pg_temp.run_maintenance() payload;
select is((select (payload->>'shadowDeleted')::integer from result_4096),4096,'maintenance is bounded at eight shadow batches');
select is((select (payload->>'shadowBatches')::integer from result_4096),8,'4096 rows consume the batch ceiling');
select is((select (payload->>'backlogPossible')::boolean from result_4096),false,'4096 identities can drain all three reachable stages in one daily run');

select pg_temp.force_due();
select pg_temp.seed_shadow('sched12288x',12288);
create temporary table result_12288 as select pg_temp.run_maintenance() payload;
select is((select (payload->>'shadowDeleted')::integer from result_12288),12288,'maintenance reaches the full identity plus optional-stage capacity');
select is((select (payload->>'shadowBatches')::integer from result_12288),24,'full reachable shadow capacity uses 24 bounded batches');
select is((select (payload->>'backlogPossible')::boolean from result_12288),true,'full final batch remains conservatively eligible');
select ok((select next_due_at<=clock_timestamp() from private.catalogue_maintenance_state where singleton),'possible backlog receives no cooldown');
select is(pg_temp.run_maintenance()->>'status','completed','possible backlog retries immediately');

select pg_temp.force_due();
insert into private.music_catalogue_sources(media_id,last_used_at)
select 'schedfailx'||lpad(n::text,6,'0'),clock_timestamp() from generate_series(1,513) n;
insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at)
select 'schedfailx'||lpad(n::text,6,'0'),'Failure fixture',clock_timestamp()-interval '27 days',clock_timestamp()-interval '1 second'
from generate_series(1,513) n;
create function pg_temp.reject_cleanup() returns trigger language plpgsql as $$ begin raise exception 'synthetic cleanup failure'; end $$;
create trigger reject_scheduled_cleanup before delete on private.music_catalogue_metadata for each row when(old.media_id='schedfailx000513') execute function pg_temp.reject_cleanup();
select throws_ok($$select pg_temp.run_maintenance()$$,'P0001','synthetic cleanup failure','cleanup failure reaches the caller');
select ok((select next_due_at='-infinity'::timestamptz from private.catalogue_maintenance_state where singleton),'failure does not advance the schedule');
select is((select count(*)::integer from private.music_catalogue_metadata where media_id like 'schedfailx%'),513,'later-batch failure rolls back earlier deletion batches');
drop trigger reject_scheduled_cleanup on private.music_catalogue_metadata;
select is(pg_temp.run_maintenance()->>'status','completed','failed cleanup remains retryable');

select * from finish();
rollback;
