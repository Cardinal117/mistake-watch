-- TASK-029: private Personal Discover display statistics and explicit feedback.
-- Browser observations are untrusted diagnostics; they never enter taste training.
-- RLS intent: no browser role accesses these tables/RPCs. The server derives the
-- account from its authenticated session; each RPC rechecks the active Personal owner.
create table private.personal_discover_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null check (media_id ~ '^[A-Za-z0-9_-]{6,64}$'),
  state text not null check (state in ('neutral','not_now','do_not_suggest','wrong_version')),
  revision bigint not null check (revision > 0 and revision <= 9007199254740991),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,media_id),
  check ((state='not_now') = (expires_at is not null))
);
create table private.personal_discover_interactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id text not null check (action_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  room_id uuid not null references public.rooms(id) on delete cascade,
  media_id text not null check (media_id ~ '^[A-Za-z0-9_-]{6,64}$'),
  kind text not null check (kind in ('shown','add_requested','queue_observed','play_requested','play_next_requested','feedback')),
  surface text not null check (surface in ('regulars','recommended','rediscover')),
  input jsonb not null,
  result jsonb not null,
  occurred_at timestamptz not null default now(),
  primary key (user_id,action_id)
);
create index personal_discover_interactions_room_idx on private.personal_discover_interactions(room_id);
create index personal_discover_interactions_expiry_idx on private.personal_discover_interactions(user_id,occurred_at);
alter table private.personal_discover_feedback enable row level security;
alter table private.personal_discover_interactions enable row level security;
revoke all on private.personal_discover_feedback,private.personal_discover_interactions from public,anon,authenticated;
grant select,insert,update,delete on private.personal_discover_feedback,private.personal_discover_interactions to service_role;

create function private.require_personal_discover_owner(target_room uuid,target_account uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if target_account is null or not exists (
    select 1 from public.rooms r
    join public.room_members m on m.room_id=r.id and m.user_id=target_account
    join auth.users u on u.id=m.user_id and u.is_anonymous is false
    join public.profiles p on p.id=u.id and p.account_status='active'
    where r.id=target_room and r.room_kind='personal' and r.status='open' and r.owner_user_id=target_account
  ) then raise exception 'An active Personal room owner is required' using errcode='42501'; end if;
end $$;

create function private.read_personal_discover(target_room uuid,target_account uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_personal_discover_owner(target_room,target_account);
  with counts as (
    select e.media_id,count(distinct e.playback_occurrence_id)::int completed_count,max(e.occurred_at) last_completed
    from public.recommendation_events e
    join public.room_members m on m.id::text=e.actor_member_id and m.user_id=target_account and m.room_id=target_room
    where e.room_id=target_room and e.account_user_id=target_account and e.source_type='youtube'
      and e.event_type='playback_completed' and e.playback_occurrence_id is not null
      and e.occurred_at >= now()-interval '180 days' and e.occurred_at <= now() and e.expires_at>now()
    group by e.media_id
  ), likes as (
    select media_id from public.media_preferences where user_id=target_account and source_type='youtube' and preference_state='liked'
  ), eligible as (
    select coalesce(c.media_id,l.media_id) media_id,coalesce(c.completed_count,0) completed_count,
      c.last_completed,l.media_id is not null liked
    from counts c full join likes l on l.media_id=c.media_id
    where not exists (
      select 1 from private.personal_discover_feedback f where f.user_id=target_account
        and f.media_id=coalesce(c.media_id,l.media_id) and (f.state in ('do_not_suggest','wrong_version')
          or (f.state='not_now' and f.expires_at>now()))
    )
  ), candidates as (
    -- Bounded supply for each purpose prevents a large Likes list starving
    -- frequent plays or older rediscovery. UNION deduplicates to at most 24.
    (select * from eligible where liked order by completed_count desc,last_completed desc nulls last,media_id limit 8)
    union
    (select * from eligible where completed_count>0 order by completed_count desc,last_completed desc,media_id limit 8)
    union
    (select * from eligible where last_completed<now()-interval '7 days' order by last_completed,media_id limit 8)
  ) select jsonb_build_object(
    'items',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'sourceType','youtube',
      'completedPlayCount',completed_count,'lastCompletedAt',last_completed,'liked',liked)
      order by liked desc,completed_count desc,last_completed desc nulls last,media_id) from candidates),'[]'::jsonb),
    'feedback',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'state',state,'revision',revision,'expiresAt',expires_at) order by media_id)
      from private.personal_discover_feedback where user_id=target_account),'[]'::jsonb),
    'countWindowDays',180) into result;
  return result;
end $$;

