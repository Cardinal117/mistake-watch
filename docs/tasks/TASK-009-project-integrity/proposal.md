# Proposal: Project Integrity, Security, and Roadmap Reconciliation

## Problem

Mistake Watch has broad feature coverage and successful live QA, but project
state is not yet production-coherent. Uploaded catalogue responses can expose
permanent R2 URLs, fresh local rooms can fail during connection startup,
migration history has drifted, health checks are shallow, and several tests
prove source shape rather than runtime behavior. Documentation also conflates
completed shells with future product systems.

## Goal

Create a verified baseline where private media is actually private, room startup
fails safely, database history is explainable, operational checks are useful,
critical workflows have behavioral tests, and the roadmap accurately separates
implemented, partial, planned, and unplanned work.

## Scope

- Private uploaded-object delivery and catalogue response hardening.
- Add Media playlist-selection correctness.
- Fresh-room connection readiness and integration coverage.
- Dependency-aware liveness/readiness reporting.
- Supabase migration-history and advisor reconciliation.
- Aggregate test command, route integration, and browser E2E foundation.
- Dependency advisory tracking without an unsafe framework downgrade.
- README, HANDOFF, Supabase, SpacetimeDB, task-status, and roadmap cleanup.

## Non-Goals

- Recommendation brain or machine-learning implementation.
- AI DJ/session-intelligence implementation.
- Full Add/Discover or Watch Media Hub redesign.
- YouTube account playlists, subscriptions, or additional OAuth scopes.
- Spatial Cinema implementation.
- Cloudflare Stream migration or a new transcoding backend.

## Risks

- Removing permanent URLs may break poster or catalogue rendering if every
  consumer is not migrated to an authorized route.
- Health checks can create provider load or disclose sensitive topology if they
  are not split into shallow liveness and controlled readiness.
- Migration repair can be destructive if history is changed before live schema
  equivalence is proven.
- Test-harness changes can create noisy failures if introduced without stable
  fixtures and environment boundaries.

## Success Criteria

- Unauthorized clients cannot obtain durable uploaded-object URLs.
- Authorized catalogue use and room-scoped guest playback continue to work.
- Fresh-room startup exposes a typed connecting/retrying/error state rather than
  reaching the Next.js error boundary.
- Local migrations and cloud history have an evidence-backed reconciliation.
- Critical Add Media, media authorization, route, and room-startup behavior is
  exercised rather than inferred from source text.
- Project documentation and roadmap match current code and verified QA.
