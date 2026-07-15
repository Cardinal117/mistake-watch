-- TASK-002.8J Chunk B: uploaded catalogue authorization records.
-- Google OAuth proves identity only. This app-owned allowlist decides whether
-- a signed-in non-owner may browse/select/start uploaded catalogue media.

create table if not exists public.uploaded_catalogue_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  granted_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists uploaded_catalogue_authorizations_active_idx
  on public.uploaded_catalogue_authorizations (user_id, created_at desc)
  where status = 'active';

drop trigger if exists uploaded_catalogue_authorizations_set_updated_at
on public.uploaded_catalogue_authorizations;

create trigger uploaded_catalogue_authorizations_set_updated_at
before update on public.uploaded_catalogue_authorizations
for each row execute function private.set_updated_at();

alter table public.uploaded_catalogue_authorizations enable row level security;

revoke all on public.uploaded_catalogue_authorizations
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.uploaded_catalogue_authorizations
  to service_role;
