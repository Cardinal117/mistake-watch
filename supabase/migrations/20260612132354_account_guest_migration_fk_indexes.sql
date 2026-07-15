-- TASK-002.8A advisor follow-up: cover account migration foreign keys.

create index if not exists account_guest_migrations_guest_identity_id_idx
  on public.account_guest_migrations (guest_identity_id);

create index if not exists account_guest_migrations_room_id_idx
  on public.account_guest_migrations (room_id);

create index if not exists account_guest_migrations_room_member_id_idx
  on public.account_guest_migrations (room_member_id)
  where room_member_id is not null;
