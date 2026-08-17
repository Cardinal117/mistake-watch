# TASK-014B: Account-Aware Room Lifecycle

Status: Deployed - Owner QA pending
Documentation level: Compact task
Updated: 2026-08-17

## Objective

Make signed-in room creation, joining, saving, and account-room management
behave as durable account operations while preserving the guest-first flow for
signed-out visitors.

## Scope

- Attach newly created and invite-joined rooms to the current account when the
  caller is signed in.
- Prefer established account host authority over a retained guest cookie.
- Transfer a signed-in host's guest save attribution before saving.
- Add relationship-specific Account Rooms actions:
  - remove a saved-room attribution;
  - leave an account-linked joined room;
  - close an open owned room;
  - archive a closed owned room from account history.
- Refresh the account projection after each successful operation.
- Redirect away when the current room is closed or left.

## Exclusions

- No database migration or RLS change.
- No ownership transfer, permanent room deletion, or generic unlink action.
- No SpacetimeDB reducer, queue, playback, recommendation, or media change.
- No Account Command Panel redesign or dashboard information-architecture
  change.

## Decisions

- The existing guest-to-account migration remains the single attachment path.
- Signed-out create, join, and save behavior remains browser-scoped.
- Every management command re-derives the authenticated user and relationship
  server-side; the client cannot assert ownership or membership.
- Removing a save only clears account save attribution. It does not remove
  ownership or membership.
- Leaving removes the caller's non-owner membership, permissions, and stale
  migration marker so a future invite can establish a fresh membership.
- Closing preserves the owned room as history. Archiving hides a closed owned
  room without deleting its durable record.

## Risks

- **Authority confusion:** retained guest cookies must not override a valid
  account-owner relationship.
- **Cross-account mutation:** every command must compare the authenticated user
  against durable ownership, save attribution, or membership.
- **Current-room disruption:** closing or leaving the currently mounted room
  must navigate away immediately after success.
- **Accidental history loss:** archive is limited to already closed owned rooms;
  no row is permanently deleted.

## Acceptance Criteria

- A room created while signed in immediately appears as Owned across devices.
- A room joined by invite while signed in immediately appears as Joined across
  devices.
- Saving while signed in persists to the account even when a guest cookie is
  present.
- Signed-out users retain the existing guest-only create, join, and save flow.
- Account Rooms exposes only commands valid for each durable relationship.
- Unauthorized or stale commands fail without changing room data.
- Archived owned rooms no longer appear in Account Rooms.
- Account-room API responses remain private and contain no invite, participant,
  provider, queue, or source secrets.
- Existing attachment, dashboard, room, and media authorization behavior
  remains unchanged.

## Verification

- Focused policy, server-boundary, attachment, and projection tests.
- Full `npm test`, typecheck, ESLint, file-length policy, changed-file Prettier,
  production build, and `git diff --check`.
- Desktop and mobile Account Rooms browser QA.
- Production cross-browser owner QA only after separately approved release.

## Evidence

- Owner QA confirmed that a signed-in host could save a guest-backed room and
  see it in browser Quick Links while it remained absent from Account Rooms.
- Inspection confirmed create and join always entered through guest flows, and
  host authority preferred a valid guest cookie before account authority.
- Signed-in create, both invite-join paths, and save now reconcile through the
  existing guest-to-account migration before redirect or mutation.
- Cross-browser re-entry reuses the account membership and removes the
  redundant newly created guest membership.
- Account Rooms now offers explicit Unsave, Leave, Close, and Archive commands
  with server-derived authorization and inline confirmation.
- Focused lifecycle, attachment, and projection tests passed 16/16. The final
  full suite passed 341/341.
- Typecheck, ESLint, changed-file Prettier, file-length policy,
  `git diff --check`, and the production build passed.
- Local guest Account Rooms passed desktop and 390x844 browser checks with no
  console warnings or errors. Signed-in mutation and cross-device behavior
  remain production QA gates because local Google OAuth is unavailable.
- Commit `a0cf709` is on `origin/main` and deployed to Vercel production as
  `dpl_2kBX4Eg2iS7R6ve46RBhNfQVSjWd`.
- `watch.mistakestudios.com` and `mistake-watch.vercel.app` resolve to the
  deployment. Both `/api/health` and `/api/ready` returned `200`; readiness
  confirmed Supabase and SpacetimeDB ready.
