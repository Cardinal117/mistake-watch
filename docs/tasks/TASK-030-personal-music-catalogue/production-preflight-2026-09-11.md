# TASK-030 production release review

Historical preflight: **review complete before production execution**. Checked 2026-09-11,
approximately 07:14–07:23 UTC. No hosted schema, data, settings, deployment,
Git merge or PR was changed during this review. Read-only SQL used aggregate
counts and schema metadata; no private listening records or credentials exported.
The owner subsequently approved the full rollout, now completed and recorded in
[live-rollout-2026-09-11.md](live-rollout-2026-09-11.md). Statements below describe
the pre-release snapshot, not current deployment state.

## Release identities

- Candidate: `76a0b10f1714b0b7c4d217ce85e2f73f132293b0`, published on
  `codex/task-030-personal-music-catalogue` at `Cardinal117/mistake-watch`.
- Remote main: `e8fa1f9c44fc200f56c43aaf24d82c4910a8b560`; candidate is its
  single feature-commit descendant. Remote heads checked again at review close.
- Supabase: `watch-mistakestudios`, project `qzmivwhzotuleivzphhm`,
  ACTIVE_HEALTHY, Postgres 17.6.1.127.
- Vercel: `mistake-watch`, project `prj_7VzLOAM0sh5pUoMsv4dQZES2uRoX`,
  team `cardinal117s-projects`. Authenticated dashboard inspection confirmed
  production deployment `dpl_EfDVumjycp5QqTfBhvEcj29A1FQp` is Ready and serves
  `watch.mistakestudios.com`. This is the existing TASK-029 scroll release.
- Migration: `20260911055006_personal_music_catalogue.sql`.
  SHA256 of reviewed file:
  `de2d7f282540b5bd77d938a5d25da064cb98afdba6dd54e5e6ef83e0d9e63dc4`.

## Supabase preflight

All 28 hosted migration versions match the repository's preceding migrations.
Latest is `20260909150143_personal_discover_feedback`; only TASK-030 is pending.
All five new private tables are absent, as is the interaction `decision_id`
column. No new catalogue function or registration-trigger name conflicts exist.
The existing public feedback wrapper remains invoker, service-executable, and
not executable by anon/authenticated. Expected prior Discover owner/read/write/
prune functions are present with the tested signatures.

Current aggregate preservation baseline:

| Record | Count |
| --- | ---: |
| Rooms | 131 |
| Accounts | 2 |
| Memberships | 241 |
| Legacy rooms | 127 |
| Personal rooms | 1 |
| Shared rooms | 2 |
| Themed rooms | 1 |

Re-read immediately before and after application. Normal room lifecycle activity
can change counts; investigate differences rather than declaring data loss from
an old count alone. Do not restore the old TASK-029 count of 132 as a target.

Hosted advisors before migration:

- Existing WARN: leaked-password protection disabled. This remains a separate
  Auth configuration follow-up, not introduced by TASK-030. See
  [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- INFO: 15 RLS-without-policy notices on intentionally service-only tables;
  6 unindexed foreign keys and 13 unused indexes. Keep this baseline for the
  post-migration comparison; do not claim the hosted project has no warnings.
- No other security or performance warning/error was reported.

Reviewed current [Supabase changelog](https://supabase.com/changelog) and
[migration documentation](https://supabase.com/docs/guides/deployment/database-migrations).
No listed breaking change requires altering this scoped migration. The markdown
changelog endpoint was unsupported by the web reader; the HTML changelog was
read instead. Use migration tracking for the hosted application, not ad hoc DDL.

## Deployment and HTTP preflight

GitHub combined status returned no status checks. The PR-triggered workflow
query returned no runs, and branch PR search returned none. These are absent
hosted evidence, not passing CI. The completed local QA remains the validation
record: [review-notes.md](review-notes.md).

The authenticated Vercel overview shows **Connect Git Repository** and CLI
source for the current release. Therefore do not assume a GitHub merge creates
a deployment. Use the established explicit deployment from a clean Git archive,
with the existing hosted Production environment; never upload local `.env.local`
or enable synthetic preview routes.

The environment page visibly lists `YOUTUBE_API_KEY`, `CRON_SECRET`,
`SUPABASE_SECRET_KEY` and the required public Supabase/Spacetime variables for
Production. Values were not revealed. The new catalogue daily-limit variable is
absent, so the reviewed code would use its default of 100 batch requests/day.
No new provider credential or account scope is required.

The existing repository cron runs `/api/recommendations/drain` at 01:00 UTC.
The application change adds catalogue maintenance to that route; do not create
a second scheduler. Actual execution and physical cleanup need post-release
verification; a checked-in cron schedule is not proof that the new worker ran.

The current session has authenticated Vercel browser access. No Vercel CLI
executable/token was available in the checked standard paths/session variable;
establish ordinary CLI authentication before the deployment step if using the
established CLI flow. Never extract browser cookies or reveal environment values
to work around this. This does not require connecting the project to Git.

Read-only production HTTP checks:

| Path | Result |
| --- | --- |
| `/api/health` | 200, service healthy |
| `/api/ready` | 200, Supabase and SpacetimeDB ready |
| `/dev/listen-design` | 404 |
| `/dev/room-kinds` | 404 |

## Concrete production execution scope

1. Recheck the candidate/base, migration checksum, hosted parity and live counts.
   Establish the deployment session before changing the database.
2. Apply only the reviewed additive migration to `qzmivwhzotuleivzphhm`, with
   migration history matching repository version `20260911055006`. If the
   application tool assigns another version, validate the exact new history row
   before aligning only that row; preserve all preceding migration statements.
3. Verify new tables/RPC privileges, owner isolation and advisors against this
   baseline. Use read-only checks, not synthetic production accounts/history.
4. Resolve the signed-in owner's Personal room. Preview bounded reconciliation,
   retain its exact list privately, then apply only that list after current
   eligibility revalidation. No global history sweep or fabricated preferences.
5. Create the TASK-030 PR, merge the reviewed candidate after checks, and confirm
   the merged application tree matches it. Deploy that clean source explicitly
   to the existing Vercel project using hosted Production variables.
6. Verify alias/deployment SHA, health/readiness, private API access, hidden QA
   routes and signed-in Personal Discover. Observe one bounded metadata batch,
   catalogue readiness, expiry maintenance and provider-request counts. Preserve
   the live queue and explicit feedback; normal listening supplies later evidence.
7. Record actual migration, merge, deployment and verification receipts. Include
   only scoped release documentation in any follow-up documentation commit/push.

This scope excludes SpacetimeDB publication, new provider accounts, Auth security
changes, community learning, genre/BPM enrichment and Autoplay. Existing shared
metadata infrastructure is reusable, but suggestions remain owner-specific.

Use the [release plan](release-plan.md) for disable/rollback behavior. This review
does not claim the release has happened or that listening usefulness is proven.
