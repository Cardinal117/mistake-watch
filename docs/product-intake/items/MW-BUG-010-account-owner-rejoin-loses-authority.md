---
id: MW-BUG-010
type: bug
status: needs-reproduction
priority: P1
area: room-authority
related: [TASK-012, TASK-014B, TASK-014C, MW-BUG-007, MW-BUG-011]
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
  Account Rooms lifecycle work shipped. A later production report adds that
  opening a room through Account Rooms can reach the room but reject a playback
  action.
- **Reported error:** `Playback control denied because the caller is not an active room participant`.
- **Inference, not yet confirmed:** Same-Google-account multi-device handling may
  contribute to the mismatch, but the report does not yet establish whether
  durable ownership, live admission, participant subscription timing, or the
  selected controller identity is the failing boundary.
- **Unknowns:** Determine whether the join path binds only the guest identity,
  whether the account membership reaches SpacetimeDB admission, and whether
  host/controller authority is restored independently from display-name state.
  Confirm whether Account Rooms navigation can reuse a room URL without first
  establishing the current browser as an active live participant.
- **Related work:** TASK-012 live-room trust boundary, TASK-014B account-aware
  room lifecycle, TASK-014C Account Rooms interaction work, and
  [[MW-BUG-007-signed-in-room-remains-browser-scoped]].
- **Next action:** Reproduce with one owned room across clean browser sessions,
  same and changed display names, invite and Account Rooms entry paths, and one
  or two devices signed into the same Google account. Before invoking playback,
  compare durable ownership and membership with the current live participant,
  controller, connection, and effective permissions. Treat any fix as an
  authority-sensitive task.
- **Original reports:**
  [[../archive/quick-capture-2026-08-18#Capture 4]] and
  [[../archive/quick-capture-2026-08-18#Capture 11]].
