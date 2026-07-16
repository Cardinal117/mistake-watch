# Review Notes: Live Room Trust Boundary And Lifecycle Hardening

## Current Decision

- TASK-012 is the authoritative identifier for live-room trust-boundary and
  lifecycle hardening.
- TASK-013 is reserved for Account Command Panel Completion.
- Batch A1 is the only runtime implementation currently approved.

## Confirmed Evidence

- `touchRoomActivityAction` currently depends on the guest identity cookie.
- Guest-to-account migration moves the durable room member to `user_id`.
- Unsaved-room cleanup uses `room_members.last_seen_at` and a one-hour idle
  threshold.
- Core room tables are public in SpacetimeDB.
- `join_room` accepts a client-supplied unused member ID and grants default guest
  queue-add permission.
- Existing member-ID takeover is already rejected.
- Reducer mutation authority is stronger than admission and read privacy.

## Resolved Decisions

- Do not deploy TASK-012 as one release.
- Keep A1 and A2 as separate commit checkpoints.
- Core revocation checks belong in Batch B's admission design.
- Private-read migration must be staged rather than changing every table at
  once.
- Malicious-client tests begin in Batch B.
- CSP begins in report-only mode.
- General SpacetimeDB modularization stays outside scope unless directly needed
  for the approved authority work.

## Agent Strategy

- The primary implementer exclusively edits shared room-authority runtime code.
- A read-only security reviewer should challenge the Batch B grant protocol
  before implementation.
- An independent QA reviewer should inspect B/C security boundaries and final
  diff scope.
- Agents should not make parallel edits to `spacetime/src/index.ts`, room table
  definitions, or generated bindings.

## Implementation Notes

- Batch A1 should prefer a valid guest session, then fall back to authenticated
  account membership if the guest cookie is absent or stale.
- Batch A1 requires no database migration because all required columns and
  indexes already exist.
- Batch A1 is implemented through a small dependency-injected activity core and
  a server-only Supabase adapter.
- Account membership updates are constrained by verified member ID, room ID,
  and authenticated user ID.
- A1 locally requires `profiles.account_status = active`; A2 will replace this
  with the shared account-room authorization policy.
- Room activity updates remain restricted to open rooms.

## Verification Notes

- TASK-011's durable Like proof remains a separate operational verification.
- No Maincloud publication is allowed during Batch A.
- Focused room-activity and provider-authorization tests: 9 passed.
- Full `npm test`: 320 passed.
- Typecheck, ESLint, production build, changed-file Prettier, diff check, and
  file-length policy passed.
- Manual production proof remains: keep an attached signed-in member active in
  an unsaved room for more than one hour and confirm the room remains open.
