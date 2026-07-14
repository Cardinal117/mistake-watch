# Supabase Migration History Reconciliation

Snapshot date: 2026-07-14

This file records semantic equivalence between repository migrations and the
versions recorded by the linked Supabase project. Version differences are not
evidence that DDL is missing.

| Local migration                                          | Remote history version and name                      | State                              |
| -------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| `20260528094023_mvp_schema_guest_identity.sql`           | `20260528094250 mvp_schema_guest_identity`           | Applied                            |
| `20260528094907_task9_advisor_fixes.sql`                 | `20260528094847 task9_advisor_fixes`                 | Applied                            |
| `20260529135835_room_lifecycle_saved_rooms.sql`          | `20260529140202 room_lifecycle_saved_rooms`          | Applied                            |
| `20260529140325_room_lifecycle_saved_by_indexes.sql`     | `20260529140307 room_lifecycle_saved_by_indexes`     | Applied                            |
| `20260612092858_account_identity_owner_authority.sql`    | `20260612132118 account_identity_owner_authority`    | Applied                            |
| `20260612132311_account_guest_migration_fk_indexes.sql`  | `20260612132354 account_guest_migration_fk_indexes`  | Applied                            |
| `20260613152000_r2_media_library.sql`                    | `20260613153741 r2_media_library`                    | Applied                            |
| `20260613154500_r2_media_library_advisor_fixes.sql`      | `20260613153949 r2_media_library_advisor_fixes`      | Applied                            |
| `20260614082000_media_library_folders_posters_live.sql`  | `20260614083934 media_library_folders_posters_live`  | Applied                            |
| `20260614083500_media_folder_policy_consolidation.sql`   | `20260614090210 media_folder_policy_consolidation`   | Applied                            |
| `20260614092507_media_library_management_refinement.sql` | `20260614093956 media_library_management_refinement` | Applied                            |
| `20260614101745_media_multipart_upload_progress.sql`     | `20260614103125 media_multipart_upload_progress`     | Applied                            |
| `20260617064533_cloudconvert_processing_pipeline.sql`    | `20260617070756 cloudconvert_processing_pipeline`    | Applied                            |
| `20260617183000_cloudconvert_credit_efficiency.sql`      | `20260617164154 cloudconvert_credit_efficiency`      | Applied                            |
| `20260708130741_media_upload_completion_idempotency.sql` | No remote history row                                | Live index verified; history drift |
| `20260709054334_uploaded_catalogue_authorization.sql`    | `20260709080604 uploaded_catalogue_authorization`    | Applied                            |
| `20260709092938_room_media_sessions.sql`                 | `20260709092938 room_media_sessions`                 | Applied                            |
| `20260714142309_task009_database_integrity_indexes.sql`  | `20260714153348 task009_database_integrity_indexes`  | Applied                            |

## Verified Drift

The live database contains:

```sql
create unique index media_assets_owner_source_object_unique_idx
  on public.media_assets (owner_user_id, source_object_key)
  where source_object_key is not null;
```

That definition is equivalent to the guard in
`20260708130741_media_upload_completion_idempotency.sql`. The safest current
state is to document the discrepancy. Do not insert or modify migration-history
rows without a separately reviewed repair plan.

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
