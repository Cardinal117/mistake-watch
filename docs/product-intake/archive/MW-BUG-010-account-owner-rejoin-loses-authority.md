---
id: MW-BUG-010
type: bug
status: resolved
priority: P1
area: room-authority
related: [TASK-012, TASK-014B, TASK-014C, MW-BUG-007, MW-BUG-011]
created: 2026-08-18
updated: 2026-08-19
resolved: 2026-08-19
---

# Account owner can lose host authority after rejoining

> [!success] Resolved - P1

- **Expected:** A signed-in account that durably owns a room regains live host
  authority after re-entry, including from another browser using the same
  account.
- **Observed:** The second browser could display enabled controls while playback
  rejected it as not being an active room participant.
- **Root cause:** Two browser contexts resolved the same durable member ID but
  used different Spacetime identities. The former participant key admitted only
  one identity and could remain occupied after disconnect.
- **Resolution:** Server-issued, identity-bound, one-time admission grants now
  create private per-browser sessions while retaining one aggregate participant.
  Controls remain unavailable until the current browser's opaque presence
  receipt is online.

## Evidence

- Commit `7cd92a9` is on `main`.
- Maincloud readback confirmed private admission/session tables, an opaque public
  presence table, and token-bound admission/join reducers.
- Local runtime proof covered concurrent same-account sessions, surviving
  authority after one disconnect, consumed-grant replay rejection, and invented
  member rejection.
- Full local suite passed 373 tests plus TypeScript, ESLint, production build,
  file-length policy, and public Playwright smoke checks.
- Vercel production deployment `dpl_7Z8GWwA5XunM3rBcVfPAZejXyahn` passed health,
  readiness, and unauthenticated fail-closed checks.
- Owner production QA passed on two machines: both received `200`, both could
  control the room, Account Rooms re-entry retained authority, the console was
  clean, and a guest received neither host controls nor uploaded-catalogue
  access.

## Original Reports

[[quick-capture-2026-08-18#Capture 4]] and
[[quick-capture-2026-08-18#Capture 11]]
