---
id: MW-OPS-001
type: operations
status: in-progress
priority: P1
area: media-processing
created: 2026-08-17
updated: 2026-08-31
---

# Restore controlled conversion and add local media preparation

> [!ops] In progress - P1

- **Request:** Restore CloudConvert only after review and provide local drag-and-drop media preparation.
- **Safety constraint:** Preserve idempotency safeguards and never reintroduce automatic conversion loops.
- **Verified restoration:** On 2026-08-31 the owner reattached the CloudConvert
  API token in Vercel, redeployed production, and confirmed a live conversion
  completed with the expected conversion and converting labels throughout the
  processing state.
- **Remaining scope:** The provider credential and live status presentation are
  restored. The separate local drag-and-drop preparation tool remains planned;
  characterize its required browser-safe output before implementation.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 12]]
