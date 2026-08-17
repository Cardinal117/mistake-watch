---
id: MW-BUG-007
type: bug
status: in-progress
priority: P1
area: account-rooms
related: [TASK-014B, MW-FEAT-003, MW-BUG-002]
created: 2026-08-17
updated: 2026-08-17
---

# Signed-in room remains browser-scoped until manually attached

> [!bug] In progress - P1

- **Observed:** A room created and saved while Google was signed in appeared in
  browser Quick Links but not in Account Rooms after reload.
- **Confirmed cause:** Create and invite-join actions always created a guest
  membership. Save authority preferred the retained guest cookie, so the save
  could remain attributed to `saved_by_guest_identity_id`.
- **Expected:** Signed-in create, join, and save operations establish durable
  account ownership, membership, and saved attribution automatically.
- **Implementation:** `TASK-014B` covers account-aware persistence and explicit
  Account Rooms lifecycle controls.
- **Local result:** Implementation and automated QA pass. Production owner QA
  must still verify signed-in create, invite join, save, and cross-device room
  discovery before resolution.

## Evidence

- Owner screenshots show the same saved room in Quick Links and absent from the
  authenticated Account Rooms projection.
- Source inspection confirmed the browser/account attribution split.
