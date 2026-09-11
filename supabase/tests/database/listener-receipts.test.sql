begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
-- Isolated QA may retain tombstones from a separate synthetic concurrency run.
-- Reset only this fixture namespace inside the rollback transaction.
delete from private.persistent_room_retirements where room_id in('310c0000-0000-4000-8000-000000000011','310c0000-0000-4000-8000-000000000012');
insert into auth.users(id,is_anonymous,created_at,raw_user_meta_data) values
('310c0000-0000-4000-8000-000000000001',false,now()-interval '3 days','{}'),
('310c0000-0000-4000-8000-000000000002',false,now()-interval '3 days','{}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash,created_at) values
('310c0000-0000-4000-8000-000000000011','personal','310c0000-0000-4000-8000-000000000001','Receipt Personal','QALR','fixtureLR',now()-interval '2 days');
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at) values
('310c0000-0000-4000-8000-000000000021','310c0000-0000-4000-8000-000000000011','310c0000-0000-4000-8000-000000000001','Owner','host',now()-interval '2 days');
create function pg_temp.receipt(patch jsonb default '{}') returns jsonb language sql as $$
select jsonb_build_object('accountId','310c0000-0000-4000-8000-000000000001','roomId','310c0000-0000-4000-8000-000000000011',
'memberId','310c0000-0000-4000-8000-000000000021','occurrenceId','310c0000-0000-4000-8000-000000000031',
'consentEpoch','310c0000-0000-4000-8000-000000000011','historyGeneration',0,'sourceType','direct','sourceId',repeat('a',64),
'durationSeconds',100,'coverage','[[0,90]]'::jsonb,'firstObservedAt',now()-interval '10 minutes','lastObservedAt',now()-interval '8 minutes',
'methodologyVersion',1)||patch $$;
create function pg_temp.ingest(patch jsonb default '{}') returns jsonb language plpgsql as $$
declare result jsonb;begin execute 'select public.ingest_listener_receipts($1)' into result using jsonb_build_array(pg_temp.receipt(patch));return result;
exception when undefined_function then return null;end $$;
create function pg_temp.counts(account uuid) returns jsonb language plpgsql as $$
declare result jsonb;begin execute 'select public.read_account_listening_counts($1)' into result using account;return result;
exception when undefined_function then return null;end $$;
set local role service_role;
select is((pg_temp.ingest()->>'inserted')::int,1,'qualified observed coverage creates one durable receipt');
select is((pg_temp.ingest()->>'inserted')::int,0,'delivery retry does not duplicate an occurrence');
select is((pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'->0->>'completedPlayCount')::int,1,'account reader shows one source count');
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000002')->'items'),0,'other account cannot inherit the count');
select is((pg_temp.ingest('{"sourceType":"youtube","sourceId":"dQw4w9Wg001"}')->>'rejected')::int,1,'unresolved YouTube measurement adapter stays inactive');
select is((pg_temp.ingest('{"coverage":[[0,50],[25,75]]}')->>'rejected')::int,1,'overlapping raw coverage cannot inflate a receipt');
select is((pg_temp.ingest('{"coverage":[[0,80]]}')->>'rejected')::int,1,'incomplete coverage cannot increment counts');
select is((pg_temp.ingest('{"durationSeconds":0}')->>'rejected')::int,1,'unknown duration never qualifies');
select is((pg_temp.ingest('{"historyGeneration":1}')->>'rejected')::int,1,'foreign history generation is rejected');
select is((pg_temp.ingest('{"consentEpoch":"310c0000-0000-4000-8000-000000000099"}')->>'rejected')::int,1,'foreign consent epoch is rejected');
select is((pg_temp.ingest('{"accountId":"310c0000-0000-4000-8000-000000000002"}')->>'rejected')::int,1,'another account cannot claim the original listener member');
select is((pg_temp.ingest(jsonb_build_object('lastObservedAt',now()+interval '1 hour'))->>'rejected')::int,1,'future receipt time is rejected');
select is((pg_temp.ingest(jsonb_build_object('firstObservedAt',now()-interval '8 days'))->>'rejected')::int,1,'expired delivery cannot restore old transient evidence');
select is((pg_temp.ingest('{"occurrenceId":"310c0000-0000-4000-8000-000000000032"}')->>'inserted')::int,1,'intentional repeated occurrence counts separately');
select is((pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'->0->>'completedPlayCount')::int,2,'two qualified repeats give two counts');
select is((public.clear_account_listening_history('310c0000-0000-4000-8000-000000000001',0)->>'historyGeneration')::int,1,'history clear advances generation');
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'),0,'history clear immediately excludes old receipts');
select is((pg_temp.ingest('{"occurrenceId":"310c0000-0000-4000-8000-000000000033"}')->>'rejected')::int,1,'delayed pre-clear receipt cannot recreate cleared counts');
reset role;
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash,created_at) values
('310c0000-0000-4000-8000-000000000012','shared','310c0000-0000-4000-8000-000000000001','Receipt Shared','QALRS','fixtureLRS',now()-interval '2 days');
insert into private.shared_memberships(room_id,user_id,state) values('310c0000-0000-4000-8000-000000000012','310c0000-0000-4000-8000-000000000002','approved');
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at) values
('310c0000-0000-4000-8000-000000000022','310c0000-0000-4000-8000-000000000012','310c0000-0000-4000-8000-000000000002','Shared listener','guest',now()-interval '2 days');
update private.shared_memberships set member_id='310c0000-0000-4000-8000-000000000022' where room_id='310c0000-0000-4000-8000-000000000012';
create function pg_temp.shared_receipt() returns jsonb language sql as $$select jsonb_build_object(
'roomId','310c0000-0000-4000-8000-000000000012','memberId','310c0000-0000-4000-8000-000000000022',
'accountId','310c0000-0000-4000-8000-000000000002','consentEpoch',current_setting('test.receipts.epoch'))$$;
set local role service_role;
select set_config('test.receipts.epoch',(public.set_room_listening_consent('310c0000-0000-4000-8000-000000000012','310c0000-0000-4000-8000-000000000002',true,1,null)->>'epoch'),true);
reset role;
-- Simulate an already-active permission for the synthetic past playback interval.
update private.room_listening_consents set activated_at=now()-interval '1 day' where room_id='310c0000-0000-4000-8000-000000000012';
set local role service_role;
select is((pg_temp.ingest(pg_temp.shared_receipt())->>'inserted')::int,1,'opted-in Shared listener gets its own qualified receipt');
select is((pg_temp.counts('310c0000-0000-4000-8000-000000000002')->'items'->0->'roomCounts'->>'shared')::int,1,'reader retains Shared context without exposing another account');
select set_config('test.receipts.off',(public.set_room_listening_consent('310c0000-0000-4000-8000-000000000012','310c0000-0000-4000-8000-000000000002',false,1,current_setting('test.receipts.epoch')::uuid)->>'epoch'),true);
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000002')->'items'),0,'Shared withdrawal immediately removes read eligibility');
select is((pg_temp.ingest(pg_temp.shared_receipt())->>'rejected')::int,1,'withdrawn Shared delayed receipt is rejected');
select public.set_room_listening_consent('310c0000-0000-4000-8000-000000000012','310c0000-0000-4000-8000-000000000002',true,1,current_setting('test.receipts.off')::uuid);
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000002')->'items'),0,'regrant never revives old receipt partition');
reset role;
select ok(not has_table_privilege('authenticated','private.listener_receipts','select'),'private listener data has no browser table grant');
select ok(not has_function_privilege('authenticated','public.ingest_listener_receipts(jsonb)','execute'),'browser cannot forge durable listener receipts');
select ok(not has_function_privilege('anon','public.read_account_listening_counts(uuid,text[])','execute'),'anonymous caller cannot choose a target account');
-- Realistic bounded read: 5000 retained receipts, one eligibility context per room/epoch/generation.
update private.account_listening_history set cleared_at=now()-interval '1 day' where user_id='310c0000-0000-4000-8000-000000000001';
insert into private.listener_receipts(account_id,room_id,member_id,occurrence_id,consent_epoch,history_generation,source_type,source_id,room_kind,duration_seconds,coverage,coverage_ratio_bps,first_observed_at,last_observed_at)
select '310c0000-0000-4000-8000-000000000001','310c0000-0000-4000-8000-000000000011','310c0000-0000-4000-8000-000000000021',md5('listener-pressure-'||n)::uuid,
'310c0000-0000-4000-8000-000000000011',1,'direct',repeat(md5((n%100)::text),2),'personal',100,'[[0,90]]',9000,now()-interval '10 minutes',now()-interval '8 minutes'
from generate_series(1,5000)n;
set local role service_role;
set local statement_timeout='8s';
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'),100,'5000-receipt account aggregation stays within the eight-second API budget');
select is(jsonb_array_length(public.read_account_listening_counts('310c0000-0000-4000-8000-000000000001',array[repeat(md5('0'),2)])->'items'),1,'batched source filter narrows private aggregate');
reset role;
update private.listener_receipts set first_observed_at=now()-interval '181 days',last_observed_at=now()-interval '181 days' where occurrence_id=md5('listener-pressure-1')::uuid;
set local role service_role;
select is(public.prune_listener_receipts(),1,'expired 180-day receipts are physically deleted');
reset role;
update public.rooms set status='closed',closed_at=clock_timestamp(),close_reason='host_closed' where id='310c0000-0000-4000-8000-000000000011';
set local role service_role;
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'),100,'closing an owned room preserves already-qualified account history');
select is((pg_temp.ingest('{"historyGeneration":1,"occurrenceId":"310c0000-0000-4000-8000-000000000034"}')->>'rejected')::int,1,'closed owned room cannot accept a new live receipt');
select public.clear_account_listening_history('310c0000-0000-4000-8000-000000000001',1);
select is(jsonb_array_length(pg_temp.counts('310c0000-0000-4000-8000-000000000001')->'items'),0,'history clear still excludes retained receipts from a closed owned room');
reset role;
select * from finish();
rollback;
