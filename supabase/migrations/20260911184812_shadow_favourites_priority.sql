-- Favourites-first private shadow scheduling; quotas and completion fences unchanged.
create or replace function public.enqueue_shadow_enrichment(target_account uuid,source_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctx jsonb; j private.shadow_enrichment_jobs; optional_stage text; displaced_id uuid;
begin
 perform private.require_recording_account(target_account);
 perform pg_advisory_xact_lock(hashtextextended('shadow-enqueue',0));
 ctx:=private.shadow_enrichment_context(target_account,source_id);
 if ctx is null then raise exception 'Fresh eligible source required' using errcode='42501'; end if;
 select * into j from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id and stage='identity' for update;
 if found and j.context=ctx and (j.status='pending' or j.expires_at>clock_timestamp()) then
  if j.status='done' and j.outcome->>'status'='provisional' then
   foreach optional_stage in array array['tags','audio'] loop
    delete from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id and stage=optional_stage and status<>'pending' and expires_at<=clock_timestamp();
    insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,recording)
    values(target_account,source_id,optional_stage,ctx,j.outcome->'recording') on conflict(account_id,media_id,stage) do nothing;
   end loop;
  end if;
  return jsonb_build_object('status','existing','jobId',j.id);
 end if;
 -- Expired/ineligible data is bounded even when the source registry survives.
 delete from private.shadow_enrichment_jobs where coalesce(expires_at,to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000))<=clock_timestamp();
 if (select count(*) from private.shadow_enrichment_jobs where account_id=target_account and stage='identity' and media_id<>source_id)>=256 or
    (select count(*) from private.shadow_enrichment_jobs where stage='identity' and not(account_id=target_account and media_id=source_id))>=4096 then
  -- Only a current favourite may replace an entirely unused same-account slot.
  -- Never discard attempted work, a lease, a result or sibling enrichment stages.
  if exists(select 1 from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=source_id and p.preference_state='liked') then
   select candidate.id into displaced_id from private.shadow_enrichment_jobs candidate
   where candidate.account_id=target_account and candidate.media_id<>source_id and candidate.stage='identity'
    and candidate.status='pending' and candidate.attempts=0 and candidate.token is null and candidate.lease_until is null
    and candidate.claimed_at is null and candidate.completed_token is null and candidate.outcome is null
    and not exists(select 1 from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=candidate.media_id and p.preference_state='liked')
    and not exists(select 1 from private.shadow_enrichment_jobs sibling where sibling.account_id=target_account and sibling.media_id=candidate.media_id and sibling.stage<>'identity')
   order by candidate.due_at desc,candidate.id desc limit 1 for update of candidate skip locked;
   if displaced_id is not null then delete from private.shadow_enrichment_jobs where id=displaced_id; end if;
  end if;
  if (select count(*) from private.shadow_enrichment_jobs where account_id=target_account and stage='identity' and media_id<>source_id)>=256 or
     (select count(*) from private.shadow_enrichment_jobs where stage='identity' and not(account_id=target_account and media_id=source_id))>=4096 then
   raise exception 'Shadow job capacity reached' using errcode='54000';
  end if;
 end if;
 delete from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id;
 insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context)
 values(target_account,source_id,'identity',ctx) returning * into j;
 return jsonb_build_object('status','pending','jobId',j.id);
end $$;

create or replace function public.enqueue_shadow_enrichment_batch(target_account uuid,max_sources integer default 10) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r record; result jsonb; n integer:=0;
begin
 perform private.require_recording_account(target_account);
 if max_sources is null or max_sources not between 1 and 60 then raise exception 'Invalid admission bound' using errcode='22023'; end if;
 for r in
  with capacity as materialized (
   select
    ((select count(*) from private.shadow_enrichment_jobs where account_id=target_account and stage='identity'
      and coalesce(expires_at,to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000))>clock_timestamp())<256
     and (select count(*) from private.shadow_enrichment_jobs where stage='identity'
      and coalesce(expires_at,to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000))>clock_timestamp())<4096) room_available,
    exists(select 1 from private.shadow_enrichment_jobs candidate
     where candidate.account_id=target_account and candidate.stage='identity' and candidate.status='pending'
      and candidate.attempts=0 and candidate.token is null and candidate.lease_until is null
      and candidate.claimed_at is null and candidate.completed_token is null and candidate.outcome is null
      and not exists(select 1 from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=candidate.media_id and p.preference_state='liked')
      and not exists(select 1 from private.shadow_enrichment_jobs sibling where sibling.account_id=target_account and sibling.media_id=candidate.media_id and sibling.stage<>'identity')) replaceable
  ), eligible as materialized (
   select media_id,liked from private.catalogue_owner_evidence(target_account)
  ), contexts as materialized (
   select e.media_id,e.liked,private.shadow_source_snapshot_context(target_account,e.media_id) ctx from eligible e
  )
  select c.media_id from contexts c cross join capacity capacity_hint
  left join private.shadow_enrichment_jobs j on j.account_id=target_account and j.media_id=c.media_id and j.stage='identity'
  -- Skip currently impossible new admissions so they cannot occupy every bounded
  -- slot before existing refresh work. Enqueue rechecks capacity under its lock.
  where c.ctx is not null and (j.id is not null or capacity_hint.room_available or (c.liked and capacity_hint.replaceable))
   and (j.id is null or j.context<>c.ctx or (j.status<>'pending' and (j.expires_at is null or j.expires_at<=clock_timestamp())) or
   (j.status='done' and j.outcome->>'status'='provisional' and exists(select 1 from (values('tags'),('audio')) stages(stage)
    left join private.shadow_enrichment_jobs optional on optional.account_id=target_account and optional.media_id=c.media_id and optional.stage=stages.stage
    where optional.id is null or (optional.status<>'pending' and optional.expires_at<=clock_timestamp()))))
  order by c.liked desc,(j.id is null),c.media_id limit max_sources
 loop
  begin
   result:=public.enqueue_shadow_enrichment(target_account,r.media_id);
  exception when sqlstate '54000' then
   -- Another admission may fill capacity after selection; keep bounded refreshes progressing.
   continue;
  end;
  if result->>'status'='pending' then n:=n+1; end if;
 end loop;
 return jsonb_build_object('queued',n);
