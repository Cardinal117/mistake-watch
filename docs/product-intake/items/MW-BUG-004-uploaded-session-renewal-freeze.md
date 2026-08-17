---
id: MW-BUG-004
type: bug
status: needs-reproduction
priority: P1
area: uploaded-playback
related: [TASK-009]
created: 2026-08-17
updated: 2026-08-17
---

# Uploaded playback can freeze after signed URL renewal

> [!bug] Needs reproduction - P1

- **Observed:** After roughly 30 minutes, an older client can freeze while room progress continues.
- **Security constraint:** Do not lengthen signatures or expose permanent R2 URLs.
- **Next action:** Trace room-session renewal and player source replacement with accelerated expiry.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 10]]
