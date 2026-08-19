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

## Batch A3: Account Re-entry And Active Participant Reconciliation

Status: Static diagnosis and controlled production reproduction completed on
2026-08-18. Narrow runtime correction approved on 2026-08-19 and implemented
with Batch B's admission protocol. Released and owner-QA verified in production
on 2026-08-19.

Related intake:

- `MW-BUG-010`

Work:

- Map Account Rooms and invite entry from server room resolution through
  SpacetimeDB connection, join/reconnect, participant subscription, and
  controller derivation.
- Reproduce in a disposable account-owned room across:
  - Account Rooms and invite entry paths;
  - retained and clean browser contexts;
  - one device and two contexts signed into the same Google account;
  - same and changed display names;
  - immediate control and control after participant readiness.
- Capture, without secrets, the durable relationship, current member ID, live
  participant ID/status, controller, effective permissions, connection state,
  and command result for each case.
- Classify the first divergent boundary as durable relationship, server snapshot,
  join admission, participant subscription, or controller/permission state.
- Reproduce the confirmed static collision where two browser contexts share one
  durable account member ID but hold different Spacetime identities.
- Preserve the rejection of arbitrary member-ID rebinding while evaluating a
  trusted account re-entry or handoff protocol.
- Add a deterministic regression test proposal for the confirmed boundary.
- Gate host, playback, queue, and authority controls on the current browser's
  confirmed live admission receipt.
- Remove client-side join retries that cannot provide a trusted admission.

Investigation constraints:

- Do not mutate queue order or uploaded-media state.
- Use only play/pause in a disposable room when a command is required to prove
  the denial.
- Do not log session cookies, OAuth tokens, invite secrets, provider credentials,
  emails, or private media references.
- Do not migrate Supabase, publish SpacetimeDB, deploy, or change runtime code.

Safe review point:

- Achieved: live join admission is the first confirmed failing boundary, and
  playback controls are also exposed before live participant authority exists.

## Batch B: Participant Admission Grants

Status: Completed and released on 2026-08-19. Maincloud publication, Git
checkpoints, Vercel deployment, automated release checks, and owner production
QA passed.

Work:

- Threat-model grant issuance, expiry, replay, identity binding, reconnect, and
  revocation.
- Independently review the protocol before coding.
- Implement server-issued grants and require them for first admission.
- Represent same-account browsers as concurrent private live sessions while
  retaining one aggregate public participant per durable member.
- Publish only an opaque per-browser presence receipt needed for fail-closed UI
  authority confirmation.
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