end $$;

create or replace function public.claim_shadow_enrichment(target_account uuid,target_stage text default 'any') returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.shadow_enrichment_jobs; r record; choice record; result jsonb;
 provider_name text; units integer; cap integer; new_token uuid:=gen_random_uuid(); until_at timestamptz; ctx jsonb;
begin
 perform private.require_recording_account(target_account);
 if target_stage='any' then
  -- Rotate stages by their latest claim, including completed jobs, so a large
  -- identity backlog cannot continually overtake optional enrichment.
  for choice in select stage from private.shadow_enrichment_jobs
   where account_id=target_account group by stage
   having bool_or(status='pending' and due_at<=clock_timestamp())
   order by max(claimed_at) nulls first,min(due_at),stage loop
   result:=public.claim_shadow_enrichment(target_account,choice.stage);
   if result<>'{}'::jsonb then return result; end if;
  end loop;
  return '{}'::jsonb;
 end if;
 if target_stage is null or target_stage not in ('identity','tags','audio') then raise exception 'Invalid enrichment stage' using errcode='22023'; end if;
 if target_stage='identity' then
  select * into r from private.musicbrainz_rate where id for update skip locked;
  units:=1; cap:=100;
 else
  provider_name:=case when target_stage='tags' then 'lastfm' else 'acousticbrainz' end;
  select * into r from private.shadow_enrichment_rate where provider=provider_name for update skip locked;
  units:=case when target_stage='audio' then 2 else 1 end; cap:=200;
 end if;
 if not found then return '{}'::jsonb; end if;
 if r.lease_until>clock_timestamp() or r.next_at>clock_timestamp() then return '{}'::jsonb; end if;
 if r.day<>(clock_timestamp() at time zone 'UTC')::date then r.used:=0; end if;
 if r.used+units>cap then return '{}'::jsonb; end if;
 -- Terminalize crashed final attempts, with a short cooldown before readmission.
 update private.shadow_enrichment_jobs set status='invalid',outcome='{"status":"invalid"}',expires_at=least(clock_timestamp()+interval '1 day',to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000)),token=null,lease_until=null
 where account_id=target_account and stage=target_stage and status='pending' and attempts>=3 and lease_until<=clock_timestamp();
 for j in select candidate.* from private.shadow_enrichment_jobs candidate where account_id=target_account and stage=target_stage and status='pending' and attempts<3
   and due_at<=clock_timestamp() and (lease_until is null or lease_until<=clock_timestamp())
   order by exists(select 1 from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=candidate.media_id and p.preference_state='liked') desc,
    due_at,id limit 32 for update of candidate skip locked
 loop
  ctx:=private.shadow_enrichment_context(j.account_id,j.media_id);
  if ctx is null or ctx<>j.context then
   update private.shadow_enrichment_jobs set status='invalid',outcome=null,expires_at=clock_timestamp(),token=null,lease_until=null where id=j.id;
   continue;
  end if;
  until_at:=clock_timestamp()+interval '30 seconds';
  update private.shadow_enrichment_jobs set attempts=attempts+1,token=new_token,lease_until=until_at,claimed_at=clock_timestamp() where id=j.id;
  if target_stage='identity' then
   update private.musicbrainz_rate set token=new_token,lease_until=until_at,next_at=until_at+interval '1 second',used=r.used+units,day=(clock_timestamp() at time zone 'UTC')::date where id;
  else
   update private.shadow_enrichment_rate set token=new_token,lease_until=until_at,next_at=until_at+interval '1 second',used=r.used+units,day=(clock_timestamp() at time zone 'UTC')::date where provider=provider_name;
  end if;
  return jsonb_build_object('jobId',j.id,'token',new_token,'leaseUntil',until_at,'stage',j.stage,'snapshot',j.context->'snapshot','recording',j.recording);
 end loop;
 return '{}'::jsonb;
end $$;
