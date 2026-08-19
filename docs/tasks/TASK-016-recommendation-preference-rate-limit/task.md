---
id: TASK-016
status: completed
type: compact-task
related: [TASK-011, MW-BUG-012]
completed: 2026-08-19
---

# Recommendation Preference Rate-Limit Resilience

## Objective

Keep cross-device Like reconciliation responsive without allowing normal
preference reads to exhaust recommendation or preference-mutation protection.

## Scope

- Separate recommendation reads, preference reads, and preference writes into
  bounded per-member request budgets.
- Use a fixed reset window; successful requests must not extend the window.
- Return a standards-compatible `Retry-After` value for rejected requests.
- Coalesce overlapping preference reads within one browser context.
- Enter a bounded cooldown after `429` and resume automatically.
- Preserve optimistic Like mutations, stale-response rejection, focus refresh,
  visibility refresh, and ten-second cross-device reconciliation.

## Exclusions

- No database migration or Supabase policy change.
- No distributed production rate limiter; that remains TASK-012 Batch E.
- No recommendation ranking, Like semantics, or UI redesign.
- No Git, deployment, or production mutation in this implementation pass.

## Decisions

- Keep the existing in-process bounded cache, but store an explicit reset time
  and retain its original expiry when incrementing a counter.
- Give preference reads their own budget so Room Picks traffic cannot consume
  the Like reconciliation allowance.
- Keep preference writes in a stricter independent budget.
- Treat `Retry-After` as authoritative; apply a bounded fallback cooldown only
  when the response omits or invalidates it.
- Allow different-room requests to proceed while coalescing only duplicate
  in-flight reads for the same room.

## Implementation Order

1. Add deterministic request-budget helpers and tests.
2. Route each recommendation operation through its explicit budget.
3. Return `Retry-After` from recommendation endpoints on `429`.
4. Add a typed preference-read error and client cooldown calculation.
5. Coalesce same-room reads and verify room changes, stale responses, focus,
   visibility, and optimistic mutations.
6. Run recommendation tests, full tests, typecheck, lint, build, formatting,
   and file-length checks.

## Risks

- A per-instance cache does not coordinate across Vercel instances.
- Overlong cooldowns could delay cross-device Like visibility.
- Clearing cooldown on every focus event would recreate the request storm.
- Sharing read and write budgets would let background polling block Like
  mutations.

## Acceptance Criteria

- A request counter resets after one minute even when requests continue.
- Preference reads do not consume recommendation-read or mutation budgets.
- Preference writes remain abuse-limited independently.
- `429` responses include a positive `Retry-After` header.
- Concurrent same-room refresh triggers produce one network request.
- Repeated `429` responses do not produce repeated requests during cooldown.
- Polling resumes after cooldown and still reconciles cross-device Likes.
- Existing optimistic Like, ranking refresh, guest behavior, and private
  response contracts remain unchanged.

## Evidence

- Production logs recorded 21 preference `429` responses during the supplied
  seven-minute QA window.
- Captured client requests were sequential rather than network-concurrent.
- Source inspection confirmed one shared 30-request budget and a TTL that was
  extended on every increment.
- Local implementation uses independent 60/min preference-read, 20/min
  preference-write, and 30/min recommendation-read budgets.
- Fixed-window, retry timing, and cooldown tests pass; the complete project
  suite passes 373 tests.
- Typecheck, ESLint, production build, and file-length policy pass.
- Playwright public E2E smoke tests pass 2/2; the deterministic Media Hub test
  remains skipped behind its fixture gate.
- Commit `6987738` is on `main`; clean-install metadata is recorded in
  `fe9788b`.
- Vercel production deployment `dpl_7Z8GWwA5XunM3rBcVfPAZejXyahn` passed health,
  readiness, and fail-closed route checks with no error-level or `500` logs.
- Owner two-machine production QA passed: Like behavior remained correct, both
  signed-in room contexts operated normally, and the console remained clean.
