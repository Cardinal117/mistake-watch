# Tasks: Live Room Trust Boundary And Lifecycle Hardening

## Batch A1: Signed-In Durable Heartbeat

Status: Implemented locally on 2026-07-16. Automated QA passed. Not committed,
pushed, or deployed.

Suggested files:

- `lib/rooms/actions.ts`
- `lib/rooms/activity.ts`
- `tests/rooms/room-activity.test.mjs`

Work:

- Preserve valid guest-cookie activity refresh.
- Fall back to authenticated account membership when no valid guest session is
  available.
- Require the authenticated account profile to be active.
- Update only the verified open-room member.
- Refresh room activity and the unsaved-room idle deadline.
- Add focused source-boundary and lifecycle-policy regression tests.

Review checkpoint:

- Guest and account paths are both supported.
- Client-supplied member IDs are not accepted.
- Wrong-room users, non-members, closed rooms, and unauthenticated requests do
  not touch lifecycle state.
- No migration or SpacetimeDB publication is introduced.

Safe commit point:

- A1 tests, full test suite, typecheck, lint, build, formatting, and file-length
  checks pass.

## Batch A2: Disabled-Account Authorization

Status: Planned, not approved for implementation.

Work:

- Centralize active-account room membership authorization.
- Replace A1's local heartbeat check and apply the shared helper to room loading,
  provider routes, and relevant account-authorized room actions.
- Add disabled-account and stale-membership regression tests.

Safe commit point:

- Account authorization changes are isolated from SpacetimeDB schema work.

## Batch B: Participant Admission Grants

Status: Design review required before implementation.

Work:

- Threat-model grant issuance, expiry, replay, identity binding, reconnect, and
  revocation.
- Independently review the protocol before coding.
- Implement server-issued grants and require them for first admission.
- Add malicious-client admission tests from the first implementation commit.

Safe commit point:

- Invented, altered, expired, replayed, wrong-room, and wrong-identity grants
  fail while refresh and temporary reconnect remain reliable.

## Batch C: Private Room Reads

Status: Planned.

Work:

- Add required indexes and caller-authorized room views.
- Migrate generated bindings and client subscriptions.
- Prove cross-room reads fail.
- Remove public visibility only after compatibility and rollback QA.

Safe commit point:

- Authorized-view client behavior passes locally and through a controlled
  Maincloud publication plan.

## Batch D: Revocation Operations And Abuse Resistance

Status: Planned.

Work:

- Complete durable kick/revocation operations.
- Add participant, queue, message, metadata, and retention limits.
- Replace global reducer scans with indexed room-specific access.
- Add custom-client abuse and regression coverage.

Safe commit point:

- Limits reject abuse without disrupting large legitimate rooms or synchronized
  playback.

## Batch E: Web Perimeter

Status: Planned.

Work:

- Add distributed provider/recommendation rate limiting.
- Add operational telemetry and alerts.
- Introduce report-only CSP, validate integrations, then enforce.
- Add the remaining global security-header baseline.

Safe commit point:

- Header and limit enforcement have measured evidence and documented rollback.

## Final Task: Release And Documentation Reconciliation

Work:

- Run `qa-release-gate` for every batch.
- Update `docs/HANDOFF.md`, roadmap state, and the task review artifacts.
- Use `git-commit-assistant` after QA passes.
- Do not stage, commit, push, publish, migrate, or deploy without the applicable
  approval.
