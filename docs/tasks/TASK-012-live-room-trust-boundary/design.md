# Design Spec: Live Room Trust Boundary And Lifecycle Hardening

## Authority Model

Use explicit authority terms:

- **Account or guest identity:** durable Supabase identity source.
- **Room membership:** durable authorization to belong to one room.
- **Spacetime identity:** live connection identity.
- **Participant:** admitted live representation of a durable room membership.
- **Host/controller:** room capabilities derived from canonical server state.

Client-provided display preferences may remain inputs. Room membership, role,
permissions, revocation, and live admission must be server-resolved.

## Batch A1: Durable Activity

`touchRoomActivityAction` keeps the existing guest-cookie path. If that path is
missing or no longer resolves, it authenticates through the Supabase server
client, requires the current profile to be active, and resolves the member using
`(room_id, user_id)` against an open room.

Only after both open-room and membership checks pass:

- update the matching `room_members.last_seen_at`;
- update `rooms.last_active_at`;
- extend `idle_deadline_at` by one hour for unsaved rooms;
- retain `idle_deadline_at = null` for saved rooms.

The action returns `{ touched: false }` for unauthenticated users, closed rooms,
wrong-room users, and non-members. Database failures remain explicit errors.

## Batch A2: Disabled Accounts

Create one account-room authorization helper that checks:

- a valid Supabase Auth user;
- `profiles.account_status = active`;
- an open room;
- matching durable room membership.

Adopt it across room loading, durable activity, provider routes, and other
account-authorized room operations. Replace A1's local active-profile check with
the shared helper so policy cannot drift. Keep this separate from A1 so the
lifecycle correction remains a narrow release.

## Batch B: Admission Grants And Core Revocation

Design a short-lived server-issued grant with:

- room ID;
- durable room-member ID;
- authorized role/capability revision;
- account or guest authorization kind;
- expiry;
- one-time nonce or equivalent replay resistance;
- intended Spacetime identity binding or one-time claim strategy.

Grant issuance must reject closed rooms, missing memberships, disabled
accounts, and revoked memberships. `join_room` must reject first-time admission
without a valid grant. Reconnect behavior must distinguish a temporary
connection recovery from a new admission.

Core revocation belongs here because grant issuance cannot be secure without
checking it. Management UX and extended abuse telemetry remain later work.

## Batch C: Authorized Room Reads

Use a staged migration:

1. Add required room and identity indexes.
2. Add public caller-filtered views over private room state.
3. Generate bindings and migrate clients to authorized views.
4. Prove current participants cannot read another room.
5. Remove public table visibility only after compatibility QA.

The publication plan must document Maincloud backup, generated-client
compatibility, active-room behavior, rollback, and whether a temporary
dual-read period is required.

## Batch D: Revocation Operations And Abuse Resistance

- Durable kick/revocation administration.
- Participant and active-queue ceilings.
- Chat and queue mutation limits.
- Metadata and identifier length limits.
- Historical-state retention bounds.
- Indexed room-specific reads instead of global iteration.
- Custom-client adversarial tests and abuse telemetry.

Extract authority helpers only where required for clarity and tests. Do not
perform broad unrelated reducer modularization.

## Batch E: Web Perimeter

- Replace process-local quota enforcement with a distributed implementation.
- Add provider/recommendation abuse telemetry and operational alerts.
- Introduce CSP in report-only mode.
- Validate Google OAuth, YouTube embeds, SpacetimeDB WebSockets, private media
  redirects, Vercel tooling, and app assets.
- Enforce CSP only after report-only evidence is clean.
- Add HSTS, content-type, referrer, frame, and permissions policies with route
  exceptions where required.

## Testing Strategy

- Pure policy and contract tests for grant validation and limits.
- Route-level tests for Supabase account and membership authorization.
- Reducer tests for admission, reconnect, replay, revocation, and mutation.
- Custom-client tests for invented members and cross-room reads.
- Browser tests for refresh, reconnect, two-participant sync, and private media.
- Production smoke tests after every independently deployed batch.

## Rollback Strategy

- A1/A2: revert the isolated application commit.
- B: preserve the previous join path behind a short-lived server-controlled
  rollback switch only if the approved threat model permits it.
- C: keep the previous client bindings and table publication artifact available
  until authorized-view QA passes.
- D/E: deploy limits and headers with observable soft/report-only states before
  enforcement where practical.
