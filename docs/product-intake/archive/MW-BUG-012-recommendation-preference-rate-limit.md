---
id: MW-BUG-012
type: bug
status: resolved
priority: P2
area: recommendations
related: [TASK-011, TASK-012, TASK-016]
created: 2026-08-18
updated: 2026-08-19
resolved: 2026-08-19
---

# Recommendation preference reconciliation reaches shared rate limit

> [!success] Resolved - P2

- **Expected:** Normal signed-in devices reconcile Like state without exhausting
  recommendation request protection.
- **Observed:** Repeated preference polling eventually produced sustained `429`
  responses across multiple account sessions.
- **Root cause:** Recommendation reads, preference reads, and preference writes
  shared one budget. Updating the cache entry also extended its full TTL on every
  request, creating a sliding lockout under continuous polling.
- **Resolution:** The operations now use independent fixed-window budgets.
  Preference reads are coalesced per room, `429` responses include
  `Retry-After`, and the client observes a bounded cooldown before reconciling
  again.

## Evidence

- Commit `6987738` is on `main`; clean-install metadata is recorded in
  `fe9788b`.
- Fixed-window, independent-budget, retry timing, coalescing, and cooldown tests
  passed as part of the 373-test local suite.
- TypeScript, ESLint, production build, file-length policy, and public
  Playwright smoke checks passed.
- Vercel production deployment `dpl_7Z8GWwA5XunM3rBcVfPAZejXyahn` returned
  healthy and ready responses with no error-level or `500` logs during release
  verification.
- Owner production QA passed on two machines: Like behavior remained correct,
  both room contexts worked normally, and the console remained clean.

## Original Report

[[quick-capture-2026-08-18#Capture 6]]
