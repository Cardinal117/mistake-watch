-- TASK-011 Batch C: service-only durable recommendation events, aggregates,
-- and signed-in media preferences. Browser roles receive no table or RPC
-- access. SpacetimeDB remains the authority that originates these events.

create table public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  authority_event_id text not null unique
    check (char_length(authority_event_id) between 1 and 80),
  idempotency_key text not null unique
    check (char_length(idempotency_key) between 1 and 240),
  schema_version smallint not null check (schema_version = 1),
  event_type text not null check (event_type in (
    'queue_added',
    'queue_removed',
    'queue_reordered',
    'queue_play_next',
    'playback_started',
    'playback_completed',
    'playback_skipped',
    'playback_replayed',
    'source_failed',
    'media_liked',
    'media_unliked'
  )),
  room_id uuid not null references public.rooms(id) on delete cascade,
  room_session_id text not null
    check (char_length(room_session_id) between 1 and 80),
  playback_occurrence_id text
    check (playback_occurrence_id is null or char_length(playback_occurrence_id) <= 80),
  queue_item_id text
    check (queue_item_id is null or char_length(queue_item_id) <= 80),
  actor_member_id text
    check (actor_member_id is null or char_length(actor_member_id) <= 160),
  contributor_member_id text
    check (contributor_member_id is null or char_length(contributor_member_id) <= 160),
  account_user_id uuid references auth.users(id) on delete cascade,
  source_type text
    check (source_type is null or source_type in ('direct', 'hls', 'uploaded', 'youtube')),
  media_id text
    check (media_id is null or char_length(media_id) between 1 and 180),
  reason text check (reason is null or char_length(reason) <= 80),
  queue_position integer check (queue_position is null or queue_position >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  completion_ratio_bps integer
    check (completion_ratio_bps is null or completion_ratio_bps between 0 and 10000),
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > ingested_at),
  check ((source_type is null) = (media_id is null))
);

create index recommendation_events_room_session_occurred_idx
  on public.recommendation_events (room_id, room_session_id, occurred_at desc);

create index recommendation_events_account_occurred_idx
  on public.recommendation_events (account_user_id, occurred_at desc)
  where account_user_id is not null;

create index recommendation_events_media_occurred_idx
  on public.recommendation_events (source_type, media_id, occurred_at desc)
  where media_id is not null;

create index recommendation_events_expiry_idx
  on public.recommendation_events (expires_at);

create table public.recommendation_event_tombstones (
  authority_event_id text primary key
    check (char_length(authority_event_id) between 1 and 80),
  idempotency_key text not null unique
    check (char_length(idempotency_key) between 1 and 240),
  payload_fingerprint text not null
    check (char_length(payload_fingerprint) = 32),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at)
);

create index recommendation_event_tombstones_expiry_idx
  on public.recommendation_event_tombstones (expires_at);

create table public.recommendation_media_aggregates (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('account', 'room_session')),
  room_id uuid references public.rooms(id) on delete cascade,
  room_session_id text
    check (room_session_id is null or char_length(room_session_id) between 1 and 80),
  account_user_id uuid references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('direct', 'hls', 'uploaded', 'youtube')),
  media_id text not null check (char_length(media_id) between 1 and 180),
  queue_added_count bigint not null default 0 check (queue_added_count >= 0),
  queue_removed_count bigint not null default 0 check (queue_removed_count >= 0),
  play_next_count bigint not null default 0 check (play_next_count >= 0),
  completed_count bigint not null default 0 check (completed_count >= 0),
  skipped_count bigint not null default 0 check (skipped_count >= 0),
  replayed_count bigint not null default 0 check (replayed_count >= 0),
  source_failed_count bigint not null default 0 check (source_failed_count >= 0),
  liked_count bigint not null default 0 check (liked_count >= 0),
  unliked_count bigint not null default 0 check (unliked_count >= 0),
  last_event_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (scope_type = 'account' and account_user_id is not null and room_id is null and room_session_id is null)
    or
    (scope_type = 'room_session' and account_user_id is null and room_id is not null and room_session_id is not null)
  )
);

