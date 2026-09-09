# TASK-028 live rollout — 2026-09-09

Owner explicitly approved the existing production environment and main release.
This record supersedes earlier local-only, approval-blocked and pending-rollout notes.

## Released services

- Application source: `bfe898abfee4ece7ac2880f75ec956ac0cbf59c1`; functional commit `17242f7`.
- Vercel: `dpl_7nxRW5PByNWH4yCunQDjtadhX5YP`, Ready and promoted to
  <https://watch.mistakestudios.com>. Candidate URL:
  <https://mistake-watch-a86b2gjim-cardinal117s-projects.vercel.app>.
- Supabase: all eight reviewed TASK-028 migrations applied to `watch-mistakestudios`.
  The MCP-assigned timestamps were aligned transactionally to the exact reviewed
  repository versions only after all eight applications succeeded; original 19
  migrations and applied statements were retained. There are now 27 migrations.
- SpacetimeDB: compatible module published to Maincloud `mistake-watch-rooms`.
  Adds private `retired_room` / `room_member_revocation` and trusted retirement /
  revocation operations. No delete-data or break-clients override was used.
  All 20 existing table schemas and existing reducer/procedure contracts remained
  compatible; compound-index list order was normalized for comparison.
- Production application flags and private database creation gates are enabled
  for Personal, Shared, Themed and Temporary. Database gates stayed off until the
  matching frontend was Ready and promoted.
- `/api/rooms/cleanup` is scheduled daily at 03:00 UTC (05:00 SAST), with bounded
  opportunistic cleanup as well. Purge eligibility does not promise exact deletion
  at the 24-hour boundary; failed work remains retryable.

## Recovery and preservation

The prior automatic approval block was resolved by explicit owner authorization.
All 19 scoped public tables (6,054 rows), schema metadata and 13 public/private
function definitions were exported into ignored `.tmp/task028-production-backup/`.
Every exported table was restored and its full projected rows compared in an
isolated local scratch schema. All 13 captured function definitions were recreated
transactionally in scratch and rolled back. The verified manifest includes hashes.
Private payloads were not printed, committed or uploaded with the application.
Base64 is encoding, not encryption. This is a scoped product-state export, not a
full provider backup: auth credentials/sessions, raw R2 files and unchanged media
processing logs were excluded.

All 127 pre-existing rooms remained Legacy immediately after migration, including
13 open rooms. The 114 previously terminal rooms produced non-purge retirement
receipts; all 114 were subsequently completed by the deployed worker. No Legacy
room records or catalogue files were deleted by that backfill.

The deployment was made from a clean Git archive, excluding local env files,
recovery exports, caches and uncommitted work. The Spacetime builder warned its
local tsc binary was missing, then built/published successfully; earlier dedicated
TypeScript checks remain the compiler evidence, not that warning-producing run.

## Verification

Pre-release committed-code evidence: 690 Node tests, 290 SQL assertions, seven
combined browser tests, separate synthetic-owner deletion/session verification,
concurrency checks, full eight-migration replay, generated RPC parity, typecheck,
lint and production build passed. See `implementation-028.7-R3.md`.

Hosted checks:

- Vercel remote production build Ready; candidate and custom-domain health and
  readiness 200, including Supabase and Spacetime readiness.
- Unauthorized room cleanup returns 401; Watch/Listen development routes return 404.
- All four database gates read back enabled. No anon/authenticated grants exist
  on private tables. Existing room count/type preservation verified before QA creation.
- Authenticated production dashboard displays all four entry paths and Legacy Saved
  Rooms grouping. Personal creation/resume returns the same room identity, Watch/Listen switch works, and a
  separate guest session is returned home with an unavailable-room explanation.
- Shared account creation, Themed creation and guest Temporary creation connect.
  Themed Discover explicitly suppresses unfiltered recommendation claims.
- Guest without catalogue access gets YouTube/links; authorized account retains
  catalogue access. Two independent browser sessions joined the Temporary QA room,
  showed two participants, and retained host-only mode controls.
- Two-session YouTube preview/load/play, pause and paused +10-second seek passed with matching positions.
  This verifies browser/provider behavior, not physical audio-latency equivalence.
- Mobile 390x844 production Temporary Add surface visually inspected without clipping.

New device acceptance is still needed for distinct Google-account Shared approval /
removal across multiple physical devices, long R2 playback past expiry and phone
rotation/fullscreen. Local automated evidence is not a new physical-device pass.
The production QA rooms are clearly named `TASK028 Production QA ...`; Personal
is the owner's real persistent Personal room. No real account was deleted for QA.

## Advisors and follow-ups

Security advisors: no ERROR findings. Service-only private tables intentionally
have RLS enabled without client policies; existing service-only public tables have
similar INFO findings. Pre-existing leaked-password-protection warning remains:
<https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>.

Performance advisors: six new unindexed-FK INFO findings in the learning/membership
metadata tables (consent/policy/user and creation-request room references), plus
unused-index INFOs. Record for measured follow-up; no unrelated index changes here.
Remediation reference:
<https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys>.
Do not remove fresh indexes merely because they have not accumulated usage yet.

Owner's Spacetime scan/reducer-duration warnings remain separate future profiling
work. Hosted schema confirms queue/chat compound indexes already exist; planner use
and reducer causality were not established or fixed by this rollout.
Maintenance/prototyping schedules and what-is-new notices are captured in the inbox
as future work only. Existing dashboard/invite copy still contains historical
account/friends wording; the broader hub/copy refresh remains follow-on work.

## Rollback and next work

If necessary, disable new creation flags/gates while keeping kind-aware admission,
learning, membership and retirement guards deployed. Do not restore unrestricted
old room semantics after new kinds exist, drop the schema or relabel private rooms.

This is the room/learning-policy foundation. It does not ship a new recommendation
ranker, fair taste blend, theme classifier, continuous Autoplay or redesigned hub.
Next: owner live acceptance, then approved recommendation quality work.

## Main integration

[PR #15](https://github.com/Cardinal117/mistake-watch/pull/15) merged at
2026-09-09 13:05:42 UTC as `6fc445a4fe0927401450f62347fc7bff0491f77f`, preserving
all atomic commits. Base `c64196e` was unchanged; GitHub reported CLEAN/MERGEABLE.
Release docs `2ab29bb` and separate future-intake capture `f487e0e` are included.
Remote main ancestry and zero application/schema diff against deployed `bfe898a`
were verified. Custom-domain read-back still resolves to Ready deployment
`dpl_7nxRW5PByNWH4yCunQDjtadhX5YP`. No duplicate deployment is needed for docs-only
changes. This final receipt is a separately authorized documentation-only follow-up.
GitHub has no configured CI check runs; the local and hosted checks above are the
actual verification evidence. No unrelated worktree source was staged or reset.
