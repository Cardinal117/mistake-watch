---
id: MW-BUG-005
type: bug
status: resolved
priority: P1
area: recommendations
related: [TASK-011]
created: 2026-08-17
updated: 2026-08-17
resolved: 2026-08-17
---

# Like state remains stale on another active device

> [!success] Resolved - P1

- **Expected:** A Like made on one active device appears on another active
  device using the same account.
- **Observed:** Before the fix, the second device remained stale until refresh.
- **Resolution:** Visible clients reconcile the existing private preference
  endpoint every ten seconds and on focus, visibility return, or network
  reconnect. Stale responses cannot override newer room or mutation state.

## Evidence

- Production Supabase contains four durable liked preference rows for one
  account.
- Local verification passed 329 tests, TypeScript, ESLint, Prettier,
  file-length policy, diff checks, and a production build.
- Commit `444b78f` is on `main` and deployed to Vercel production as
  `dpl_3Z6mYK4tyqLtowcppLK6e2tSSz8t`.
- Both production aliases returned healthy and ready responses after release.
- Owner two-device QA passed: the second signed-in device displayed the Like
  without refresh exactly four seconds after the first device changed it.

## Original Report

![[legacy-notes-2026-08-17#Item 13]]
