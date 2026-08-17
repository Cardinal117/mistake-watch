# TASK-014: Account Rooms Projection

Status: Deployed - Owner QA pending
Documentation level: Compact task
Updated: 2026-08-17

## Objective

Replace the Account Rooms placeholder with durable signed-in room data and fix
the dashboard path that loses attached rooms when guest cookies are absent.

## Scope

- Add one account-scoped room projection for owned, saved, and joined rooms.
- Deduplicate rooms that match more than one account relationship.
- Use the projection in the dashboard alongside active guest-cookie rooms.
- Load the Account Rooms tab only when a signed-in user opens it.
- Show room relationship, mode, state, last activity, and a re-entry action.
- Preserve guest-only dashboard and account-panel behavior.
- Link delivery evidence to `MW-FEAT-003` and `MW-BUG-002`.

## Exclusions

- No database migration or RLS change.
- No room deletion, leave-room, ownership transfer, or saved-state mutation.
- No personalization, first-party history, social, recommendation, or AI work.
- No Google or provider scope changes.
- No broad Account Command Panel or dashboard redesign.

## Decisions

- Account room discovery is authenticated on the server and never accepts a
  caller-supplied account ID.
- The API returns room-list metadata only. It excludes invite tokens, source
  URLs, queue data, participant identity, and provider data.
- Relationship precedence is `owned`, then `saved`, then `joined` when one room
  matches multiple account paths.
- Closed rooms remain visible in Account Rooms as history context but are not
  treated as the current dashboard room.
- The existing 806-line Account Command Panel stays at or below its legacy
  ceiling by extracting the new surface into a focused component.

## Implementation

1. Add pure projection helpers and deterministic coverage for classification,
   deduplication, ordering, and safe response shape.
2. Query account-owned, account-saved, and account-member room IDs through the
   server-side Supabase client.
3. Merge open account rooms with guest-cookie rooms for dashboard re-entry.
4. Add an authenticated private API and a lazy Account Rooms client surface.
5. Run project gates and update linked intake records with measured evidence.

## Risks

- **Cross-account leakage:** derive the account ID from the authenticated server
  session and test that unrelated rows are excluded.
- **Duplicate rooms:** collapse ownership, saved attribution, and membership by
  room ID with deterministic relationship precedence.
- **Dashboard regression:** preserve richer guest-session snapshots when the
  same room is present in both projections.
- **Stale panel requests:** abort the request when the Rooms tab unmounts.

## Acceptance Criteria

- A signed-in account sees its owned, saved, and joined rooms without relying on
  guest cookies.
- An attached room remains on the dashboard after guest-cookie loss and account
  sign-in.
- A guest receives no account-room data and retains the existing local wording.
- One room appears once even if it is owned, saved, and joined by the account.
- Account-room responses contain no invite secret, source URL, queue item,
  participant identity, email, or provider metadata.
- Loading, empty, error, open, and closed states are usable with keyboard and
  mobile layouts.
- Existing room playback, queue, attachment, and uploaded-media authorization
  behavior remains unchanged.

## Verification Plan

- Targeted account-room projection and route boundary tests.
- Existing account attachment and room suites.
- `npm test`, typecheck, ESLint, file-length policy, changed-file Prettier,
  production build, and `git diff --check`.
- Manual signed-in and guest QA after an explicitly approved deployment.

## Verification Evidence

- Confirmed `MW-BUG-002` in the previous dashboard implementation:
  `getDashboardData()` discovered rooms only from `mw_guest_*` cookies and did
  not project authenticated account ownership, saved attribution, or
  membership.
- Production read-only schema evidence found 5 account-owned rooms, 3
  account-saved rooms, and 8 open rooms. Existing indexes cover
  `rooms.owner_user_id`, `rooms.saved_by_user_id`, and
  `room_members.user_id`; no migration is required.
- Pure projection tests cover account filtering, relationship precedence,
  deduplication, stable activity ordering, safe response fields, private route
  identity, and dashboard integration.
- `npm test`: 334 passed, 0 failed.
- Typecheck, ESLint, changed-file Prettier, production build,
  `git diff --check`, and file-length policy passed.
- The Account Command Panel fell from its 806-line legacy ceiling to 567 lines;
  extracted CloudConvert diagnostics are 256 lines and Account Rooms is 245.
- Local browser QA passed for the guest Rooms state at desktop and 390x844.
  The unauthenticated API returned `401`, `private, no-store`, and no account
  room data.
- Signed-in account projection, cross-browser persistence, and dashboard
  re-entry remain explicit production QA gates before resolution.
- Commit `d415362` is on `origin/main` and deployed to Vercel production as
  `dpl_C2A6j4qFrEkoa82hocq7wiyCLXJX`.
- Production `/api/health` and `/api/ready` returned `200`. Unauthenticated
  `/api/account/rooms` returned `401` with `private, no-store` and
  `Vary: Cookie`.
