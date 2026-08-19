---
id: MW-BUG-011
type: bug
status: needs-verification
priority: P2
area: recommendations
related: [TASK-011, MW-BUG-010]
created: 2026-08-18
updated: 2026-08-18
---

# Room Picks actions may reject permitted members with the wrong toast

> [!bug] Needs verification - P2

- **Expected:** Add to Queue and Play Next should follow the existing room queue
  permission policy. A denied action should explain the real permission or
  duplicate condition.
- **Observed:** A rejoined signed-in room owner could not use Room Picks queue
  actions and received `Queue item ignored because the same active source is
already in the live queue`. The owner also suspects Play Next works only for
  the host rather than other permitted users.
- **Evidence:** Owner production observation during the account-owner rejoin
  authority failure.
- **Unknowns:** The original authority failure is now resolved and archived as
  [[../archive/MW-BUG-010-account-owner-rejoin-loses-authority|MW-BUG-010]]. The
  remaining behavior may be an independent permission mapping defect, a true
  duplicate, or incorrect error translation.
- **Related work:** TASK-011 Room Picks integration and existing room queue
  authority.
- **Next action:** Verify owner, host, permitted member, unpermitted member, and
  true-duplicate cases. Keep permission enforcement and error-message mapping
  as separate assertions.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 4]]
