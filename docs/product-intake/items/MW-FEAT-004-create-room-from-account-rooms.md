---
id: MW-FEAT-004
type: feature
status: ready-for-planning
priority: P2
area: account-rooms
related: [TASK-014C, MW-FEAT-003]
created: 2026-08-18
updated: 2026-08-18
---

# Create a room from Account Rooms

> [!feature] Ready for planning - P2

- **Request:** Add a compact create-room entry point to the Account Rooms
  header, with a focused form and distinct Create Room and Create and Join
  commands.
- **Expected:** Users should be able to create an account-linked room without
  leaving the room-management context, while the two completion paths remain
  visually and semantically distinct.
- **Unknowns:** Decide whether creation is an inline disclosure or modal, which
  existing dashboard fields are reused, and whether Create Room returns to the
  list while Create and Join navigates immediately.
- **Related work:** TASK-014C Account Rooms interface and
  [[MW-FEAT-003-account-rooms-surface]].
- **Next action:** Plan as a compact task after TASK-014C closes, reusing the
  existing account-aware create action rather than adding a second backend
  contract.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 5]]
