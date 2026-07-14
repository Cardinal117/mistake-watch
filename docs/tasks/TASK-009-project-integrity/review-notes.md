# Review Notes: Project Integrity, Security, and Roadmap Reconciliation

## Current Status

Status: implementation, migration, provider cutover, automated QA, and live
owner/guest QA are complete. The reviewed feature branch is ready to merge to
`main` and deploy from the exact merge commit.

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
- Final aggregate suite: 229 tests passed.
- Typecheck, lint, production build, file-length policy, targeted Prettier for
  TASK-009 closure files, and `git diff --check` pass. The repository-wide
  Prettier command still reports 127 pre-existing files and is tracked as
  formatting debt rather than rewritten in this security release.
- Playwright smoke QA passed against the local application environment:
  dashboard shell, `/api/health`, and sanitized `/api/ready`.
- The TASK-009 index migration was applied remotely as
  `20260714153348 task009_database_integrity_indexes`. The CloudConvert
  uniqueness index still exists live despite its missing remote history row.
- Security advisors still report two intentional no-policy RLS notices and
  leaked-password protection disabled. The server-managed tables deny
  `anon`/`authenticated`; Google-only authentication reduces the immediate
  relevance of password protection.
- Performance advisors no longer report the three unindexed foreign keys.
  Remaining findings are informational unused-index notices that need traffic
  before any removal decision.
- Production deployment `dpl_C9BWDE7zBVzzGCZw1MBAkebNBPUs` passed
  `/api/health` and `/api/ready` checks.
- The R2 custom domain `r2.mistakestudios.com` is disabled. A hostname-scoped
  cache purge was accepted, and both a previously cached poster URL and a new
  random object path now return `401`.
- Authenticated owner poster delivery returns a `307` redirect to the private
  R2 endpoint with `X-Amz-Expires=300`; the same application route returns
  `403` without authentication. Vercel logs confirm both outcomes.
- User-run live QA passed owner catalogue access, guest catalogue denial,
  uploaded playback, room synchronization, and the remaining release smoke
  checks before the final provider cutover. The signed poster route was repeated
  successfully after the cutover.

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

## Release Closure

- Remove the obsolete Vercel production variable
  `CLOUDFLARE_R2_PUBLIC_BASE_URL` and redeploy the reviewed branch. Completed.
- Merge the reviewed TASK-009 branch into `main` from a clean worktree, rerun the
  release gate, push the merge commit, and deploy that exact commit.
- Keep the CloudConvert migration-history discrepancy documented; do not rewrite
  remote history without a separate equivalence-backed repair task.
- Track the SpacetimeDB row-cache warning separately; it did not affect the
  bounded readiness or room smoke checks.
