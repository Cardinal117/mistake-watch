# TASK-002.8A Account Auth Boundaries

## Initial Google Consent

The first Google sign-in is identity-only through Supabase Auth.

Allowed scopes:

- `openid`
- `email`
- `profile`

Explicitly not requested in TASK-002.8A:

- YouTube playlist access
- YouTube watch/history access
- Google Drive access
- Google Contacts access
- Google Calendar access
- `offline_access`

## Token Handling

- Supabase owns the OAuth session exchange and browser session cookies.
- Provider tokens must not be exposed to browser code.
- Provider tokens must not be copied into public tables.
- Long-lived provider refresh behavior is not enabled in this task.
- Any future provider-data task must add incremental consent copy before requesting a broader scope.

## Durable Profile Model

Application profile data lives in `public.profiles`, not directly in `auth.users`.

The app role field is `profiles.role`:

- `owner`: app/media owner authority for future Stream/R2 upload and source ingestion.
- `member`: normal signed-in account.

This role is separate from room membership `room_members.role`, which remains:

- `host`: current room host authority.
- `guest`: current room participant.

Client users can update safe profile fields only. App/media authority fields are not client-editable:

- `profiles.role`
- `profiles.account_status`

## Guest-To-Account Migration

Guest-first rooms remain valid. A signed-in account may explicitly attach the current room-scoped guest session.

Migration behavior:

- Requires a signed-in Supabase user.
- Requires the current room's `mw_guest_<roomId>` browser cookie.
- Updates the current room membership from `guest_identity_id` to `user_id`.
- Records `linked_from_guest_identity_id` on the room member.
- Transfers temporary room ownership to the signed-in user when the migrated guest was the room host and the room did not already have an account owner.
- Transfers saved-room attribution from guest identity to user when applicable.
- Records an audit row in `public.account_guest_migrations`.

Migration remains explicit. Signing in does not silently attach all guest rooms or create social graph records.

## Server Authority Primitive

Future owner-only APIs should call server-side account authority helpers rather than reading frontend flags.

Current primitive:

- `requireOwnerAccount()` in `lib/account/server.ts`
- `private.is_app_owner()` in Supabase SQL
- `private.is_room_owner(room_id)` in Supabase SQL

TASK-002.8 Cloudflare Stream/R2 upload and source ingestion must use this owner foundation before creating first-party media assets.
