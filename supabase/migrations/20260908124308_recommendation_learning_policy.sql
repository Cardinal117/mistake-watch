-- TASK-028.3: trusted learning eligibility; no new room kinds enabled.
-- Preserve existing Legacy totals; do not silently relabel earlier new-kind training.
do $$ begin
 if exists(select 1 from public.recommendation_events e join public.rooms r on r.id=e.room_id where r.room_kind<>'legacy')
 or exists(select 1 from public.recommendation_media_aggregates a join public.rooms r on r.id=a.room_id where r.room_kind<>'legacy') then
   raise exception 'Existing new-kind recommendation history requires reviewed reconciliation before policy activation.';
 end if;
end $$;

create table private.recommendation_learning_versions (
 version smallint primary key check(version = 1), activated_at timestamptz not null
);
insert into private.recommendation_learning_versions values (1, clock_timestamp());
create table private.room_learning_consents (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 contribute boolean not null, individual boolean not null,
 valid_from timestamptz not null default clock_timestamp(), revoked_at timestamptz,
 check(revoked_at is null or revoked_at >= valid_from)
);
create unique index room_learning_current_consent on private.room_learning_consents(room_id,user_id) where revoked_at is null;
create table private.recommendation_learning_eligibility (
 event_id uuid primary key references public.recommendation_events(id) on delete cascade,
 room_kind text not null check(room_kind in ('personal','shared','themed','temporary')),
 policy_version smallint not null references private.recommendation_learning_versions(version),
 consent_id uuid references private.room_learning_consents(id) on delete cascade,
 account_allowed boolean not null, room_allowed boolean not null,
 learning_key text unique
);
alter table private.recommendation_learning_versions enable row level security;
alter table private.room_learning_consents enable row level security;
alter table private.recommendation_learning_eligibility enable row level security;
revoke all on private.recommendation_learning_versions, private.room_learning_consents, private.recommendation_learning_eligibility from public, anon, authenticated;
grant select,insert,update,delete on private.room_learning_consents, private.recommendation_learning_eligibility to service_role;
grant select on private.recommendation_learning_versions to service_role;

-- Eligibility is an event-time decision derived from trusted records, never JSON flags.
create function private.record_learning_eligibility(e public.recommendation_events, kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare c private.room_learning_consents; owner_id uuid; account_ok boolean := false;
 room_ok boolean := false; explicit_choice boolean; explicit_preference boolean; activation timestamptz; evidence_key text;
begin
 select activated_at into activation from private.recommendation_learning_versions where version=1;
 select owner_user_id into owner_id from public.rooms where id=e.room_id;
 explicit_preference := (e.event_type='media_liked' and e.reason='explicit_like') or (e.event_type='media_unliked' and e.reason='explicit_neutral');
 explicit_choice := (e.event_type='queue_added' and e.reason in ('manual_add','add_as_next'))
   or (e.event_type='queue_play_next' and e.reason='priority_play_next');
 if e.account_user_id is not null and e.occurred_at >= activation and exists (
   select 1 from auth.users u join public.profiles p on p.id=u.id
   join public.room_members m on m.user_id=u.id and m.id::text=e.actor_member_id and m.room_id=e.room_id
   where u.id=e.account_user_id and u.is_anonymous is false and p.account_status='active'
   and coalesce(u.created_at, e.occurred_at) <= e.occurred_at and m.joined_at <= e.occurred_at
   and not exists(select 1 from public.account_guest_migrations g where g.room_member_id=m.id and g.created_at>e.occurred_at)
 ) then
   if explicit_preference then account_ok := kind <> 'personal' or owner_id=e.account_user_id;
   elsif explicit_choice then
     if kind='personal' and owner_id=e.account_user_id then account_ok:=true; room_ok:=true;
     elsif kind='shared' then
       select * into c from private.room_learning_consents where room_id=e.room_id and user_id=e.account_user_id
         and valid_from <= e.occurred_at and revoked_at is null for share;
       account_ok := coalesce(c.individual,false); room_ok := coalesce(c.contribute,false);
     end if;
   end if;
 end if;
 -- Same occurrence/actor/item/action counts once across devices; preference revisions stay distinct.
 if (account_ok or room_ok) and not explicit_preference then
   evidence_key := jsonb_build_array(e.room_id,e.room_session_id,e.account_user_id,e.source_type,e.media_id,e.event_type,
     coalesce(e.playback_occurrence_id,e.queue_item_id,e.idempotency_key))::text;
 end if;
 insert into private.recommendation_learning_eligibility(event_id,room_kind,policy_version,consent_id,account_allowed,room_allowed,learning_key)
 values(e.id,kind,1,c.id,account_ok,room_ok,evidence_key) on conflict(learning_key) do nothing;
end $$;
revoke all on function private.record_learning_eligibility(public.recommendation_events,text) from public,anon,authenticated;
grant execute on function private.record_learning_eligibility(public.recommendation_events,text) to service_role;

-- Joining/control permissions cannot opt another member into learning.
create function private.set_room_learning_consent(target_room uuid, allow_contribution boolean, allow_individual boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); changed_at timestamptz;
begin
 if actor is null or allow_contribution is null or allow_individual is null or not exists (
   select 1 from public.rooms r join public.room_members m on m.room_id=r.id
   join auth.users u on u.id=m.user_id join public.profiles p on p.id=u.id
   where r.id=target_room and r.room_kind='shared' and r.status='open'
     and u.id=actor and u.is_anonymous is false and p.account_status='active'
 ) then raise exception 'Active Shared room membership is required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-consent:'||target_room::text||':'||actor::text,0));
 if exists(select 1 from private.room_learning_consents where room_id=target_room and user_id=actor and revoked_at is null
   and contribute=allow_contribution and individual=allow_individual) then return; end if;
 changed_at:=clock_timestamp();
 update private.room_learning_consents set revoked_at=changed_at where room_id=target_room and user_id=actor and revoked_at is null;
 if allow_contribution or allow_individual then
   insert into private.room_learning_consents(room_id,user_id,contribute,individual,valid_from)
    values(target_room,actor,allow_contribution,allow_individual,changed_at);
 end if;