create unique index recommendation_media_aggregates_account_unique_idx
  on public.recommendation_media_aggregates (account_user_id, source_type, media_id)
  where scope_type = 'account';

create unique index recommendation_media_aggregates_room_unique_idx
  on public.recommendation_media_aggregates (room_id, room_session_id, source_type, media_id)
  where scope_type = 'room_session';

create index recommendation_media_aggregates_account_recent_idx
  on public.recommendation_media_aggregates (account_user_id, last_event_at desc)
  where scope_type = 'account';

create index recommendation_media_aggregates_room_recent_idx
  on public.recommendation_media_aggregates (room_id, room_session_id, last_event_at desc)
  where scope_type = 'room_session';

create index recommendation_media_aggregates_expiry_idx
  on public.recommendation_media_aggregates (expires_at);

create table public.media_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('direct', 'hls', 'uploaded', 'youtube')),
  media_id text not null check (char_length(media_id) between 1 and 180),
  preference_state text not null check (preference_state in ('liked', 'neutral')),
  revision bigint not null default 1 check (revision > 0),
  source_event_id text not null
    check (char_length(source_event_id) between 1 and 80),
  source_event_at timestamptz not null,
  neutral_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, media_id),
  check (
    (preference_state = 'liked' and neutral_expires_at is null)
    or
    (preference_state = 'neutral' and neutral_expires_at is not null)
  )
);

create index media_preferences_user_state_updated_idx
  on public.media_preferences (user_id, preference_state, updated_at desc);

create index media_preferences_neutral_expiry_idx
  on public.media_preferences (neutral_expires_at)
  where preference_state = 'neutral';

alter table public.recommendation_events enable row level security;
alter table public.recommendation_event_tombstones enable row level security;
alter table public.recommendation_media_aggregates enable row level security;
alter table public.media_preferences enable row level security;

revoke all on public.recommendation_events from public, anon, authenticated;
revoke all on public.recommendation_event_tombstones from public, anon, authenticated;
revoke all on public.recommendation_media_aggregates from public, anon, authenticated;
revoke all on public.media_preferences from public, anon, authenticated;

grant select, insert, update, delete on public.recommendation_events to service_role;
grant select, insert, update, delete on public.recommendation_event_tombstones to service_role;
grant select, insert, update, delete on public.recommendation_media_aggregates to service_role;
grant select, insert, update, delete on public.media_preferences to service_role;
grant select on public.room_members to service_role;

create or replace function private.ingest_recommendation_events(event_batch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  input_event jsonb;
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

create or replace function public.ingest_recommendation_events(event_batch jsonb)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.ingest_recommendation_events(event_batch);
$$;

create or replace function public.prune_recommendation_data(prune_at timestamptz default now())
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.prune_recommendation_data(prune_at);
$$;

revoke all on function private.ingest_recommendation_events(jsonb)
  from public, anon, authenticated;
revoke all on function private.prune_recommendation_data(timestamptz)
  from public, anon, authenticated;
revoke all on function public.ingest_recommendation_events(jsonb)
  from public, anon, authenticated;
revoke all on function public.prune_recommendation_data(timestamptz)
  from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.ingest_recommendation_events(jsonb) to service_role;
grant execute on function private.prune_recommendation_data(timestamptz) to service_role;
grant execute on function public.ingest_recommendation_events(jsonb) to service_role;
grant execute on function public.prune_recommendation_data(timestamptz) to service_role;

comment on table public.recommendation_events is
  'Immutable server-managed recommendation events drained from SpacetimeDB authority.';
comment on table public.recommendation_media_aggregates is
  'Bounded server-managed room-session and verified-account recommendation counters.';
comment on table public.media_preferences is
  'Private signed-in Mistake Watch Like state; neutral is not a negative signal.';
