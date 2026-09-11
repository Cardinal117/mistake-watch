-- TASK-030.6: compact provider country rules share metadata expiry, never user location.
create function private.valid_catalogue_countries(codes text[]) returns boolean
language sql immutable security invoker set search_path='' as $$
 select codes is null or (coalesce(array_ndims(codes),1)=1 and cardinality(codes)<=250
  and not exists(select 1 from unnest(codes) c where c is null or c !~ '^[A-Z]{2}$')
  and cardinality(codes)=(select count(distinct c) from unnest(codes) c));
$$;
create function private.catalogue_country_visible(allowed text[],blocked text[],country text) returns boolean
language sql immutable security invoker set search_path='' as $$
 select coalesce(case
  when allowed is not null and blocked is not null then false
  when allowed is null and coalesce(cardinality(blocked),0)=0 then true
  when country is null or country !~ '^[A-Z]{2}$' then false
  when allowed is not null then country=any(allowed)
  else not (country=any(blocked)) end,false);
$$;
alter table private.music_catalogue_metadata
 add column allowed_countries text[], add column blocked_countries text[],
 add constraint music_catalogue_regions_valid check (
  private.valid_catalogue_countries(allowed_countries) and private.valid_catalogue_countries(blocked_countries)
  and (allowed_countries is null or blocked_countries is null));
revoke all on function private.valid_catalogue_countries(text[]),private.catalogue_country_visible(text[],text[],text) from public,anon,authenticated;
grant execute on function private.valid_catalogue_countries(text[]),private.catalogue_country_visible(text[],text[],text) to service_role;


create function public.read_personal_catalogue_for_country(target_room uuid,target_account uuid,viewer_country text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 with evidence as materialized (select * from private.catalogue_owner_evidence(target_account,target_room)),
 fresh as materialized (select e.* from evidence e join private.music_catalogue_metadata m using(media_id)
   where m.privacy_status='public' and m.playable and m.expires_at>statement_timestamp() and m.fetched_at<=statement_timestamp()
    and private.catalogue_country_visible(m.allowed_countries,m.blocked_countries,viewer_country)),
 regulars as (
  (select * from fresh where liked order by completed_count desc,last_completed_at desc nulls last,media_id limit 8)
  union (select * from fresh where completed_count>0 order by completed_count desc,last_completed_at desc,media_id limit 8)
  union (select * from fresh where last_completed_at<now()-interval '7 days' order by last_completed_at,media_id limit 8)
 ), candidates as (
  (select * from fresh where liked order by completed_count desc,last_used_at desc,media_id limit 32)
  union (select * from fresh where choice_count>0 order by choice_count desc,last_choice_at desc,media_id limit 32)
  union (select * from fresh where completed_count>0 order by last_completed_at,media_id limit 32)
 ), selected_ids as (select media_id from regulars union select media_id from candidates)
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'sourceType','youtube','liked',liked,
    'completedPlayCount',completed_count,'lastCompletedAt',last_completed_at)
    order by liked desc,completed_count desc,last_completed_at desc nulls last,media_id) from regulars),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'state',state,'revision',revision,'expiresAt',expires_at) order by media_id)
    from private.personal_discover_feedback where user_id=target_account),'[]'::jsonb),
  'countWindowDays',180,
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'sourceType','youtube','liked',liked,
    'completedPlayCount',completed_count,'lastCompletedAt',last_completed_at,'choiceCount',choice_count,'lastChoiceAt',last_choice_at)
    order by liked desc,choice_count desc,last_used_at desc,media_id) from candidates),'[]'::jsonb),
  'metadata',coalesce((select jsonb_agg(jsonb_build_object('mediaId',m.media_id,'title',m.title,'channelTitle',m.channel_title,
    'durationSeconds',m.duration_seconds,'thumbnailUrl',m.thumbnail_url,'fetchedAt',m.fetched_at,'expiresAt',m.expires_at) order by m.media_id)
    from private.music_catalogue_metadata m join selected_ids s using(media_id)),'[]'::jsonb),
  'catalogue',jsonb_build_object('readyCount',(select count(*) from fresh),'pendingCount',(
   select count(*) from evidence e left join private.music_catalogue_jobs j using(media_id)
   where not exists(select 1 from private.music_catalogue_metadata m where m.media_id=e.media_id
      and m.expires_at>statement_timestamp() and m.fetched_at<=statement_timestamp())
    and not (coalesce(j.last_status='unavailable',false) and j.due_at>statement_timestamp() and j.lease_token is null)
  ))
 ) into result;
 return result;
