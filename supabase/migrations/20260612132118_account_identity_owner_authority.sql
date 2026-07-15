-- TASK-002.8A: account identity and owner-authority foundation.
-- Google OAuth remains identity-only; app roles live in public.profiles, not
-- editable auth user metadata.

alter table public.profiles
  add column if not exists handle text,
  add column if not exists avatar_key text,
  add column if not exists avatar_source text not null default 'guest_avatar'
    check (avatar_source in ('guest_avatar', 'google_avatar', 'custom')),
  add column if not exists google_avatar_url text,
  add column if not exists role text not null default 'member'
    check (role in ('owner', 'member')),
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'disabled'));

create unique index if not exists profiles_handle_lower_unique_idx
  on public.profiles (lower(handle))
  where handle is not null;

create index if not exists profiles_role_idx
  on public.profiles (role);

alter table public.room_members
  add column if not exists linked_from_guest_identity_id uuid
    references public.guest_identities(id) on delete set null;

create index if not exists room_members_linked_guest_idx
  on public.room_members (linked_from_guest_identity_id)
  where linked_from_guest_identity_id is not null;

create table if not exists public.account_guest_migrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guest_identity_id uuid not null references public.guest_identities(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  room_member_id uuid references public.room_members(id) on delete set null,
  migrated_display_name text check (
    migrated_display_name is null
    or char_length(migrated_display_name) between 1 and 80
  ),
  migrated_avatar_key text,
  ownership_transferred boolean not null default false,
  saved_room_transferred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, guest_identity_id)
);

alter table public.account_guest_migrations enable row level security;

revoke all on public.account_guest_migrations from public, anon, authenticated;
grant select, insert on public.account_guest_migrations to authenticated;

create policy "account_guest_migrations_select_own"
on public.account_guest_migrations
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "account_guest_migrations_insert_own"
on public.account_guest_migrations
for insert
to authenticated
with check (user_id = (select auth.uid()));

create or replace function private.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'owner'
      and profile.account_status = 'active'
  );
$$;

create or replace function private.is_room_owner(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_app_owner()
    or exists (
      select 1
      from public.rooms room
      where room.id = p_room_id
        and room.owner_user_id = (select auth.uid())
    );
$$;

grant execute on function private.is_app_owner() to authenticated;
grant execute on function private.is_room_owner(uuid) to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Mistake member'
  );

  profile_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'picture'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  );

  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    google_avatar_url,
    avatar_source
  )
  values (
    new.id,
    left(profile_name, 80),
    profile_avatar,
    profile_avatar,
    case when profile_avatar is null then 'guest_avatar' else 'google_avatar' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- Users may maintain safe profile fields, but app/media authority is not
-- client-editable through role, account_status, or auth.user metadata.
revoke insert, update on public.profiles from authenticated;

grant insert (
  id,
  display_name,
  handle,
  avatar_url,
  avatar_key,
  avatar_source,
  google_avatar_url
) on public.profiles to authenticated;

grant update (
  display_name,
  handle,
  avatar_url,
  avatar_key,
  avatar_source,
  google_avatar_url
) on public.profiles to authenticated;
