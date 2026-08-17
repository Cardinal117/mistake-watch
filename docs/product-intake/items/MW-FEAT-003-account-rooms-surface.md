---
id: MW-FEAT-003
type: feature
status: in-progress
priority: P1
area: account-rooms
related: [TASK-002.10, TASK-014B, TASK-014C, MW-BUG-002, MW-BUG-007]
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
- **TASK-014B release:** Commit `a0cf709` is deployed to production as
  `dpl_2kBX4Eg2iS7R6ve46RBhNfQVSjWd`; both public aliases passed health and
  readiness checks.
- **TASK-014B owner QA:** Account-aware room state and lifecycle actions persist
  across devices, but a device with the Rooms tab already open requires reload
  or tab remount to observe remote Unsave, Close, and Archive changes.
- **TASK-014C Batch A:** Bounded four-second visible-tab refresh, activity
  refresh, request serialization, stale-response protection, and retained-data
  error handling are implemented and pass local automated gates. Signed-in
  production owner QA remains required before Batch B.
- **TASK-014C Batch B:** The Rooms header is consolidated and the account-room
  list now supports local name search, relationship filters, deterministic
  sorting, result counts, and Open/Closed disclosure groups. Automated and
  guest desktop/mobile browser gates pass; signed-in production QA remains.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 6]]