end $$;
create function public.set_room_learning_consent(target_room uuid, allow_contribution boolean, allow_individual boolean)
returns void language sql security invoker set search_path = '' as $$
 select private.set_room_learning_consent(target_room,allow_contribution,allow_individual);
$$;
revoke all on function private.set_room_learning_consent(uuid,boolean,boolean), public.set_room_learning_consent(uuid,boolean,boolean) from public,anon;
grant execute on function private.set_room_learning_consent(uuid,boolean,boolean), public.set_room_learning_consent(uuid,boolean,boolean) to authenticated;

-- Restricted ledger projection rechecks revocation and account identity on every read.
create function public.read_room_learning_aggregates(target_room uuid, target_account uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
with eligible as (
 select e.*, l.account_allowed and (l.consent_id is null or c.individual) as account_ok,
 l.room_allowed and (l.consent_id is null or c.contribute) as room_ok
 from public.recommendation_events e
 join private.recommendation_learning_eligibility l on l.event_id=e.id
 join public.rooms r on r.id=e.room_id
 join auth.users u on u.id=e.account_user_id and u.is_anonymous is false
 join public.profiles p on p.id=u.id and p.account_status='active'
 join public.room_members m on m.room_id=e.room_id and m.user_id=u.id and m.id::text=e.actor_member_id
 left join private.room_learning_consents c on c.id=l.consent_id and c.revoked_at is null
 where e.expires_at>now() and e.media_id is not null
 and (e.room_id=target_room or e.account_user_id=target_account)
 and (l.consent_id is null or c.id is not null)
 and (l.room_kind<>'personal' or r.owner_user_id=e.account_user_id)
), scoped as (
 select e.*, 'room_session'::text scope_type from eligible e where room_id=target_room and room_ok
 union all
 select e.*, 'account'::text scope_type from eligible e where account_user_id=target_account and account_ok
), grouped as (
 select scope_type, source_type,media_id,
 count(*) filter(where event_type='queue_added') queue_added_count,
 count(*) filter(where event_type='queue_play_next') play_next_count,
 0::bigint queue_removed_count,0::bigint completed_count,0::bigint skipped_count,0::bigint replayed_count,0::bigint source_failed_count,
 max(occurred_at) last_event_at
 from scoped group by scope_type,source_type,media_id order by max(occurred_at) desc limit 250
) select coalesce(jsonb_agg(to_jsonb(grouped)),'[]'::jsonb) from grouped;
$$;
revoke all on function public.read_room_learning_aggregates(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_room_learning_aggregates(uuid,uuid) to service_role;

create or replace function private.ingest_recommendation_events(event_batch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  input_event jsonb;
  event_room_kind text;
  inserted_event public.recommendation_events%rowtype;
  existing_tombstone public.recommendation_event_tombstones%rowtype;
  inserted_tombstone public.recommendation_event_tombstones%rowtype;
  event_fingerprint text;
  event_ingested_at timestamptz;
  effective_expires_at timestamptz;
  verified_account_user_id uuid;
  received_count integer := 0;
  inserted_count integer := 0;
begin
  if jsonb_typeof(event_batch) <> 'array' or jsonb_array_length(event_batch) > 100 then
    raise exception 'Recommendation event batch must be an array of at most 100 rows.';
  end if;

  for input_event in
    select value
    from jsonb_array_elements(event_batch)
    order by value->>'occurred_at', value->>'authority_event_id'
  loop
    received_count := received_count + 1;
    inserted_event := null;
    existing_tombstone := null;
    inserted_tombstone := null;
    verified_account_user_id := null;
    event_ingested_at := (input_event->>'ingested_at')::timestamptz;

    select user_id into verified_account_user_id
    from public.room_members
    where id::text = input_event->>'actor_member_id'
      and room_id = (input_event->>'room_id')::uuid
      and user_id = (input_event->>'account_user_id')::uuid
    limit 1;

    effective_expires_at := event_ingested_at +
      case
        when verified_account_user_id is null then interval '30 days'
        else interval '180 days'
      end;

    event_fingerprint := md5((
      input_event - array['account_user_id', 'ingested_at', 'expires_at']::text[]
    )::text);

    insert into public.recommendation_event_tombstones (
      authority_event_id,
      idempotency_key,
      payload_fingerprint,
      created_at,
      expires_at
    ) values (
      input_event->>'authority_event_id',
      input_event->>'idempotency_key',
      event_fingerprint,
      event_ingested_at,
      event_ingested_at + interval '180 days'
    )
    on conflict do nothing
    returning * into inserted_tombstone;

    if inserted_tombstone.authority_event_id is null then
      select * into existing_tombstone
      from public.recommendation_event_tombstones
      where authority_event_id = input_event->>'authority_event_id'
        or idempotency_key = input_event->>'idempotency_key'
      order by authority_event_id = input_event->>'authority_event_id' desc
      limit 1;

      if existing_tombstone.authority_event_id is null
        or existing_tombstone.authority_event_id is distinct from input_event->>'authority_event_id'
        or existing_tombstone.idempotency_key is distinct from input_event->>'idempotency_key'
        or existing_tombstone.payload_fingerprint is distinct from event_fingerprint
      then
        raise exception 'Recommendation idempotency collision has conflicting payload.';
      end if;

      continue;
    end if;

    select room_kind into event_room_kind from public.rooms where id=(input_event->>'room_id')::uuid;
    -- Acknowledge suppressed transport events without persisting Temporary implicit history.
    if event_room_kind is null or (event_room_kind='temporary' and input_event->>'event_type' not in ('media_liked','media_unliked')) then
      inserted_count := inserted_count + 1;
      continue;
    end if;

    insert into public.recommendation_events (
      authority_event_id,
      idempotency_key,
      schema_version,
      event_type,
      room_id,
      room_session_id,
      playback_occurrence_id,
      queue_item_id,
      actor_member_id,
      contributor_member_id,
      account_user_id,
      source_type,
      media_id,
      reason,
      queue_position,
      duration_seconds,
      completion_ratio_bps,
      occurred_at,
      ingested_at,
      expires_at
    ) values (
      input_event->>'authority_event_id',
      input_event->>'idempotency_key',
      (input_event->>'schema_version')::smallint,
      input_event->>'event_type',
      (input_event->>'room_id')::uuid,
      input_event->>'room_session_id',
      input_event->>'playback_occurrence_id',
      input_event->>'queue_item_id',
      input_event->>'actor_member_id',
      input_event->>'contributor_member_id',
      verified_account_user_id,
      input_event->>'source_type',
      input_event->>'media_id',
      input_event->>'reason',
      (input_event->>'queue_position')::integer,
      (input_event->>'duration_seconds')::integer,
      (input_event->>'completion_ratio_bps')::integer,
      (input_event->>'occurred_at')::timestamptz,
      event_ingested_at,
      effective_expires_at
    )
    returning * into inserted_event;

    inserted_count := inserted_count + 1;

    if event_room_kind <> 'legacy' then
      perform private.record_learning_eligibility(inserted_event,event_room_kind);
      if inserted_event.media_id is not null and inserted_event.event_type in ('media_liked','media_unliked')
        and exists(select 1 from private.recommendation_learning_eligibility where event_id=inserted_event.id and account_allowed) then
          insert into public.media_preferences (
            user_id,
            source_type,
            media_id,
            preference_state,
            source_event_id,
            source_event_at,
            neutral_expires_at
          ) values (
            inserted_event.account_user_id,
            inserted_event.source_type,
            inserted_event.media_id,
            case when inserted_event.event_type = 'media_liked' then 'liked' else 'neutral' end,
            inserted_event.authority_event_id,
            inserted_event.occurred_at,
            case
              when inserted_event.event_type = 'media_unliked'
              then inserted_event.ingested_at + interval '30 days'
            end
          )
          on conflict (user_id, source_type, media_id)
          do update set
            preference_state = excluded.preference_state,
            revision = media_preferences.revision + 1,
            source_event_id = excluded.source_event_id,
            source_event_at = excluded.source_event_at,
            neutral_expires_at = excluded.neutral_expires_at,
            updated_at = now()
          where
            (excluded.source_event_at, excluded.source_event_id) >
            (media_preferences.source_event_at, media_preferences.source_event_id);
      end if;
      continue;
    end if;

    if inserted_event.media_id is not null then
      insert into public.recommendation_media_aggregates (
        scope_type,
        room_id,
        room_session_id,
        source_type,
        media_id,
        queue_added_count,
        queue_removed_count,
        play_next_count,
        completed_count,
        skipped_count,
        replayed_count,
        source_failed_count,
        liked_count,
        unliked_count,
        last_event_at,
        expires_at
      ) values (
        'room_session',
        inserted_event.room_id,
        inserted_event.room_session_id,
        inserted_event.source_type,
        inserted_event.media_id,
        case when inserted_event.event_type = 'queue_added' then 1 else 0 end,
        case when inserted_event.event_type = 'queue_removed' then 1 else 0 end,
        case when inserted_event.event_type = 'queue_play_next' then 1 else 0 end,
        case when inserted_event.event_type = 'playback_completed' then 1 else 0 end,
        case when inserted_event.event_type = 'playback_skipped' then 1 else 0 end,
        case when inserted_event.event_type = 'playback_replayed' then 1 else 0 end,
        case when inserted_event.event_type = 'source_failed' then 1 else 0 end,
        case when inserted_event.event_type = 'media_liked' then 1 else 0 end,
        case when inserted_event.event_type = 'media_unliked' then 1 else 0 end,
        inserted_event.occurred_at,
        inserted_event.ingested_at + interval '30 days'
      )
      on conflict (room_id, room_session_id, source_type, media_id)
        where scope_type = 'room_session'
      do update set
        queue_added_count = recommendation_media_aggregates.queue_added_count + excluded.queue_added_count,
        queue_removed_count = recommendation_media_aggregates.queue_removed_count + excluded.queue_removed_count,
        play_next_count = recommendation_media_aggregates.play_next_count + excluded.play_next_count,
        completed_count = recommendation_media_aggregates.completed_count + excluded.completed_count,
        skipped_count = recommendation_media_aggregates.skipped_count + excluded.skipped_count,
        replayed_count = recommendation_media_aggregates.replayed_count + excluded.replayed_count,
        source_failed_count = recommendation_media_aggregates.source_failed_count + excluded.source_failed_count,
        liked_count = recommendation_media_aggregates.liked_count + excluded.liked_count,
        unliked_count = recommendation_media_aggregates.unliked_count + excluded.unliked_count,
        last_event_at = greatest(recommendation_media_aggregates.last_event_at, excluded.last_event_at),
        expires_at = greatest(recommendation_media_aggregates.expires_at, excluded.expires_at),
        updated_at = now();

      if inserted_event.account_user_id is not null then
        insert into public.recommendation_media_aggregates (
          scope_type,
          account_user_id,
          source_type,
          media_id,
          queue_added_count,
          queue_removed_count,
          play_next_count,
          completed_count,
          skipped_count,
          replayed_count,
          source_failed_count,
          liked_count,
          unliked_count,
          last_event_at,
          expires_at
        ) values (
          'account',
          inserted_event.account_user_id,
          inserted_event.source_type,
          inserted_event.media_id,
          case when inserted_event.event_type = 'queue_added' then 1 else 0 end,
          case when inserted_event.event_type = 'queue_removed' then 1 else 0 end,
          case when inserted_event.event_type = 'queue_play_next' then 1 else 0 end,
          case when inserted_event.event_type = 'playback_completed' then 1 else 0 end,
          case when inserted_event.event_type = 'playback_skipped' then 1 else 0 end,
          case when inserted_event.event_type = 'playback_replayed' then 1 else 0 end,
          case when inserted_event.event_type = 'source_failed' then 1 else 0 end,
          case when inserted_event.event_type = 'media_liked' then 1 else 0 end,
          case when inserted_event.event_type = 'media_unliked' then 1 else 0 end,
          inserted_event.occurred_at,
          inserted_event.ingested_at + interval '180 days'
        )
        on conflict (account_user_id, source_type, media_id)
          where scope_type = 'account'
        do update set
          queue_added_count = recommendation_media_aggregates.queue_added_count + excluded.queue_added_count,
          queue_removed_count = recommendation_media_aggregates.queue_removed_count + excluded.queue_removed_count,
          play_next_count = recommendation_media_aggregates.play_next_count + excluded.play_next_count,
          completed_count = recommendation_media_aggregates.completed_count + excluded.completed_count,
          skipped_count = recommendation_media_aggregates.skipped_count + excluded.skipped_count,
          replayed_count = recommendation_media_aggregates.replayed_count + excluded.replayed_count,
          source_failed_count = recommendation_media_aggregates.source_failed_count + excluded.source_failed_count,
          liked_count = recommendation_media_aggregates.liked_count + excluded.liked_count,
          unliked_count = recommendation_media_aggregates.unliked_count + excluded.unliked_count,
          last_event_at = greatest(recommendation_media_aggregates.last_event_at, excluded.last_event_at),
          expires_at = greatest(recommendation_media_aggregates.expires_at, excluded.expires_at),
          updated_at = now();

        if inserted_event.event_type in ('media_liked', 'media_unliked') then
          insert into public.media_preferences (
            user_id,
            source_type,
            media_id,
            preference_state,
            source_event_id,
            source_event_at,
            neutral_expires_at
          ) values (
            inserted_event.account_user_id,
            inserted_event.source_type,
            inserted_event.media_id,
            case when inserted_event.event_type = 'media_liked' then 'liked' else 'neutral' end,
            inserted_event.authority_event_id,
            inserted_event.occurred_at,
            case
              when inserted_event.event_type = 'media_unliked'
              then inserted_event.ingested_at + interval '30 days'
            end
          )
          on conflict (user_id, source_type, media_id)
          do update set
            preference_state = excluded.preference_state,
            revision = media_preferences.revision + 1,
            source_event_id = excluded.source_event_id,
            source_event_at = excluded.source_event_at,
            neutral_expires_at = excluded.neutral_expires_at,
            updated_at = now()
          where
            (excluded.source_event_at, excluded.source_event_id) >
            (media_preferences.source_event_at, media_preferences.source_event_id);
        end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'received', received_count,
    'inserted', inserted_count,
    'duplicates', received_count - inserted_count
  );
end;
$$;

create or replace function private.prune_recommendation_data(prune_at timestamptz default now())
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  deleted_tombstones integer;
  deleted_events integer;
  deleted_aggregates integer;
  deleted_preferences integer;
begin
  delete from public.recommendation_event_tombstones where expires_at <= prune_at;
  get diagnostics deleted_tombstones = row_count;

  delete from public.recommendation_events where expires_at <= prune_at;
  get diagnostics deleted_events = row_count;

  delete from private.room_learning_consents c
  where c.revoked_at <= prune_at - interval '180 days'
    and not exists(select 1 from private.recommendation_learning_eligibility l where l.consent_id=c.id);

  delete from public.recommendation_media_aggregates where expires_at <= prune_at;
  get diagnostics deleted_aggregates = row_count;

  delete from public.media_preferences
  where preference_state = 'neutral' and neutral_expires_at <= prune_at;
  get diagnostics deleted_preferences = row_count;

  return jsonb_build_object(
    'tombstones', deleted_tombstones,
    'events', deleted_events,
    'aggregates', deleted_aggregates,
    'preferences', deleted_preferences
  );
end;
$$;
