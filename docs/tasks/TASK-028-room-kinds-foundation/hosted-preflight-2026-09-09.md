# TASK-028 hosted QA preflight

## Resolved environment choice

The owner chose the existing production environment. Recovery export authorization was resolved and the verified rollout completed; see [live rollout](live-rollout-2026-09-09.md). The read-only findings and pending choices below are the historical preflight, not current release status.

Date: 2026-09-09. Candidate: `bfe898abfee4ece7ac2880f75ec956ac0cbf59c1` on
`origin/codex/task-028-room-kinds`. Status: read-only hosted preparation complete;
QA environment decision and recovery verification required before hosted changes.

## Verified hosted state

- Supabase project `watch-mistakestudios` is healthy, PostgreSQL 17.6, in the
  existing CardCore organization (Free plan). No development branches exist.
  No other existing Watch staging project was listed. Unrelated inactive projects
  were not touched or repurposed.
- There are 19 applied migrations, latest `20260716064635`. None of the eight
  TASK-028 migrations is applied. `rooms.room_kind` and the new private feature/
  retirement tables do not yet exist. First migration classifies all existing
  rooms Legacy; do not run new-kind-dependent preflight SQL before that column exists.
- Aggregate-only read: 13 open rooms, all saved; 109 closed and five archived,
  neither group saved. No room names, memberships, media URLs or private content
  were read. Counts are a point-in-time snapshot and must be refreshed before rollout.
- Vercel production deployment `dpl_9ud5VPgopYH3SKJewBuyTEgPCWDH` is Ready at
  `mistake-watch-lkenmzwyt-cardinal117s-projects.vercel.app`; the custom production
  URL resolved to it. No promotion/redeployment was performed.
- Environment metadata: service variables and CRON_SECRET are production-scoped;
  Preview contains no variables. All four new room-kind application gates are
  absent and therefore default off. Secret values were not decrypted/copied/printed.
  Presence of CRON_SECRET is not proof of scheduler execution or live authorization.

## Live-module compatibility

Compared deployed `mistake-watch-rooms` metadata against the existing isolated
local `mistake-watch-task028` module. Resolved type references and normalized the
order of index lists (the first raw comparison showed order-only differences).

- All 20 existing table definitions match.
- All existing reducer and procedure signatures match; none removed.
- Additions: private `retired_room`, private `room_member_revocation`, and trusted
  `retire_room` / `revoke_room_membership` reducers.
- This supports an additive publication plan. It is not proof of uninterrupted
  connected-client behavior during a hosted update; rehearse and verify that.
  Do not add --break-clients automatically, reset live data or delete tables.

The deployed queue and chat tables already contain `(room_id, position)` and
`(room_id, created_ms)` btree indexes respectively. This advances the separate
performance report from source-only to deployed-schema confirmation. Subscription
planner selection and reducer latency causality still require measurement.

## Prepared artifact and local state

A clean Git archive of the exact candidate is prepared at ignored
`.tmp/task028-bfe898a-release.tar` (1,467 archive entries):
SHA-256 `12c2ea57f59e1ad084a20c1875672b891c7981af86d8864be223a2bcb70ec0c1`.
No .env.local, .tmp, .vercel, .next or node_modules entries are included. Use clean
committed artifacts for deployment, not a direct dirty-worktree upload.

The local Spacetime service had stopped between sessions. It was restarted on
127.0.0.1:5376 with its existing ignored data directory only to compare schemas.
Next/Supabase were not restarted or reset here. Earlier local QA remains evidence
about the committed candidate; it is not a claim that every local service is
currently available. No application behavior changed or tests were rerun in this
read-only release preparation.

## Environment choice needed

1. **Isolated hosted QA:** create/use a separate Supabase environment plus separate
   live module and configure Preview variables. Seed synthetic accounts/rooms.
   This protects production but may require a plan/cost decision. Do not create
   billable resources or upgrade the organization without explicit approval.
   Catalogue/OAuth require deliberate isolated configuration; a separate frontend
   alone does not isolate the backends.
2. **Controlled existing-service QA:** explicitly approve the live-database/module
   window, first obtain and verify a recovery backup, refresh drift/guard checks,
   then apply all eight migrations and compatible module/app in reviewed order.
   Keep all creation gates off until the matching application is in place. Do not
   expose new private kinds to older unrestricted application paths merely because
   the new frontend URL is called a preview. Coordinate old deployments/client
   behavior and preserve the working site's room data.

A recovery checkpoint has not been inspected or created in this preflight. The
Free plan is not evidence of an available automatic backup; current Supabase docs
recommend exports for free-tier projects. The review must verify restore coverage
before applying DDL to the existing production database. Room catalogue files are
separate storage and must remain untouched.

For either route: test migration reconciliation guards, scheduled/opportunistic
cleanup, stale admission, real provider playback and physical multi-device flows.
The R3 migration will queue retirement for existing terminal persistent rooms;
review that backfill explicitly. Never bypass its protections to make deployment
appear successful. Main merge and final production activation follow acceptance.

## Sources and evidence

- Supabase MCP: project/organization/branch/migration metadata; read-only schema
  and aggregate room counts. No DDL/DML, auth, storage or hosted settings changed.
- Vercel CLI inspect and env list, metadata only; no env pull or deployment command.
- Spacetime CLI describe against hosted and local modules; no hosted publish.
- [Supabase branching](https://supabase.com/docs/guides/deployment/branching):
  environments have separate credentials and are data-less by default.
- [Branch usage billing](https://supabase.com/docs/guides/platform/manage-your-usage/branching):
  branches incur usage charges; no organization-specific cost quote was requested.
- [Backup guidance](https://supabase.com/docs/guides/platform/backups): verify recovery;
  free-tier projects should export data. No paid backup/branch option was activated.

Local ignored evidence: hosted/local Spacetime JSON, normalized compatibility JSON,
redacted environment-name lists and the clean Git archive. This report is a new
local documentation change after the three approved commits, not yet committed.
