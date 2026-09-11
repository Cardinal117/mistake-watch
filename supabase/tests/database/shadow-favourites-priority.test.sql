begin;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,is_anonymous,raw_user_meta_data) values('311f0000-0000-4000-8000-000000000001',false,'{}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash,created_at)
values('311f0000-0000-4000-8000-000000000011','personal','311f0000-0000-4000-8000-000000000001','Priority','PRIO','priority-fixture',now()-interval '2 days');
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at)
values('311f0000-0000-4000-8000-000000000021','311f0000-0000-4000-8000-000000000011','311f0000-0000-4000-8000-000000000001','Owner','host',now()-interval '2 days');
insert into public.recommendation_events(authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,actor_member_id,account_user_id,source_type,media_id,playback_occurrence_id,occurred_at,expires_at)
select 'priority-'||n,'priority-'||n,1,'playback_completed','311f0000-0000-4000-8000-000000000011','priority','311f0000-0000-4000-8000-000000000021','311f0000-0000-4000-8000-000000000001','youtube','prio'||lpad(n::text,7,'0'),'priority-'||n,now()-interval '1 day',now()+interval '180 days' from generate_series(1,300) n;
insert into private.music_catalogue_sources(media_id,last_used_at) select 'prio'||lpad(n::text,7,'0'),now() from generate_series(1,300) n;
insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,fetched_at,expires_at)
select 'prio'||lpad(n::text,7,'0'),'Test song','Test artist - Topic',100,now(),now()+interval '1 day' from generate_series(1,300) n;
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
values('311f0000-0000-4000-8000-000000000001','youtube','prio0000299','liked','priority-liked',now());
set local statement_timeout='5s';
select is(public.enqueue_shadow_enrichment_batch('311f0000-0000-4000-8000-000000000001',1)->>'queued','1','priority batch remains bounded within worker timeout');
set local statement_timeout='0';
select is((select media_id from private.shadow_enrichment_jobs where account_id='311f0000-0000-4000-8000-000000000001'),'prio0000299','favourite is admitted before earlier history sources');
delete from private.shadow_enrichment_jobs where account_id='311f0000-0000-4000-8000-000000000001';
insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,due_at)
select '311f0000-0000-4000-8000-000000000001',s,'identity',private.shadow_enrichment_context('311f0000-0000-4000-8000-000000000001',s),case when s='prio0000001' then now()-interval '1 day' else now() end from (values('prio0000001'),('prio0000299')) v(s);
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null,used=0;
create temporary table priority_claim as select public.claim_shadow_enrichment('311f0000-0000-4000-8000-000000000001','identity') value;
select is((select value->'snapshot'->>'mediaId' from priority_claim),'prio0000299','current favourite claims before older unliked job');
select is((select used from private.musicbrainz_rate),1,'priority claim still spends one shared provider reservation');
insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context)
select '311f0000-0000-4000-8000-000000000001','prio0000001','tags',private.shadow_enrichment_context('311f0000-0000-4000-8000-000000000001','prio0000001');
update private.musicbrainz_rate set next_at=now()-interval '1 second',lease_until=null,token=null;
update private.shadow_enrichment_rate set next_at=now()-interval '1 second',lease_until=null,token=null,used=0;
select is(public.claim_shadow_enrichment('311f0000-0000-4000-8000-000000000001','any')->>'stage','tags','optional stage progresses while older identity backlog remains');
delete from private.shadow_enrichment_jobs where account_id='311f0000-0000-4000-8000-000000000001';
insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,due_at)
select '311f0000-0000-4000-8000-000000000001','prio'||lpad(n::text,7,'0'),'identity',private.shadow_enrichment_context('311f0000-0000-4000-8000-000000000001','prio'||lpad(n::text,7,'0')),now()+n*interval '1 second' from generate_series(1,256) n;
-- Protected classes include attempted, completed, leased, and sources with optional evidence.
update private.shadow_enrichment_jobs set attempts=1 where media_id='prio0000255';
update private.shadow_enrichment_jobs set status='done',outcome='{"status":"unresolved"}',expires_at=now()+interval '1 day' where media_id='prio0000254';
update private.shadow_enrichment_jobs set lease_until=now()+interval '30 seconds',token=gen_random_uuid() where media_id='prio0000253';
insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,status,outcome,expires_at)
select account_id,media_id,'tags',context,'done','{"status":"missing"}',now()+interval '1 day' from private.shadow_enrichment_jobs where media_id='prio0000252';
select lives_ok($$select public.enqueue_shadow_enrichment('311f0000-0000-4000-8000-000000000001','prio0000299')$$,'new favourite can displace only unused lower priority slot at capacity');
select is((select count(*) from private.shadow_enrichment_jobs where account_id='311f0000-0000-4000-8000-000000000001' and stage='identity'),256::bigint,'priority replacement respects account capacity');
select ok(not exists(select 1 from private.shadow_enrichment_jobs where media_id='prio0000256'),'newest unused unliked identity is displaced');
select is((select count(*) from private.shadow_enrichment_jobs where media_id in ('prio0000252','prio0000253','prio0000254','prio0000255')),5::bigint,'attempted completed inflight and optional evidence survive');
select throws_ok($$select public.enqueue_shadow_enrichment('311f0000-0000-4000-8000-000000000001','prio0000300')$$,'54000',null,'unliked admission cannot evict existing work');
update private.shadow_enrichment_jobs set attempts=1 where stage='identity';
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
values('311f0000-0000-4000-8000-000000000001','youtube','prio0000298','liked','priority-liked-2',now());
select throws_ok($$select public.enqueue_shadow_enrichment('311f0000-0000-4000-8000-000000000001','prio0000298')$$,'54000',null,'favourite waits when all slots have protected work');
select lives_ok($$select public.enqueue_shadow_enrichment_batch('311f0000-0000-4000-8000-000000000001',5)$$,'capacity backpressure still permits worker to continue');
select ok(not has_function_privilege('authenticated','public.enqueue_shadow_enrichment(uuid,text)','execute'),'browser cannot invoke priority admission');
select ok(not has_function_privilege('anon','public.claim_shadow_enrichment(uuid,text)','execute'),'anonymous role cannot claim priority jobs');
update private.music_catalogue_metadata set title='Favourite refresh' where media_id='prio0000299';
select is(public.enqueue_shadow_enrichment_batch('311f0000-0000-4000-8000-000000000001',1)->>'queued','1','blocked new favourite cannot starve existing favourite refresh');
update private.music_catalogue_metadata set title='History refresh' where media_id='prio0000001';
select is(public.enqueue_shadow_enrichment_batch('311f0000-0000-4000-8000-000000000001',1)->>'queued','1','blocked new favourite cannot starve existing history refresh');
select * from finish();
rollback;