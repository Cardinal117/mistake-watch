# Supabase Migration History Reconciliation

Snapshot date: 2026-07-15

Repository migration filenames now match the version and name pairs recorded by
the linked Supabase project exactly.

| Migration                                                | State   |
| -------------------------------------------------------- | ------- |
| `20260528094250_mvp_schema_guest_identity.sql`           | Applied |
| `20260528094847_task9_advisor_fixes.sql`                 | Applied |
| `20260529140202_room_lifecycle_saved_rooms.sql`          | Applied |
| `20260529140307_room_lifecycle_saved_by_indexes.sql`     | Applied |
| `20260612132118_account_identity_owner_authority.sql`    | Applied |
| `20260612132354_account_guest_migration_fk_indexes.sql`  | Applied |
| `20260613153741_r2_media_library.sql`                    | Applied |
| `20260613153949_r2_media_library_advisor_fixes.sql`      | Applied |
| `20260614083934_media_library_folders_posters_live.sql`  | Applied |
| `20260614090210_media_folder_policy_consolidation.sql`   | Applied |
| `20260614093956_media_library_management_refinement.sql` | Applied |
| `20260614103125_media_multipart_upload_progress.sql`     | Applied |
| `20260617070756_cloudconvert_processing_pipeline.sql`    | Applied |
| `20260617164154_cloudconvert_credit_efficiency.sql`      | Applied |
| `20260709080604_uploaded_catalogue_authorization.sql`    | Applied |
| `20260709092938_room_media_sessions.sql`                 | Applied |
| `20260714153348_task009_database_integrity_indexes.sql`  | Applied |
| `20260715092501_media_upload_completion_idempotency.sql` | Applied |

## Reconciled Idempotency Guard

The live database contains:

```sql
create unique index media_assets_owner_source_object_unique_idx
  on public.media_assets (owner_user_id, source_object_key)
  where source_object_key is not null;
```

That definition is equivalent to the guard in
`20260715092501_media_upload_completion_idempotency.sql`. On 2026-07-15, the
same idempotent SQL was applied through the supported migration path. It made no
schema change and registered the previously missing history row.

## TASK-009 Advisor Result

The TASK-009 migration was applied on 2026-07-14 and the three missing
foreign-key index findings no longer appear. The remaining performance notices
are informational unused-index findings and need production traffic before any
removal decision.

Security advisors still report two intentional service-role-only tables with
RLS enabled and no client policies, plus leaked-password protection disabled.
The tables deny `anon` and `authenticated`; password authentication is not an
active product path while Google remains the only account provider.

## Recovery Rule

The three TASK-009 indexes are additive and can be rolled back with
`drop index concurrently if exists public.<index_name>` in a separately
reviewed recovery migration. Do not edit an already-applied migration file.
