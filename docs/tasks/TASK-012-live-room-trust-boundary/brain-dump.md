# Brain Dump: Live Room Trust Boundary And Lifecycle Hardening

## Goal

Correct the signed-in room lifecycle bug first, then harden live-room admission,
read privacy, revocation, abuse resistance, and the web perimeter through
separately releasable batches.

## Why It Matters

- Active signed-in members of unsaved rooms currently stop refreshing durable
  `room_members.last_seen_at` after the guest identity cookie is removed.
- The idle cleanup process can therefore close a legitimately occupied unsaved
  room.
- SpacetimeDB mutation reducers perform meaningful identity and permission
  checks, but first-time participant admission and room-state observation are
  not yet server-authorized.
- Public launch should not depend on normal browser UI behavior as an
  authorization boundary.

## Requirements

- Preserve guest-first room behavior.
- Support authenticated durable room activity without trusting a client-supplied
  member ID.
- Keep every security stage independently testable, reviewable, and releasable.
- Design participant grants around stable room membership, expiry, replay
  resistance, reconnect behavior, and revocation.
- Move sensitive room reads behind caller-authorized SpacetimeDB views in a
  staged compatibility migration.
- Add abuse limits, indexed room-specific access, telemetry, distributed
  provider limits, and browser headers only in their approved batches.

## Constraints

- TASK-011 recommendation persistence remains a separate closure track.
- TASK-013 Account Command Panel Completion remains separate.
- No SpacetimeDB schema or Maincloud publication occurs in Batch A.
- No database migration is required for Batch A1.
- Do not combine broad reducer modularization with security behavior changes.
- Do not deploy a large trust-boundary rewrite as one release.

## Acceptance Ideas

- Active guest and authenticated members refresh durable room presence.
- Wrong-room users and non-members cannot touch room lifecycle state.
- An active signed-in member prevents an unsaved room from being classified as
  idle.
- Later batches prove invented-member admission, cross-room subscriptions,
  replayed grants, and fresh-ID kick bypasses fail.

## Unknowns

- The exact SpacetimeDB identity-binding mechanism for server-issued admission
  grants requires a focused design review before Batch B implementation.
- The compatibility window for replacing public tables with authorized views
  requires a Maincloud release plan.
- The distributed rate-limit provider should be selected only during Batch E.
