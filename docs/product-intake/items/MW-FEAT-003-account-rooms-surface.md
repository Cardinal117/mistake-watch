---
id: MW-FEAT-003
type: feature
status: in-progress
priority: P1
area: account-rooms
related: [TASK-002.10, TASK-014B, MW-BUG-002, MW-BUG-007]
created: 2026-08-17
updated: 2026-08-17
---

# Account Rooms management surface

> [!feature] In progress - P1

- **Request:** Replace the placeholder with saved, recent, owned, and migrated rooms from durable account data.
- **Implementation:** `TASK-014` adds an authenticated owned, saved, and joined
  room projection, dashboard reconciliation, and a lazy Account Rooms surface.
- **Evidence:** Automated, production-build, guest authorization, desktop, and
  mobile local gates passed on 2026-08-17.
- **Release:** Commit `d415362` is deployed to production; health, readiness,
  and the unauthenticated API boundary passed.
- **Owner QA:** The durable projection works for attached rooms, but a room
  created and saved while signed in can remain browser-scoped.
- **Next action:** Complete `TASK-014B` account-aware persistence and explicit
  room lifecycle controls before marking this surface resolved.
- **TASK-014B result:** Account-aware create/join/save and relationship-specific
  Unsave, Leave, Close, and Archive controls are implemented and locally gated.
  Production owner QA remains required.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 6]]
