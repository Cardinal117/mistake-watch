# Acceptance Criteria: Live Room Trust Boundary And Lifecycle Hardening

## Batch A1: Durable Activity

- A valid guest session continues refreshing guest identity, room member, and
  room activity.
- A signed-in account member refreshes the matching
  `room_members.last_seen_at`.
- Disabled or missing account profiles cannot refresh durable activity.
- Active signed-in membership refreshes `rooms.last_active_at`.
- Unsaved room activity extends `idle_deadline_at` by one hour.
- Saved room activity keeps `idle_deadline_at` null.
- Closed rooms, non-members, wrong-room users, and unauthenticated users return
  `touched: false`.
- The action does not accept a member ID from the browser.
- Database failures are not silently reported as successful activity.
- No Supabase migration or SpacetimeDB change is included.

## Batch A2: Account Status

- Disabled accounts cannot load or refresh account-authorized room state.
- Disabled accounts cannot use quota-bearing provider routes.
- Active accounts and guest sessions retain existing behavior.
- One shared account-room authorization policy replaces A1's local check and
  prevents path-specific drift.

## Batch B: Admission

- First-time admission requires a valid server-issued grant.
- Grants are room-, member-, role-, expiry-, and identity-bound.
- Altered, expired, replayed, revoked, wrong-room, and wrong-identity grants
  fail.
- Reconnect behavior is explicit and does not require weakening first-admission
  checks.
- A custom client cannot create a participant with an invented member ID.
- Host authority remains derived from canonical server state.

## Batch C: Read Privacy

- Unauthorized and cross-room clients cannot query or subscribe to room
  sessions, participants, permissions, queue, chat, errors, or kicks.
- Authorized clients receive only their room's required fields.
- Generated bindings and normal room subscriptions continue to work.
- Private uploaded-media references remain opaque and permanent R2 URLs remain
  absent.
- Maincloud publication and rollback procedures are documented and tested.

## Batch D: Revocation And Abuse

- Revoked memberships cannot obtain or use fresh admission.
- A new browser member ID does not bypass a durable kick.
- Participant and active-queue ceilings are deterministic.
- Chat, queue mutations, metadata, identifiers, and history are bounded.
- Indexed room-specific access replaces identified global scans.
- Large legitimate rooms retain synchronized playback and queue performance.

## Batch E: Web Perimeter

- Provider limits are shared across Vercel instances.
- CSP is observed in report-only mode before enforcement.
- YouTube, Google OAuth, SpacetimeDB, R2, app assets, and Vercel runtime behavior
  remain functional.
- HSTS, content-type, referrer, frame, and permissions policies are documented
  and verified.
- Security events are observable without logging secrets or private media URLs.

## Must Not Break

- Guest-first room creation and joining.
- Watch/Listen mode continuity.
- Host playback and queue authority.
- Two-participant synchronization.
- Uploaded-media owner catalogue restrictions and shared active playback.
- TASK-010 performance behavior.
- TASK-011 Like and recommendation behavior.

## Release Gates

- Targeted tests for the active batch.
- `npm test`
- `npm run test:e2e` when browser behavior changes.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run check:file-lengths`
- Changed-file Prettier check.
- Independent protocol/security review for B and C.
- Production smoke test after each approved deployment.
