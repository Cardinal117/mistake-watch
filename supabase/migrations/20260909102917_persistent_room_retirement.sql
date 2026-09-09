-- Transactional, private retirement receipts survive room/user deletion.
-- No account/guest has direct access; only the trusted server runs the worker.
create table private.persistent_room_retirements (
 room_id uuid primary key,
 purge boolean not null default false,
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 last_attempt_at timestamptz
);
alter table private.persistent_room_retirements enable row level security;
revoke all on private.persistent_room_retirements from public, anon, authenticated;
create index persistent_room_retirements_pending on private.persistent_room_retirements
 (coalesce(last_attempt_at,created_at),room_id) where not completed;

create function private.capture_persistent_room_retirement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.room_kind<>'temporary' then
   insert into private.persistent_room_retirements(room_id,purge) values(old.id,true)
   on conflict(room_id) do update set purge=true,completed=false,last_attempt_at=null;
  end if;
  return old;
 end if;
 -- Personal has a pre-existing recovery path for erroneous idle closure.
 -- It is not terminal; explicit administrative closure and deletion still retire.
 if new.room_kind='personal' and new.status='closed' and new.close_reason='idle_timeout' then return new; end if;
 if new.room_kind<>'temporary' then
  if new.status='open' and exists(select 1 from private.persistent_room_retirements where room_id=new.id) then
   raise exception 'Retired room identity cannot be reopened' using errcode='23514';
  end if;
  if new.status<>'open' then
   insert into private.persistent_room_retirements(room_id) values(new.id)
   on conflict(room_id) do nothing;
  end if;
 end if;
 return new;
end $$;
create trigger capture_persistent_room_retirement before insert or update or delete on public.rooms
 for each row execute function private.capture_persistent_room_retirement();
revoke all on function private.capture_persistent_room_retirement() from public,anon,authenticated;
-- Existing terminal rooms also need retirement; never touch open rooms or their data.
insert into private.persistent_room_retirements(room_id)
 select id from public.rooms where room_kind<>'temporary' and status<>'open'
 and (room_kind<>'personal' or close_reason is distinct from 'idle_timeout')
 on conflict(room_id) do nothing;

create function private.pending_persistent_room_retirements(target_room uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare jobs jsonb;
begin
 -- Claims are deliberately idempotent; concurrent workers may retire twice.
 -- Mark attempts, so a failing early job cannot starve later jobs in the batch.
 with picked as (
  select room_id from private.persistent_room_retirements
  where not completed and (target_room is null or room_id=target_room)
  order by coalesce(last_attempt_at,created_at),room_id limit 20 for update
 ), attempted as (
  update private.persistent_room_retirements r set last_attempt_at=clock_timestamp()
  from picked p where r.room_id=p.room_id returning r.room_id,r.purge
 ) select coalesce(jsonb_agg(attempted),'[]'::jsonb) into jobs from attempted;
 return jobs;
end $$;
create function public.pending_persistent_room_retirements(target_room uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.pending_persistent_room_retirements(target_room);
$$;

create function private.finish_persistent_room_retirement(target_room uuid,purge boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 -- A DELETE may have upgraded a close job while live retirement was in flight.
 update private.persistent_room_retirements r set completed=true
 where r.room_id=target_room and r.purge=finish_persistent_room_retirement.purge;
 return found;
end $$;
create function public.finish_persistent_room_retirement(target_room uuid,purge boolean)
returns boolean language sql security invoker set search_path='' as $$
 select private.finish_persistent_room_retirement(target_room,purge);
$$;
create function private.has_persistent_room_ended(target_room uuid)
returns boolean language sql security definer set search_path='' stable as $$
 select exists(select 1 from private.persistent_room_retirements where room_id=target_room);
$$;
create function public.has_persistent_room_ended(target_room uuid)
returns boolean language sql security invoker set search_path='' stable as $$
 select private.has_persistent_room_ended(target_room);
$$;
do $$ declare signature text; begin
 foreach signature in array array[
 'pending_persistent_room_retirements(uuid)',
 'finish_persistent_room_retirement(uuid,boolean)',
 'has_persistent_room_ended(uuid)'] loop
 execute 'revoke all on function private.'||signature||' from public,anon,authenticated';
 execute 'revoke all on function public.'||signature||' from public,anon,authenticated';
 execute 'grant execute on function private.'||signature||' to service_role';
 execute 'grant execute on function public.'||signature||' to service_role';
 end loop;
end $$;
