-- Materialize account eligibility once per batch; retain checked contexts at all trust boundaries.
create function private.shadow_source_snapshot_context(target_account uuid,source_id text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'snapshot',jsonb_build_object('mediaId',s.media_id,'title',m.title,'channel',m.channel_title,
   'durationSeconds',m.duration_seconds,'expiresAt',extract(epoch from m.expires_at)*1000),
  'sourceCreatedAt',s.created_at,'metadataFetchedAt',m.fetched_at,
  'correctionRevision',coalesce(l.revision,0),'historyGeneration',coalesce(h.generation,0),
  'preferenceEvent',(select jsonb_build_array(p.source_event_id,p.source_event_at,p.preference_state)
    from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=source_id),
  'choiceConsentGeneration',(select md5(coalesce(string_agg(jsonb_build_array(c.room_id,c.individual_epoch,c.revoked_at)::text,',' order by c.room_id),''))
    from private.room_learning_consents c where c.user_id=target_account))
 from private.music_catalogue_sources s
 join private.music_catalogue_metadata m on m.media_id=s.media_id
 left join private.recording_source_links l on l.account_id=target_account and l.media_id=s.media_id
 left join private.account_listening_history h on h.user_id=target_account
 where s.media_id=source_id and m.expires_at>clock_timestamp() and m.fetched_at<=clock_timestamp()
  and m.privacy_status='public' and m.playable and m.duration_seconds between 1 and 86400
  and char_length(m.title)<=300 and m.channel_title like '% - Topic'
$$;

revoke all on function private.shadow_source_snapshot_context(uuid,text) from public,anon,authenticated,service_role;

create or replace function private.shadow_enrichment_context(target_account uuid,source_id text) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from private.catalogue_owner_evidence(target_account) e where e.media_id=source_id)
 then private.shadow_source_snapshot_context(target_account,source_id) else null end
$$;

create or replace function public.enqueue_shadow_enrichment_batch(target_account uuid,max_sources integer default 10) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r record; result jsonb; n integer:=0;
begin
 perform private.require_recording_account(target_account);
 if max_sources is null or max_sources not between 1 and 60 then raise exception 'Invalid admission bound' using errcode='22023'; end if;
 for r in
  with eligible as materialized (
   select media_id from private.catalogue_owner_evidence(target_account)
  ), contexts as materialized (
   select e.media_id,private.shadow_source_snapshot_context(target_account,e.media_id) ctx from eligible e
  )
  select c.media_id from contexts c
  left join private.shadow_enrichment_jobs j on j.account_id=target_account and j.media_id=c.media_id and j.stage='identity'
  where c.ctx is not null and (j.id is null or j.context<>c.ctx or (j.status<>'pending' and (j.expires_at is null or j.expires_at<=clock_timestamp())) or
   (j.status='done' and j.outcome->>'status'='provisional' and exists(select 1 from (values('tags'),('audio')) stages(stage)
    left join private.shadow_enrichment_jobs optional on optional.account_id=target_account and optional.media_id=c.media_id and optional.stage=stages.stage
    where optional.id is null or (optional.status<>'pending' and optional.expires_at<=clock_timestamp()))))
  order by c.media_id limit max_sources
 loop
  begin
   result:=public.enqueue_shadow_enrichment(target_account,r.media_id);
  exception when sqlstate '54000' then
   -- Admission backpressure must not prevent the caller draining existing jobs.
   exit;
  end;
  if result->>'status'='pending' then n:=n+1; end if;
 end loop;
 return jsonb_build_object('queued',n);
end $$;
