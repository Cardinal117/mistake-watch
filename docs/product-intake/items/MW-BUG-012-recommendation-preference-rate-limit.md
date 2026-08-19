---
id: MW-BUG-012
type: bug
status: in-progress
priority: P2
area: recommendations
related: [TASK-011, TASK-012]
created: 2026-08-18
updated: 2026-08-19
---

# Recommendation preference reconciliation reaches shared rate limit

> [!bug] In progress - P2

- **Expected:** A small number of normal signed-in devices or tabs should
  reconcile Like state and load Room Picks without exhausting the recommendation
  request budget.
- **Observed:** `/api/recommendations/preferences` eventually returns repeated
  `429 Too Many Requests` responses when the same account uses a room across
  multiple sessions.
- **Evidence:** The preference client reconciles approximately every ten
  seconds. A captured nine-request sample was sequential, with peak concurrency
  one, while separate console evidence showed repeated 429 responses. The
  current recommendation authorization layer shares a 30-request-per-minute
  account-and-room budget across recommendation routes and sessions.
- **Production correlation:** Vercel logs for 2026-08-18 17:24-17:31 SAST
  recorded 21 `GET /api/recommendations/preferences` responses with status 429
  on production deployment `dpl_Fqi6ndY3BzbC6gYJAW9EXkoLJQiw`. Requests
  continued after throttling instead of entering a bounded cooldown.
- **Unknowns:** Quantify combined traffic from preferences, ranking, focus,
  visibility, and multiple sessions before choosing separate limits, caching,
  or request coalescing. Preserve mutation abuse protection.
- **Related work:** TASK-011 preference reconciliation and TASK-012 Batch E
  distributed provider/recommendation limiting.
- **Confirmed implementation defect:** Incrementing the bounded cache rewrote
  its full TTL, so continuous requests could prevent the intended one-minute
  counter reset.
- **Local correction:** `TASK-016` now separates recommendation reads,
  preference reads, and preference writes; retains a fixed reset time; returns
  `Retry-After`; coalesces same-room browser reads; and applies a bounded `429`
  cooldown. Full local gates pass.
- **Next action:** Review and release `TASK-016` separately, then verify that
  two signed-in devices reconcile Likes without repeated `429` responses.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 6]]
