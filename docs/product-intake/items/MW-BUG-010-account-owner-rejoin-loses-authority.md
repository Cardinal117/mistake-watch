---
id: MW-BUG-010
type: bug
status: needs-reproduction
priority: P1
area: room-authority
related: [TASK-012, TASK-014B, MW-BUG-007, MW-BUG-011]
created: 2026-08-18
updated: 2026-08-18
---

# Account owner can lose host authority after rejoining

> [!bug] Needs reproduction - P1

- **Expected:** A signed-in account that durably owns a room should regain the
  correct live host/controller authority after leaving and rejoining, regardless
  of the browser display name entered for the new room session.
- **Observed:** Rejoining an account-owned room with another display name can
  produce a participant without host privileges, leaving the durable owner
  unable to control the room.
- **Evidence:** Owner production report after account-based room ownership and
  Account Rooms lifecycle work shipped.
- **Unknowns:** Determine whether the join path binds only the guest identity,
  whether the account membership reaches SpacetimeDB admission, and whether
  host/controller authority is restored independently from display-name state.
- **Related work:** TASK-012 live-room trust boundary, TASK-014B account-aware
  room lifecycle, and [[MW-BUG-007-signed-in-room-remains-browser-scoped]].
- **Next action:** Reproduce with one owned room across clean browser sessions,
  same and changed display names, invite and Account Rooms entry paths, then
  compare durable ownership, membership, live participant identity, and
  effective permissions. Treat any fix as an authority-sensitive task.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 4]]
