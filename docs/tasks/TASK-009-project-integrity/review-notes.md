# Review Notes: Project Integrity, Security, and Roadmap Reconciliation

## Current Status

Status: local implementation and automated QA complete. The task is ready for
human review, but not for production release. Stop before cloud migration, R2
public-access changes, commit/push, or deployment without explicit approval.

## Resolved Decisions

- TASK-009 is used because TASK-008 is already reserved by the Spatial Cinema draft.
- Private object delivery is the highest-priority implementation lane.
- Two agents may work in disjoint corrective/runtime lanes.
- Database reconciliation follows code/test convergence and remains approval gated.
- Product roadmap restoration is documentation work only in this task.
- Recommendation intelligence remains app-native and explainable; YouTube remains
  a source/provider boundary rather than the hidden recommendation brain.

## Confirmed Findings

- `owner_only` metadata does not currently make the underlying object private.
- Fresh-room connection readiness can escape into the global error boundary.
- Local and remote migration histories differ by one idempotency migration.
- Health checks currently prove process response only.
- Several UI/security tests inspect source text instead of exercising behavior.
- Add Media playlist selection uses incompatible initialization/import keys.
- AI DJ, first-party recommendation learning, YouTube account playlists, and
  subscriptions are not implemented.

## Implementation Notes

- Agent 1 owns playlist correctness and behavior tests.
- Agent 2 owns fresh-room readiness and health/readiness work.
- The primary agent owns uploaded-object privacy, integration, database review,
  test-harness convergence, documentation, and final QA.

## Verification Notes

- Baseline from the preceding audit: 211 tests passed with typecheck, lint,
  build, and file-length policy passing.
- A targeted recommendation/Add Media audit ran 44 tests successfully but found
  significant route/browser coverage gaps.
- Final aggregate suite: 227 tests passed.
- Typecheck, lint, production build, file-length policy, Prettier, and
  `git diff --check` pass.
- Playwright smoke QA passed against the local application environment:
  dashboard shell, `/api/health`, and sanitized `/api/ready`.
- Supabase was inspected read-only. The CloudConvert uniqueness index exists
  live despite the missing remote history row. Three foreign-key indexes are
  prepared in a new local migration and have not been applied.
- Security advisors still report two intentional no-policy RLS notices and
  leaked-password protection disabled. The server-managed tables deny
  `anon`/`authenticated`; Google-only authentication reduces the immediate
  relevance of password protection.
- Performance advisors still report the three unindexed foreign keys until the
  pending migration is applied.

## Implemented Batches

- Batch A: catalogue responses and uploads no longer expose permanent R2 URLs or
  storage keys; owner catalogue delivery uses authorized application routes and
  short-lived signed redirects.
- Batch B: playlist selection uses stable row keys across default selection,
  filters, duplicate IDs, and import.
- Batch C: fresh rooms use typed connecting/retrying/ready/error states;
  `/api/health` remains shallow and `/api/ready` adds bounded checks.
- Batch D: migration history and advisor intent are documented; three covering
  indexes are migration-ready but unapplied.
- Batch E: `npm test` and Playwright smoke infrastructure are available.
- Batch F: README, HANDOFF, roadmap, Supabase, SpacetimeDB, dependency, and
  future-product records are current.

## Required Manual Release QA

- Apply the pending Supabase migration only after explicit approval, then rerun
  both advisor groups.
- Deploy a pinned reviewed commit and verify owner catalogue cards, posters,
  uploads, room-session playback, guests, and multi-participant sync.
- Confirm network and room state contain application routes/session references,
  not permanent R2 URLs.
- Disable the R2 public domain only after signed delivery passes, then repeat
  owner and guest playback QA. Old public URLs remain usable until this provider
  setting is disabled.
