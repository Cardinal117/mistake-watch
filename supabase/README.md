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

The local and remote migration timestamps differ because earlier migrations
were applied through provider tooling that assigned new remote versions.
[MIGRATION_HISTORY.md](./MIGRATION_HISTORY.md) is the reconciliation record.

The CloudConvert idempotency index exists in production, but its local migration
is absent from Supabase's migration-history table. Do not re-run that DDL
blindly; its exact live index definition has already been verified.

`room_media_sessions` and `uploaded_catalogue_authorizations` intentionally
use RLS with no client policies or grants. They are server-managed tables.

## Pending Cloud Work

`20260714142309_task009_database_integrity_indexes.sql` adds covering indexes
for three foreign keys reported by the performance advisor. It has not been
applied. Apply it only after TASK-009 local QA and explicit approval, then rerun
both advisor groups and update the reconciliation record.
