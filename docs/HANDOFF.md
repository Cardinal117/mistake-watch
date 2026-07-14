# Mistake Watch Handoff

Updated: 2026-07-14

## Current State

The production application includes guest and Google identity, Watch/Listen
rooms, SpacetimeDB live authority, YouTube and uploaded-media playback,
large-queue performance work, media uploads/processing, and Media Session
integration.

TASK-009 is active in the isolated `task-009-project-integrity` worktree. Its
local batches cover private object delivery, playlist-selection correctness,
room startup/readiness, database integrity preparation, test infrastructure,
and documentation reconciliation.

No TASK-009 cloud migration, push, merge, R2 configuration change, or production
deployment is implied by the local work.

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

## Release Gate

Before TASK-009 production release:

1. review and explicitly approve the pending Supabase index migration;
2. apply it and rerun security/performance advisors;
3. commit and push reviewed atomic changes;
4. deploy the pinned commit;
5. verify owner catalogue, posters, uploaded playback, guests, and room sessions;
6. verify no permanent R2 URL appears in responses or room state;
7. disable R2 public-domain access and repeat uploaded-media QA.

Do not repair migration-history rows by guesswork. The CloudConvert uniqueness
index is live while its local migration is absent from remote history; the
verified discrepancy is documented rather than silently rewritten.

## Next Product Direction

After TASK-009 closes, start a dedicated first-party recommendation-intelligence
packet. Add/Discover, Watch discovery, consented YouTube account signals, and AI
DJ should build on that foundation in the order recorded in
`docs/ROADMAP.md`.
