---
id: MW-QOL-002
type: qol
status: in-progress
priority: P2
area: queue
created: 2026-08-17
updated: 2026-09-07
---

# Drag-and-drop queue reordering

## TASK-027 approved continuation - 2026-09-07

[TASK-027](../../tasks/TASK-027-room-flow-and-queue-response/proposal.md) now owns
the approved Listen compact gesture parity and follow-up Watch drop feedback,
concurrency, animation and virtualization work. Documentation prepared; new
implementation and acceptance pending. Preserve the TASK-026 evidence below;
do not mark the general request resolved until Listen parity passes its gates.

> [!qol] In progress - P2

- **Request:** Allow direct grab-and-drag ordering instead of repeated arrow clicks.
- **Constraints:** Preserve large-queue performance, keyboard ordering, permissions, and reducer authority.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 2]]

## TASK-026 accepted Watch portion - 2026-09-05

Watch now has compact drag ordering with edge scrolling and one canonical move on drop, keyboard/menu alternatives, Play next and swipe removal. Permission/reorder regressions and owner Huawei QA passed. Keep this item open for Listen queue parity; the original general queue request is not fully closed. See [[../../tasks/TASK-026-watch-room-redesign/bug-reconciliation|reconciliation]].
