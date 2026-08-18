---
id: MW-BUG-012
type: bug
status: confirmed
priority: P2
area: recommendations
related: [TASK-011, TASK-012]
created: 2026-08-18
updated: 2026-08-18
---

# Recommendation preference reconciliation reaches shared rate limit

> [!bug] Confirmed - P2

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
- **Unknowns:** Quantify combined traffic from preferences, ranking, focus,
  visibility, and multiple sessions before choosing separate limits, caching,
  or request coalescing. Preserve mutation abuse protection.
- **Related work:** TASK-011 preference reconciliation and TASK-012 Batch E
  distributed provider/recommendation limiting.
- **Next action:** Promote to a compact task with explicit read, mutation, and
  multi-session budgets plus deterministic rate-limit and browser tests.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 6]]
