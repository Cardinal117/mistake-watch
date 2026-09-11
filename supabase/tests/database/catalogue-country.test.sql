-- TASK-030. Synthetic fixtures only; every change rolls back.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to service_role,anon,authenticated;
set local search_path = public, extensions;
select no_plan();
select has_function('public','read_personal_catalogue',array['uuid','uuid'],'Personal catalogue capability exists');
select has_function('public','reconcile_personal_catalogue',array['uuid','uuid','text[]'],'bounded reconciliation capability exists');
select has_function('public','claim_music_catalogue_jobs',array['integer'],'global batch budget and lease capability exists');
select ok(not has_table_privilege('anon','private.music_catalogue_sources','SELECT'),'anonymous cannot enumerate catalogue');
select ok(not has_table_privilege('authenticated','private.music_catalogue_metadata','SELECT'),'authenticated cannot enumerate metadata');
select ok(not has_function_privilege('authenticated','public.read_personal_catalogue(uuid,uuid)','EXECUTE'),'browser cannot select another owner through RPC');
select ok(not has_function_privilege('anon','public.complete_music_catalogue_jobs(uuid,jsonb)','EXECUTE'),'browser cannot author public metadata');
select is(public.claim_music_catalogue_jobs()->'videoIds','[]'::jsonb,'empty worker returns no IDs');
select is((select count(*)::integer from private.music_catalogue_budget),0,'empty work spends no budget');

alter table public.rooms drop constraint rooms_room_kind_enabled_check;
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
insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
values ('03000000-0000-4000-8000-000000000001','youtube','region030id','liked',1,'region-like',now()-interval '1 day');
create temporary table claims as select public.claim_music_catalogue_jobs() payload;
select lives_ok($$select public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),
 '[{"mediaId":"region030id","status":"public","title":"Public regional track","allowedCountries":["ZA","US"],"blockedCountries":null}]')$$,
 'verified public region metadata can be cached without globally admitting it');
create function pg_temp.regions(country text) returns jsonb language sql as $$
 select public.read_personal_catalogue_for_country('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',country); $$;
select is((select allowed_countries from private.music_catalogue_metadata where media_id='region030id'),array['ZA','US'],'country rules persisted with metadata');
select is(jsonb_array_length(pg_temp.regions('ZA')->'items'),1,'allowed viewer sees regular');
select is(jsonb_array_length(pg_temp.regions('DE')->'items'),0,'other viewer cannot see region-limited regular');
select is(jsonb_array_length(pg_temp.regions(null)->'candidates'),0,'unknown country fails closed');
select is((pg_temp.regions('DE')->'catalogue'->>'pendingCount')::integer,0,'region-ineligible cached track is not pending work');
select is((pg_temp.regions('ZA')->'catalogue'->>'readyCount')::integer,1,'ready count uses viewer country');
select ok(not (pg_temp.regions('ZA')->'metadata'->0 ? 'allowedCountries'),'provider country rules never enter browser response');
select is(jsonb_array_length(public.read_personal_catalogue('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001')->'items'),0,'legacy reader remains conservative after new cache writes');
select throws_ok($$select public.issue_personal_catalogue_decision('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',array['region030id'])$$,'42501',null,'legacy decision cannot globally admit regional media');
select lives_ok($$select public.issue_personal_catalogue_decision_for_country('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',array['region030id'],'ZA')$$,'allowed viewer gets decision');
select throws_ok($$select public.issue_personal_catalogue_decision_for_country('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',array['region030id'],'DE')$$,'42501',null,'existing allowed decision cannot leak to disallowed viewer');
select throws_ok($$select public.read_personal_catalogue_for_country('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000002','ZA')$$,'42501',null,'country does not grant account access');
select ok(not has_function_privilege('authenticated','public.read_personal_catalogue_for_country(uuid,uuid,text)','EXECUTE'),'browser cannot forge country through RPC');
select ok(not has_function_privilege('anon','public.issue_personal_catalogue_decision_for_country(uuid,uuid,text[],text)','EXECUTE'),'anonymous cannot issue regional decisions');
select ok(private.catalogue_country_visible(null,null,null),'worldwide cache works without country');
select ok(private.catalogue_country_visible(null,array[]::text[],null),'empty blocked list is worldwide');
select ok(not private.catalogue_country_visible(array[]::text[],null,'ZA'),'empty allowed list blocks all');
select ok(not private.catalogue_country_visible(null,array['ZA'],'ZA'),'blocked country excluded');
select ok(private.catalogue_country_visible(null,array['ZA'],'US'),'other country allowed by blocked list');
select ok(not private.catalogue_country_visible(null,array['ZA'],null),'unknown country excluded for blocked list');
select ok(not private.catalogue_country_visible(array['ZA'],null,'za'),'malformed country excluded');
select ok(not private.valid_catalogue_countries(array['ZA','ZA']),'duplicate rules rejected');
select ok(not private.valid_catalogue_countries(array['ZA',null]),'null rules rejected');
select ok(not private.valid_catalogue_countries(array['za']),'noncanonical country rejected');
select throws_ok($$update private.music_catalogue_metadata set allowed_countries=array['ZA'],blocked_countries=array['US']$$,'23514',null,'ambiguous cached rules rejected');
-- More than a candidate page of hidden tracks cannot starve one eligible track.
insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
select '03000000-0000-4000-8000-000000000001','youtube','hidden030'||lpad(n::text,4,'0'),'liked',1,'hidden-like-'||n,now()-interval '1 hour' from generate_series(1,130) n;
insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at,allowed_countries)
select 'hidden030'||lpad(n::text,4,'0'),'Hidden fixture',now()-interval '1 hour',now()+interval '27 days',array['DE'] from generate_series(1,130) n;
select is(jsonb_array_length(pg_temp.regions('ZA')->'candidates'),1,'country filtering runs before limits');
select is(pg_temp.regions('ZA')->'candidates'->0->>'mediaId','region030id','eligible item survives hidden earlier candidates');
update private.music_catalogue_metadata set fetched_at=now()-interval '29 days',expires_at=now()-interval '1 day' where media_id='region030id';
select is(jsonb_array_length(pg_temp.regions('ZA')->'items'),0,'expired regional metadata hidden before cleanup');
select public.prune_music_catalogue();
select is((select count(*)::integer from private.music_catalogue_metadata where media_id='region030id'),0,'country lists physically expire with metadata');
select is((select preference_state from public.media_preferences where media_id='region030id'),'liked','cache expiry preserves first-party Like');
select * from finish();
rollback;

