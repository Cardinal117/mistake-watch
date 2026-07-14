# Tasks: Project Integrity, Security, and Roadmap Reconciliation

## Gate 0: Baseline and Contract Inventory

- Record the current commit, worktree state, migration inventory, test baseline,
  and affected API response contracts.
- Trace every consumer of `publicUrl`, `thumbnailUrl`, object keys, room sessions,
  playlist selection keys, room creation, and health endpoints.
- Confirm no production or cloud mutation occurs during implementation.

Review checkpoint:

- Every permanent-media URL exit path and migration discrepancy has evidence.

Safe commit point:

- Task packet and read-only baseline only.

## Batch A: Uploaded Object Privacy

- Remove permanent R2 URLs from upload and catalogue responses.
- Add application-owned authorized poster/media delivery references.
- Preserve owner catalogue access and room-session guest playback.
- Add route and authorization tests for owner, authorized user, room guest,
  unauthorized account, expired session, and missing object cases.
- Verify cache, range-request, and error behavior for video and poster delivery.

Review checkpoint:

- No permanent object URL enters catalogue JSON, durable queue state, live room
  state, dashboard state, or player props.

Safe commit point:

- Object privacy code and focused tests, before any migration or deployment.

## Batch B: Corrective Defects and Add Media Coverage

- Use one stable playlist-row key contract for initialization, selection,
  filtering, and import in Watch and Listen flows.
- Add rendered interaction tests for default selection, duplicate video IDs,
  select all/none, filtered selection, and selected import.
- Consolidate only behavior that can be shared without a UI redesign.

Review checkpoint:

- Source-text assertions are not the primary proof of playlist behavior.

Safe commit point:

- Playlist correctness and tests independent of security/database work.

## Batch C: Room Startup and Operational Readiness

- Represent SpacetimeDB startup as typed connecting, retrying, ready, and error states.
- Keep inactive connection objects out of render-time room state.
- Add create-to-connect integration coverage and retry/error UI coverage.
- Keep `/api/health` as shallow liveness and add bounded `/api/ready` checks.
- Sanitize readiness output and avoid paid provider operations.

Review checkpoint:

- A fresh room cannot reach the application error boundary solely because the
  connection is not active yet.

Safe commit point:

- Runtime readiness behavior and focused tests.

## Batch D: Supabase Integrity and Advisors

- Compare all local migrations with remote migration history and live schema.
- Reconcile the CloudConvert idempotency migration only after exact equivalence proof.
- Add justified indexes for the three advisor-reported foreign keys.
- Document intentional service-role-only RLS and verify anon/authenticated denial.
- Review leaked-password protection in the context of Google-only authentication.
- Re-run Supabase security and performance advisors.

Review checkpoint:

- Migration repair has a rollback/recovery note and no DDL is replayed blindly.

Safe commit point:

- Migration files and database documentation before cloud application.

## Batch E: Test and Dependency Baseline

- Add an aggregate `npm test` command covering deterministic suites.
- Add route-level test helpers and a minimal Playwright browser harness.
- Prioritize media authorization, Add Media, health/readiness, and room startup.
- Document tests requiring live Google OAuth or cloud providers.
- Record the moderate Next/PostCSS advisories; do not apply the suggested downgrade.

Review checkpoint:

- The aggregate command is deterministic and CI-appropriate.

Safe commit point:

- Test infrastructure and dependency record.

## Batch F: Documentation and Roadmap Reconciliation

- Condense README and remove stale completion/test claims.
- Correct HANDOFF next-task routing and completed shell descriptions.
- Update Supabase migration inventory and SpacetimeDB database naming.
- Mark historical/superseded task packets clearly.
- Record the next product packets for recommendation intelligence, Add/Discover,
  Watch discovery, consented YouTube account integration, and AI DJ.
- Preserve TASK-008 Spatial Cinema as a separate unapproved draft.

Review checkpoint:

- A new engineer can identify what is live, partial, planned, draft, and blocked
  without reading chat history.

Safe commit point:

- Documentation-only reconciliation after implementation facts are final.

## Final Gate: QA and Commit Preparation

- Run complete tests, typecheck, lint, build, migration checks, and advisor review.
- Run local browser smoke tests and document production-only Google OAuth checks.
- Use `qa-release-gate` and produce `qa-report.html` when implementation completes.
- Use `git-commit-assistant` only after QA passes and the user requests commit prep.
- Do not apply cloud migrations, push, or deploy without explicit approval.
