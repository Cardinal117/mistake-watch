# Proposal: Live Room Trust Boundary And Lifecycle Hardening

## Problem

Mistake Watch has strong reducer-side mutation checks and private uploaded-media
delivery, but its original live-room core has two different classes of risk:

1. Authenticated account members do not refresh durable room presence after
   guest-to-account attachment, so active unsaved rooms can be closed as idle.
2. A durable account owner can open a room from Account Rooms yet reach playback
   controls without a matching active SpacetimeDB participant.
3. SpacetimeDB first-time participant admission and public room-state reads are
   not backed by server-issued room authorization.

Related weaknesses include short member-ID-based kick records, missing active
queue and participant ceilings, process-local provider limits, inconsistent
disabled-account enforcement, global table scans, and no global browser
security-header baseline.

## Goal

Establish one coherent, server-verifiable room authority boundary while
preserving room reliability, guest-first access, playback synchronization,
private uploaded media, and existing recommendation behavior.

## User Value

- Active signed-in rooms remain available instead of expiring incorrectly.
- Invited participants retain reliable refresh and reconnect behavior.
- Room presence, queue, chat, permissions, and playback state are visible only
  to authorized participants.
- Kicked or revoked memberships cannot return by inventing another client-side
  identifier.
- Abuse controls protect room stability without making ordinary use difficult.

## Scope

- Account-aware durable heartbeat and lifecycle correction.
- Legitimate account-owner re-entry diagnosis and active-participant
  reconciliation.
- Consistent disabled-account authorization.
- Server-issued participant admission grants.
- Stable membership identity, replay resistance, reconnect, and revocation.
- Private room state with caller-authorized read views.
- Participant, queue, chat, metadata, and historical-state limits.
- Room-indexed reducer access and malicious-client regression tests.
- Distributed provider/recommendation limits, security headers, telemetry, and
  operational alerts.

## Non-Goals

- Recommendation ranking or TASK-011 persistence changes.
- Account Command Panel implementation.
- Add Media, Media Hub, Watch, or Listen redesign.
- AI DJ, Spatial Cinema, voting, or autonomous queue behavior.
- Uploaded-media processing changes.
- General refactoring unrelated to the authority work.

## Risks

- Admission-grant mistakes could lock legitimate participants out.
- Treating durable ownership as an automatic live-control grant could bypass
  participant admission or elevate the wrong browser session.
- Reconnect rules could either weaken replay protection or make refresh brittle.
- Private-table migration can break generated clients and active subscriptions.
- Revocation can be ineffective if keyed to replaceable browser identifiers.
- Security headers can block YouTube, Google OAuth, SpacetimeDB, R2, or Vercel
  integrations if enforced without observation.
- Combining too many layers in one release would make rollback unsafe.

## Success Criteria

- Every lifecycle update is tied to a verified guest or authenticated room
  membership.
- A durable owner entering through Account Rooms or an invite becomes exactly
  one active live participant before playback control is enabled.
- Every first-time SpacetimeDB participant admission requires a valid,
  room-scoped server grant.
- Cross-room subscriptions and unauthorized room reads fail.
- Revocation is checked during grant issuance and admission.
- Active queue, participant, mutation, message, and metadata bounds are
  deterministic and tested.
- Each batch has its own QA evidence, commit checkpoint, rollout, and rollback
  plan.
