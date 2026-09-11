-- Isolated synthetic catalogue claim regression. All changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to service_role;
set local search_path=public,extensions;
select no_plan();alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into private.room_kind_features(room_kind,enabled) values('personal',true),('shared',true),('temporary',true) on conflict(room_kind) do update set enabled=true;
insert into private.recommendation_learning_versions values(1,now()-interval '1 year') on conflict do nothing;
insert into auth.users(id,is_anonymous,raw_user_meta_data) values
 ('03000000-0000-4000-8000-000000000001',false,'{"display_name":"Catalogue owner"}'),
 ('03000000-0000-4000-8000-000000000002',false,'{"display_name":"Other owner"}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values
 ('03000000-0000-4000-8000-000000000011','personal','03000000-0000-4000-8000-000000000001','Personal','QA030P','fixture030p'),
 ('03000000-0000-4000-8000-000000000012','personal','03000000-0000-4000-8000-000000000002','Other','QA030O','fixture030o'),
 ('03000000-0000-4000-8000-000000000013','shared','03000000-0000-4000-8000-000000000001','Shared','QA030S','fixture030s'),
 ('03000000-0000-4000-8000-000000000014','temporary','03000000-0000-4000-8000-000000000001','Temporary','QA030T','fixture030t');
insert into private.shared_memberships(room_id,user_id,state) values('03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001','approved');
insert into public.room_members(id,room_id,user_id,display_name,role) values
 ('03000000-0000-4000-8000-000000000021','03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001','Owner','host'),
 ('03000000-0000-4000-8000-000000000022','03000000-0000-4000-8000-000000000012','03000000-0000-4000-8000-000000000002','Other','host'),
 ('03000000-0000-4000-8000-000000000023','03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001','Owner','host'),
 ('03000000-0000-4000-8000-000000000024','03000000-0000-4000-8000-000000000014','03000000-0000-4000-8000-000000000001','Owner','host');
alter table public.media_preferences disable trigger register_catalogue_like;
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
select '03000000-0000-4000-8000-000000000001','youtube','auditid'||lpad(i::text,4,'0'),'liked','audit-like-'||i,now()-interval '1 hour'
from generate_series(1,308) i;
alter table public.media_preferences enable trigger register_catalogue_like;
insert into public.recommendation_events(authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,actor_member_id,account_user_id,source_type,media_id,playback_occurrence_id,occurred_at,expires_at)
select 'audit-play-'||i,'audit-play-'||i,1,'playback_completed','03000000-0000-4000-8000-000000000011','audit-session','03000000-0000-4000-8000-000000000021','03000000-0000-4000-8000-000000000001','youtube','auditid'||lpad((i%308+1)::text,4,'0'),'audit-occurrence-'||i,now()-interval '1 day',now()+interval '180 days'
from generate_series(1,4500) i;
insert into private.music_catalogue_sources(media_id,last_used_at)
select 'auditid'||lpad(i::text,4,'0'),now() from generate_series(1,308) i
union all select 'orphanid'||lpad(i::text,4,'0'),now() from generate_series(1,400) i;
insert into private.music_catalogue_jobs(media_id,due_at)
select media_id,case when media_id like 'orphan%' then now()-interval '2 days' else now()-interval '1 day' end from private.music_catalogue_sources;
create temporary table audit_claims(payload jsonb);
grant all on audit_claims to service_role;
set local role service_role;
set local statement_timeout='8s';
insert into audit_claims select public.claim_music_catalogue_jobs();
select is(jsonb_array_length((select payload->'videoIds' from audit_claims)),50,'308 referenced jobs and 4500 events claim within 8-second API budget');
select ok(not exists(select 1 from jsonb_array_elements_text((select payload->'videoIds' from audit_claims)) id where id like 'orphan%'),'400 older unreferenced jobs cannot starve eligible later jobs');
select is((select payload->'videoIds'->>0 from audit_claims),'auditid0001','oldest eligible media order remains deterministic');
select is((select reserved_count from private.music_catalogue_budget),1,'one batch spends exactly one reservation');
select is((select count(*)::integer from private.music_catalogue_jobs where lease_token is not null),50,'only selected jobs receive leases');
insert into audit_claims select public.claim_music_catalogue_jobs();
select is((select count(*)::integer from private.music_catalogue_jobs where lease_token is not null),100,'subsequent claim excludes active leases');
select is((public.complete_music_catalogue_jobs(
 (select (payload->>'leaseToken')::uuid from audit_claims where payload->'videoIds'->>0='auditid0001'),
 (select jsonb_agg(jsonb_build_object('mediaId',id,'status','public','title','Synthetic catalogue performance track'))
  from jsonb_array_elements_text((select payload->'videoIds' from audit_claims where payload->'videoIds'->>0='auditid0001')) id)
 )->>'acceptedCount')::integer,50,'bounded completion retains per-ID eligibility recheck within 8 seconds');
reset role;
update public.profiles set account_status='disabled' where id='03000000-0000-4000-8000-000000000001';
set local role service_role;
select is(public.claim_music_catalogue_jobs()->'videoIds','[]'::jsonb,'inactive account cannot authorize metadata refresh');
reset role;
update public.profiles set account_status='active' where id='03000000-0000-4000-8000-000000000001';
update public.media_preferences set preference_state='neutral',neutral_expires_at=now()+interval '30 days';
delete from public.recommendation_events;
set local role service_role;
select is(public.claim_music_catalogue_jobs()->'videoIds','[]'::jsonb,'withdrawn Likes and removed retained history revoke remaining claims');
select is((select reserved_count from private.music_catalogue_budget),2,'no-reference claims consume no budget');
select * from finish();
rollback;