create function private.record_personal_discover(target_room uuid,target_account uuid,observation jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing private.personal_discover_interactions; current_state private.personal_discover_feedback;
  response jsonb; media text := observation->>'mediaId'; action text := observation->>'actionId';
  observation_kind text := observation->>'kind'; observed_surface text := observation->>'surface';
  desired text := observation->>'state'; expected bigint;
begin
  perform private.require_personal_discover_owner(target_room,target_account);
  if jsonb_typeof(observation) is distinct from 'object'
    or observation - array['mediaId','actionId','kind','surface','state','expectedRevision'] <> '{}'::jsonb
    or jsonb_typeof(observation->'mediaId') is distinct from 'string'
    or jsonb_typeof(observation->'actionId') is distinct from 'string'
    or jsonb_typeof(observation->'kind') is distinct from 'string'
    or jsonb_typeof(observation->'surface') is distinct from 'string'
    or media is null or media !~ '^[A-Za-z0-9_-]{6,64}$'
    or action is null or action !~ '^[A-Za-z0-9_-]{1,80}$'
    or observation_kind is null or observation_kind not in ('shown','add_requested','queue_observed','play_requested','play_next_requested','feedback')
    or observed_surface is null or observed_surface not in ('regulars','recommended','rediscover') then
    raise exception 'Invalid Discover observation' using errcode='22023';
  end if;
  if observation_kind='feedback' then
    if desired is null or desired not in ('neutral','not_now','do_not_suggest','wrong_version')
      or jsonb_typeof(observation->'expectedRevision') is distinct from 'number'
      or (observation->>'expectedRevision') !~ '^[0-9]{1,16}$'
      or (observation->>'expectedRevision')::numeric>9007199254740991 then
      raise exception 'Feedback requires an explicit revision' using errcode='22023'; end if;
    expected:=(observation->>'expectedRevision')::bigint;
  elsif observation ? 'state' or observation ? 'expectedRevision' then
    raise exception 'Observations cannot change feedback' using errcode='22023';
  end if;
  -- One account lock makes capacity bounds, action retries and cross-device CAS atomic.
  perform pg_advisory_xact_lock(hashtextextended('personal-discover:'||target_account::text,0));
  select * into existing from private.personal_discover_interactions where user_id=target_account and action_id=action;
  if found then
    if existing.input<>observation or existing.room_id<>target_room then
      raise exception 'Discover action was already used with different input' using errcode='23505'; end if;
    return existing.result;
  end if;
  if observation_kind='feedback' then
    select * into current_state from private.personal_discover_feedback where user_id=target_account and media_id=media;
    if coalesce(current_state.revision,0)<>expected then
      return jsonb_build_object('status','conflict','item',jsonb_build_object('mediaId',media,
        'state',coalesce(current_state.state,'neutral'),'revision',coalesce(current_state.revision,0),'expiresAt',current_state.expires_at));
    end if;
    if current_state.revision is null and (select count(*) from private.personal_discover_feedback where user_id=target_account)>=1000 then
      raise exception 'Discover feedback capacity reached' using errcode='54000'; end if;
    insert into private.personal_discover_feedback(user_id,media_id,state,revision,expires_at)
      values(target_account,media,desired,expected+1,case when desired='not_now' then now()+interval '7 days' end)
      on conflict(user_id,media_id) do update set state=excluded.state,revision=excluded.revision,expires_at=excluded.expires_at,updated_at=now()
      returning * into current_state;
    response:=jsonb_build_object('item',jsonb_build_object('mediaId',media,'state',current_state.state,
      'revision',current_state.revision,'expiresAt',current_state.expires_at));
  else response:=jsonb_build_object('ok',true);
  end if;
  insert into private.personal_discover_interactions(user_id,action_id,room_id,media_id,kind,surface,input,result)
    values(target_account,action,target_room,media,observation_kind,observed_surface,observation,response);
  -- Opportunistic, account-scoped bounded retention. A dormant account is also
  -- cleaned by the existing recommendation retention worker below.
  delete from private.personal_discover_interactions where user_id=target_account and action_id in (
    select action_id from private.personal_discover_interactions where user_id=target_account and occurred_at<now()-interval '30 days'
    order by occurred_at limit 200);
  return response;
end $$;

create function public.read_personal_discover(target_room uuid,target_account uuid)
returns jsonb language sql security invoker set search_path='' as $$
  select private.read_personal_discover(target_room,target_account);
$$;
create function public.record_personal_discover(target_room uuid,target_account uuid,observation jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select private.record_personal_discover(target_room,target_account,observation);
$$;
revoke all on function private.require_personal_discover_owner(uuid,uuid),private.read_personal_discover(uuid,uuid),private.record_personal_discover(uuid,uuid,jsonb),public.read_personal_discover(uuid,uuid),public.record_personal_discover(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.require_personal_discover_owner(uuid,uuid),private.read_personal_discover(uuid,uuid),private.record_personal_discover(uuid,uuid,jsonb),public.read_personal_discover(uuid,uuid),public.record_personal_discover(uuid,uuid,jsonb) to service_role;

-- Extend the existing retention job, keeping existing event/preferences semantics.
alter function private.prune_recommendation_data(timestamptz) rename to prune_recommendation_data_before_discover;
create function private.prune_recommendation_data(prune_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; deleted_count integer;
begin
  result:=private.prune_recommendation_data_before_discover(prune_at);
  delete from private.personal_discover_interactions where occurred_at<prune_at-interval '30 days';
  get diagnostics deleted_count = row_count;
  return result || jsonb_build_object('discover_interactions',deleted_count);
end $$;
revoke all on function private.prune_recommendation_data(timestamptz) from public,anon,authenticated;
grant execute on function private.prune_recommendation_data(timestamptz) to service_role;
-- Rebind the public SQL wrapper after the private function rename.
create or replace function public.prune_recommendation_data(prune_at timestamptz default now())
returns jsonb language sql security invoker set search_path='' as $$
  select private.prune_recommendation_data(prune_at);
$$;
revoke all on function public.prune_recommendation_data(timestamptz) from public,anon,authenticated;
grant execute on function public.prune_recommendation_data(timestamptz) to service_role;
