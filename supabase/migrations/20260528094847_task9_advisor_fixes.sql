-- Task 9 advisor fixes.
-- Guest identities remain server-managed, but an explicit deny policy documents
-- that no direct browser role can read or mutate room-scoped token hashes.

create index member_permissions_user_id_idx on public.member_permissions (user_id);
create index member_permissions_guest_identity_id_idx
  on public.member_permissions (guest_identity_id);

create policy "guest_identities_no_direct_client_access"
on public.guest_identities
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
