begin;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,is_anonymous,raw_user_meta_data) values('311e0000-0000-4000-8000-000000000088',false,'{}');
insert into public.media_preferences(user_id,source_type,media_id,preference_state,source_event_id,source_event_at)
select '311e0000-0000-4000-8000-000000000088','youtube','perf'||lpad(i::text,7,'0'),'liked','perf-like-'||i,now() from generate_series(1,120) i;
insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,fetched_at,expires_at)
select 'perf'||lpad(i::text,7,'0'),'Test song','Test artist - Topic',100,now(),now()+interval '1 day' from generate_series(1,120) i;
select ok(not has_function_privilege('service_role','private.shadow_source_snapshot_context(uuid,text)','execute'),'unchecked helper inaccessible to API service role');
select ok(not has_function_privilege('authenticated','private.shadow_source_snapshot_context(uuid,text)','execute'),'unchecked helper inaccessible to browser');
select is(private.shadow_enrichment_context('311e0000-0000-4000-8000-000000000088','perf0000001'),private.shadow_source_snapshot_context('311e0000-0000-4000-8000-000000000088','perf0000001'),'checked eligible context equals snapshot');
set local statement_timeout='5s';
select is(public.enqueue_shadow_enrichment_batch('311e0000-0000-4000-8000-000000000088',5)->>'queued','5','bounded admission from 120 sources completes within worker timeout');
set local statement_timeout='0';
update private.shadow_enrichment_jobs set status='done',outcome='{"status":"unresolved"}',expires_at=now()+interval '1 day' where account_id='311e0000-0000-4000-8000-000000000088';
select is(public.enqueue_shadow_enrichment_batch('311e0000-0000-4000-8000-000000000088',5)->>'queued','5','completed early sources do not starve later sources');
select is((select count(*) from private.shadow_enrichment_jobs where account_id='311e0000-0000-4000-8000-000000000088'),10::bigint,'later distinct sources admitted');
update public.media_preferences set preference_state='neutral',neutral_expires_at=now()+interval '30 days',source_event_id='perf-withdrawal',source_event_at=now()+interval '1 second' where user_id='311e0000-0000-4000-8000-000000000088' and media_id='perf0000001';
select is(private.shadow_enrichment_context('311e0000-0000-4000-8000-000000000088','perf0000001'),null::jsonb,'checked wrapper still rejects withdrawn eligibility');
select * from finish();
rollback;
