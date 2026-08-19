# Review Notes: Live Room Trust Boundary And Lifecycle Hardening

## Current Decision

- TASK-012 is the authoritative identifier for live-room trust-boundary and
  lifecycle hardening.
- TASK-013 is reserved for Account Command Panel Completion.
- Batch A1 is the only runtime implementation currently approved.
- Batch A3 reproduction and diagnosis are complete. The narrow A3/B admission
  correction was approved for local implementation on 2026-08-19.
- Same-account devices coexist as independently admitted live sessions. Newest
  does not replace oldest.
- Git, Maincloud publication, Vercel deployment, and production mutation remain
  separately gated.

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
- Owner production QA reports that Account Rooms re-entry can show
  `Playback control denied because the caller is not an active room participant`.
- Static tracing confirms a same-account multi-context collision in the current
  live admission model:
  - the account path restores one durable `room_members.id`;
  - each browser stores its own room-scoped SpacetimeDB token and therefore can
    connect with a different Spacetime identity;
  - `room_participant` is keyed by `room_id:member_id`;
  - `join_room` rejects that member key when the stored participant belongs to
    another Spacetime identity; and
  - disconnect only marks the participant idle, so a later legitimate account
    context can remain rejected rather than reclaiming an authorized session.
- Playback then fails the first authority guard because the caller either has
  no admitted participant row or does not own the existing row.
- Production reproduction on 2026-08-18 from 17:25 to 17:30 SAST confirmed that
  Browser B retained enabled playback controls but could not control playback.
  Closing Browser A, waiting 20 seconds, and reloading B did not recover. This
  rules out a short readiness delay for the reproduced path and places the first
  divergence at live join admission.
- The enabled controls expose a second defect: the client currently treats
  durable host state as sufficient for control availability before live
  participant ownership is confirmed.

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
- MW-BUG-010 belongs inside TASK-012 rather than a separate authority task.
- Same-account multi-context identity collision is a confirmed static defect.
  Controlled production reproduction corroborated the collision and ruled out
  a short readiness delay for the tested path.
- The approved correction keeps one aggregate participant per durable member,
  authorizes reducers through private per-identity sessions, and exposes only an
  opaque browser-specific presence receipt for UI gating.

## Agent Strategy

- The primary implementer exclusively edits shared room-authority runtime code.
- A read-only security reviewer should challenge the Batch B grant protocol
  before implementation.
- An independent QA reviewer should inspect B/C security boundaries and final
  diff scope.
- Agents should not make parallel edits to `spacetime/src/index.ts`, room table
  definitions, or generated bindings.
- Batch A3 uses one primary investigator. A read-only reviewer is useful only
  after evidence identifies a candidate authority correction.

## Implementation Notes

- The approved A3/B correction is implemented locally with server-issued,
  identity-bound, one-time admission grants.
- Private per-connection participant sessions allow two authenticated browsers
  for one durable member to coexist without replacing each other.
- The public client receives only an opaque presence receipt; playback, queue,
  and host controls fail closed until that browser's receipt is online.
- Participant projection and permission helpers were extracted from
  `spacetime/src/index.ts`; the legacy entrypoint reduced from 2,514 to 2,073
  lines and remains below its frozen 2,205-line ceiling.

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
- Batch A3 must compare durable membership, current server member, live
  participant, and controller state before interpreting a rejected command.
- The existing source-inspection test intentionally protects against arbitrary
  member-ID rebinding. The correction must preserve that security invariant;
  simply allowing any new identity to overwrite a participant is prohibited.

## Deterministic Regression Test Proposal

1. Identity A joins as durable member M and becomes the authoritative host.
2. After A disconnects and its participant becomes idle, identity B presents
   trusted proof for the same account membership and can re-enter as M.
3. Without trusted proof, identity B remains unable to claim M whether A is
   online or idle.
4. When A and B are both active account contexts, behavior follows an explicit
   multi-context policy rather than silently replacing one identity. The live
   reproduction must decide whether this requires concurrent participant
   sessions or an intentional control handoff.
5. Refresh and temporary reconnect with the original Spacetime token remain
   idempotent and do not create duplicate participants.
6. Playback, queue, chat, and permission reducers reject a context that has not
   completed admission, even when it knows a valid durable member ID.

## Verification Notes

- TASK-011's durable Like proof remains a separate operational verification.
- No Maincloud publication is allowed during Batch A.
- Focused room-activity and provider-authorization tests: 9 passed.
- Full `npm test`: 320 passed.
- Typecheck, ESLint, production build, changed-file Prettier, diff check, and
  file-length policy passed.
- Manual production proof remains: keep an attached signed-in member active in
  an unsaved room for more than one hour and confirm the room remains open.
- Batch A3 production reproduction completed with a disposable room and
  redacted evidence. The invite secret shared during testing must be rotated.
- The in-app browser bridge could not start on 2026-08-18 because its bundled
  service failed trusted-path validation before tab discovery. Static diagnosis
  and focused tests continued; live matrix execution remains open.
- Focused Spacetime authority/readiness tests: 18 passed.
- Vercel production logs independently confirmed 21 preference endpoint 429s in
  the supplied seven-minute window; that remains tracked as `MW-BUG-012` rather
  than being folded into the authority correction.
- Focused Spacetime authority and readiness tests: 39 passed.
- Persistent local Spacetime runtime proof passed with two independently
  admitted sessions for the same durable host. Both coexisted, one aggregate
  participant remained, and Browser B retained authority and display metadata
  after Browser A disconnected.
- The runtime proof also rejected reuse of Browser A's consumed admission grant
  and rejected an invented durable member ID presented with Browser A's token.
- SpacetimeDB module build and generated TypeScript bindings passed.
- Full `npm test`: 373 passed. Typecheck, ESLint, production build, and
  file-length policy passed.
- Playwright public E2E smoke tests: 2 passed. The deterministic Media Hub
  catalogue test remained skipped behind its fixture gate.
- Maincloud publication, Vercel deployment, and the production two-browser QA
  matrix remain unperformed and separately gated.
