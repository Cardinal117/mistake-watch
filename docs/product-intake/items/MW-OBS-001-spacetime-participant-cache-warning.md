---
id: MW-OBS-001
type: observation
status: needs-reproduction
priority: P3
area: live-room-sync
related: [TASK-009, TASK-012]
created: 2026-08-18
updated: 2026-08-18
---

# SpacetimeDB warns about a participant row missing from the cache

> [!observation] Needs reproduction - P3

- **Observed:** After guest admission to an account-owned room, the client
  logged `Updating a row that was not present in the cache. Table:
room_participant`.
- **Current impact:** No participant, playback, queue, or Account Rooms failure
  was observed alongside the warning.
- **Evidence:** The warning has appeared in more than one production console
  capture and was previously noted during TASK-009 review, but no deterministic
  reproduction or state mismatch is established.
- **Unknowns:** Determine whether this is benign SDK subscription ordering, a
  reconnect race, account/guest identity transition behavior, or a missed live
  participant update.
- **Related work:** TASK-009 project-integrity review and TASK-012 live-room
  trust boundary.
- **Next action:** Add targeted logging or a controlled join/reconnect matrix.
  Promote to a bug only if the warning reproduces reliably or correlates with
  stale/missing participant state.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 7]]