end $$;

create function public.issue_personal_catalogue_decision_for_country(target_room uuid,target_account uuid,selected_ids text[],viewer_country text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare payload jsonb; decision private.personal_catalogue_decisions; expected_count integer;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 if selected_ids is null or cardinality(selected_ids) not between 1 and 96 or array_ndims(selected_ids)>1
  or exists(select 1 from unnest(selected_ids) id where id is null or id !~ '^[A-Za-z0-9_-]{6,64}$') then
  raise exception 'Invalid catalogue decision IDs' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('personal-discover:'||target_account::text,0));
 with ids as (select id,min(position) position from unnest(selected_ids) with ordinality as x(id,position) group by id)
 select jsonb_agg(jsonb_build_object('mediaId',e.media_id,'reason',case when e.liked then 'liked' when e.choice_count>0 then 'chosen' else 'history' end) order by ids.position)
 into payload from ids join private.catalogue_owner_evidence(target_account,target_room) e on e.media_id=ids.id
 join private.music_catalogue_metadata m on m.media_id=e.media_id
 where m.privacy_status='public' and m.playable and m.expires_at>statement_timestamp() and m.fetched_at<=statement_timestamp()
  and private.catalogue_country_visible(m.allowed_countries,m.blocked_countries,viewer_country);
 select count(distinct id) into expected_count from unnest(selected_ids) id;
 if coalesce(jsonb_array_length(payload),0)<>expected_count then
  raise exception 'Catalogue decision no longer matches eligible music' using errcode='42501';
 end if;
 select * into decision from private.personal_catalogue_decisions d
 where d.user_id=target_account and d.room_id=target_room and d.candidates=payload
  and d.created_at>=statement_timestamp()-interval '1 hour' and d.expires_at>statement_timestamp()
 order by d.created_at desc limit 1;
 if found then return jsonb_build_object('decisionId',decision.id,'expiresAt',decision.expires_at,'candidates',decision.candidates); end if;
 delete from private.personal_catalogue_decisions where user_id=target_account and expires_at<=statement_timestamp();
 delete from private.personal_catalogue_decisions where id in (
  select id from private.personal_catalogue_decisions where user_id=target_account order by created_at desc,id offset 99
 );
 insert into private.personal_catalogue_decisions(user_id,room_id,candidates) values(target_account,target_room,payload) returning * into decision;
 return jsonb_build_object('decisionId',decision.id,'expiresAt',decision.expires_at,'candidates',decision.candidates);
end $$;

