-- TASK-028.1: additive Legacy classification; no new room behavior is enabled.
-- Constant default fills existing rows without UPDATE, preserving updated_at,
-- room IDs, invitation hashes, saved flags and every existing lifecycle field.
alter table public.rooms
  add column room_kind text not null default 'legacy',
  add constraint rooms_room_kind_check
    check (room_kind in ('legacy', 'personal', 'shared', 'themed', 'temporary')),
  add constraint rooms_room_kind_enabled_check
    check (room_kind = 'legacy');

comment on column public.rooms.room_kind is
  'Durable room purpose, separate from Watch/Listen mode. Existing rooms are Legacy.';
comment on constraint rooms_room_kind_enabled_check on public.rooms is
  'TASK-028.1 release gate. Widen only with the corresponding admission, privacy and lifecycle implementation.';

-- Existing grants/RLS remain unchanged. Even privileged server inserts/updates
-- must pass the enabled-kind constraint. Old clients omit the column and retain
-- Legacy behavior. No update/backfill statement, cleanup change or new index needed.
