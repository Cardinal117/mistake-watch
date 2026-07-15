# Supabase Workspace

Supabase is Mistake Watch's durable store for accounts, room metadata, uploaded
media, and server-managed authorization records. SpacetimeDB remains the live
room-state and synchronization authority.

## Project

- Project: `watch-mistakestudios`
- Ref: `qzmivwhzotuleivzphhm`
- Region: `eu-central-1`

## Migration Rules

- Create migration files with the Supabase CLI.
- Review SQL and recovery steps before applying a cloud migration.
- Never replay a local migration solely because its timestamp differs remotely.
- Enable RLS for app tables in exposed schemas and make grants explicit.
- Keep service-role-only tables deny-by-default for `anon` and
  `authenticated`.
- Run security and performance advisors after every cloud schema change.
- Regenerate `lib/supabase/database.types.ts` when the schema changes shape.

## Current Integrity State

The 18 local migration filenames match the 18 production migration-history
entries. [MIGRATION_HISTORY.md](./MIGRATION_HISTORY.md) is the reconciliation
record.

The CloudConvert idempotency index and its migration-history entry both exist in
production. Its exact live index definition has been verified.

`room_media_sessions` and `uploaded_catalogue_authorizations` intentionally
use RLS with no client policies or grants. They are server-managed tables.

## Advisor State

`20260714153348_task009_database_integrity_indexes.sql` added the three covering
foreign-key indexes reported by the performance advisor. Remaining performance
notices are informational unused-index findings that require representative
production traffic before removal decisions.