create or replace function public.complete_music_catalogue_jobs(lease_token uuid,results jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; job private.music_catalogue_jobs; accepted integer:=0; discarded integer:=0; state text; field text; allowed text[]; blocked text[];
begin
 if lease_token is null or jsonb_typeof(results) is distinct from 'array' or jsonb_array_length(results)>50 then
  raise exception 'Invalid catalogue completion' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 if (select count(*) from jsonb_array_elements(results))<>(select count(distinct x->>'mediaId') from jsonb_array_elements(results) x) then
  raise exception 'Duplicate or missing catalogue result IDs' using errcode='22023';
 end if;
 for item in select value from jsonb_array_elements(results) order by value->>'mediaId' loop
  state:=item->>'status';
  if jsonb_typeof(item)<>'object' or item->>'mediaId' !~ '^[A-Za-z0-9_-]{6,64}$'
    or state is null or state not in ('public','unavailable','transient_failure')
    or exists(select 1 from jsonb_object_keys(item) k where k<>all(case when state='public'
      then array['mediaId','status','title','channelTitle','durationSeconds','thumbnailUrl','viewCount','likeCount','allowedCountries','blockedCountries']
      else array['mediaId','status'] end)) then
   raise exception 'Invalid catalogue result fields' using errcode='22023';
  end if;
  if state='public' then
   if jsonb_typeof(item->'title') is distinct from 'string' or char_length(btrim(item->>'title')) not between 1 and 500
    or (item->'channelTitle' is not null and item->'channelTitle'<>'null'::jsonb and (jsonb_typeof(item->'channelTitle')<>'string' or char_length(item->>'channelTitle')>200))
    or (item->'thumbnailUrl' is not null and item->'thumbnailUrl'<>'null'::jsonb and (jsonb_typeof(item->'thumbnailUrl')<>'string' or char_length(item->>'thumbnailUrl')>2048 or item->>'thumbnailUrl' !~ '^https://i[0-9]*[.]ytimg[.]com/')) then
    raise exception 'Invalid public metadata' using errcode='22023';
   end if;
   foreach field in array array['durationSeconds','viewCount','likeCount'] loop
    if item->field is not null and item->field<>'null'::jsonb and
     (jsonb_typeof(item->field)<>'number' or item->>field !~ '^[0-9]+$' or (item->>field)::numeric>case when field='durationSeconds' then 2147483647 else 9007199254740991 end) then
     raise exception 'Invalid metadata number' using errcode='22023';
    end if;
   end loop;
  end if;
  allowed:=null; blocked:=null;
  if state='public' then
   foreach field in array array['allowedCountries','blockedCountries'] loop
    if item->field is not null and item->field<>'null'::jsonb then
     if jsonb_typeof(item->field)<>'array' then raise exception 'Invalid catalogue countries' using errcode='22023'; end if;
     if jsonb_array_length(item->field)>250 or exists(select 1 from jsonb_array_elements(item->field) c
       where jsonb_typeof(c)<>'string' or c#>>'{}' !~ '^[A-Z]{2}$') then
      raise exception 'Invalid catalogue countries' using errcode='22023';
     end if;
     if field='allowedCountries' then select coalesce(array_agg(c),'{}') into allowed from jsonb_array_elements_text(item->field) c;
     else select coalesce(array_agg(c),'{}') into blocked from jsonb_array_elements_text(item->field) c; end if;
    end if;
   end loop;
   if not private.valid_catalogue_countries(allowed) or not private.valid_catalogue_countries(blocked)
     or (allowed is not null and blocked is not null) then raise exception 'Invalid catalogue countries' using errcode='22023'; end if;
  end if;
  select * into job from private.music_catalogue_jobs j where j.media_id=item->>'mediaId' for update;
  if not found or job.lease_token is distinct from complete_music_catalogue_jobs.lease_token or job.lease_until<=clock_timestamp() then
   discarded:=discarded+1; continue;
  end if;
  if state='public' and private.catalogue_has_reference(job.media_id) then
   insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,thumbnail_url,view_count,like_count,fetched_at,expires_at,allowed_countries,blocked_countries)
   values(job.media_id,item->>'title',item->>'channelTitle',(item->>'durationSeconds')::integer,item->>'thumbnailUrl',
    (item->>'viewCount')::bigint,(item->>'likeCount')::bigint,job.leased_at,job.leased_at+interval '28 days',allowed,blocked)
   on conflict(media_id) do update set title=excluded.title,channel_title=excluded.channel_title,duration_seconds=excluded.duration_seconds,
    thumbnail_url=excluded.thumbnail_url,view_count=excluded.view_count,like_count=excluded.like_count,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,
    allowed_countries=excluded.allowed_countries,blocked_countries=excluded.blocked_countries
   where music_catalogue_metadata.fetched_at<=excluded.fetched_at;
  elsif state='unavailable' or (state='public' and not private.catalogue_has_reference(job.media_id)) then
   delete from private.music_catalogue_metadata where media_id=job.media_id;
  end if;
  update private.music_catalogue_jobs set lease_token=null,leased_at=null,lease_until=null,last_status=state,
   attempts=case when state='public' then 0 else least(attempts+1,20) end,
   due_at=case when state='public' then job.leased_at+interval '21 days'
    when state='unavailable' then clock_timestamp()+interval '7 days'
    else clock_timestamp()+least(interval '1 day',interval '5 minutes'*power(2,least(job.attempts,9))) end
  where media_id=job.media_id;
  accepted:=accepted+1;
 end loop;
 return jsonb_build_object('acceptedCount',accepted,'discardedCount',discarded);
end $$;


-- Older deployments cannot accidentally surface restricted rows from the shared cache.
create or replace function public.read_personal_catalogue(target_room uuid,target_account uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select public.read_personal_catalogue_for_country(target_room,target_account,null); $$;
create or replace function public.issue_personal_catalogue_decision(target_room uuid,target_account uuid,selected_ids text[])
returns jsonb language sql security invoker set search_path='' as $$
 select public.issue_personal_catalogue_decision_for_country(target_room,target_account,selected_ids,null); $$;
revoke all on function public.read_personal_catalogue_for_country(uuid,uuid,text),public.issue_personal_catalogue_decision_for_country(uuid,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.read_personal_catalogue_for_country(uuid,uuid,text),public.issue_personal_catalogue_decision_for_country(uuid,uuid,text[],text) to service_role;

