# Mistake Watch Handoff

Updated: 2026-07-14

## Current State

The production application includes guest and Google identity, Watch/Listen
rooms, SpacetimeDB live authority, YouTube and uploaded-media playback,
large-queue performance work, media uploads/processing, and Media Session
integration.

TASK-009 is complete on `main`. Its batches cover private object delivery,
playlist-selection correctness, room startup/readiness, database integrity,
test infrastructure, and documentation reconciliation. Merge commit `5c5ab4b`
passed the complete release gate and was deployed to production as
`dpl_4TGx7PqWASe2kFbHMYKtFr4kdKTx`.

## Required Reading

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/ROADMAP.md`
4. `docs/tasks/TASK-009-project-integrity/`
5. `supabase/MIGRATION_HISTORY.md`
6. `docs/tasks/TASK-002-incomplete-work-recovery/` for historical detail

TASK-001 is historical MVP context. TASK-007 records completed modularization
work and discovered issues. TASK-008 Spatial Cinema is an unapproved draft.

## Runtime Boundaries

- Supabase: durable product and authorization records.
- SpacetimeDB: active room authority and synchronized state.
- R2: private media objects.
- CloudConvert: optional, costed conversion jobs.
- Vercel: Next.js hosting and Speed Insights.

Permanent R2 URLs must not enter catalogue responses, queue/live state, or
player props. Catalogue access and room playback are separate authorization
paths.

## Local Gate

```powershell
npm install
npm run dev
npm run dev:check
npm test
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

Local browser QA cannot prove Google OAuth callback behavior, multi-participant
sync, cloud R2 delivery, or provider playback. Record those as production/manual
checks.

## TASK-009 Release Evidence

- Supabase migration `20260714153348 task009_database_integrity_indexes` is live.
- The three missing-foreign-key advisor findings are resolved.
- `r2.mistakestudios.com` is disabled and its hostname cache was purged.
- Retained permanent R2 URLs return `401`.
- Owner poster delivery redirects to private R2 with a five-minute signature;
  unauthenticated access returns `403`.
- `/api/health`, `/api/ready`, owner/guest catalogue authority, uploaded
  playback, and shared room playback passed live QA.

Do not repair migration-history rows by guesswork. The CloudConvert uniqueness
index is live while its local migration is absent from remote history; the
verified discrepancy is documented rather than silently rewritten.

## Next Product Direction

Take one bounded Watch Media Hub performance pass for
uploaded-grid virtualization and lazy signed-poster loading. This protects the
new private-delivery path from issuing unnecessary signatures or rendering the
whole catalogue. Then start the dedicated first-party
recommendation-intelligence packet and follow the product order in
`docs/ROADMAP.md`.
