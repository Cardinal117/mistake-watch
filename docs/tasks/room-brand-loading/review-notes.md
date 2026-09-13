# Planning double-check

Reviewed 2026-09-13 against fe5e243 plus unrelated dirty recording-review files (excluded).

- Confirmed outgoing tabs own pendingMode while RoomExperience selects destination layout from an optimistic mode snapshot. Persistent ownership required.
- Confirmed beginRoomConnectionAttempt reports ready on socket connect; use-room-connection admission, subscription, clock and membership work follows. Separate presentation readiness required.
- Confirmed live update_room_mode may return without updating when authorization fails. A resolved call is not the completion gate.
- Confirmed setRoomModeAction updates durable room mode before live reducer; optimistic rollback cannot prove distributed rollback. Explicit partial-failure handling and scope boundary recorded.
- Confirmed observers have no initiator promise; remote mode transition path included.
- Checked initial SSR/route Suspense, portal theme inheritance, layout mounting deadlock, stale callbacks, duplicate players, fullscreen stacking and optional-resource readiness traps.
- Confirmed current artwork extraction/Watch adapter already supplies colors. Reuse instead of adding new provider calls or theme storage. Preset editor and compact buffering intentionally later.
- Prior prototype inspection verified index geometry (101 travel, 75600 coverage samples). This is historical prototype evidence, not implementation QA.
- Risk-based testing/spec-first skills used. No additional agent used for this planning pass; double-check was source-based review by the primary agent, not an independent review claim.

Implementation detail to prove early: expose confirmed-mode and current connection-epoch readiness without treating optimistic snapshots as observations. If existing client events cannot establish the defined readiness, stop that slice and amend the plan; do not weaken the completion gate to a timer.

Planning cannot guarantee one implementation pass. Release requires observed tests and visual acceptance regardless of the plan's completeness.

## Implementation review outcome

Implementation was approved after this planning record. Sol supplied independent lifecycle review and fixes; Luna supplied a bounded read-only entry-path audit after official capability research. See qa.md for the defects caught, test chronology, corrected reveal lint issue, and explicit local/live evidence boundary.
