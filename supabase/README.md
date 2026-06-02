# Supabase Workspace

This folder contains the Supabase migration history for Mistake Watch.

Task 9 applied the MVP durable data schema for guest-first rooms, room
membership, settings, permissions, queue items, and playback session records.
Supabase remains the durable database; SpacetimeDB remains the live room-state
and sync authority.

## Project

- Name: `watch-mistakestudios`
- Project ref: `qzmivwhzotuleivzphhm`
- Region: `eu-central-1`
- API URL: `https://qzmivwhzotuleivzphhm.supabase.co`

## Migration Rules

- Create migration files with the Supabase CLI.
- Do not invent migration timestamps manually.
- Enable RLS on every app table in exposed schemas.
- Pair RLS policies with explicit `GRANT` / `REVOKE` decisions for `anon` and
  `authenticated`.
- Keep `security definer` helper functions out of exposed schemas.
- Run security and performance advisors after schema changes.
- Generate TypeScript database types after migrations settle.

## Applied Migrations

- `20260528094023_mvp_schema_guest_identity.sql`
- `20260528094907_task9_advisor_fixes.sql`

## Advisor State

Security advisors pass with no lints after Task 9. Performance advisors only
report unused indexes on the fresh empty schema, which is expected until real
queries run. The earlier `public.rls_auto_enable()` warning was remediated by
revoking execution from public client roles.
