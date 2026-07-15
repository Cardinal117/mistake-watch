-- Cover saved-room owner foreign keys introduced in Task 15.D.

create index rooms_saved_by_user_id_idx
  on public.rooms (saved_by_user_id)
  where saved_by_user_id is not null;

create index rooms_saved_by_guest_identity_id_idx
  on public.rooms (saved_by_guest_identity_id)
  where saved_by_guest_identity_id is not null;
