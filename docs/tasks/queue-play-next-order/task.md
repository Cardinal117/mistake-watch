# Explicit Play next ordering

Approved owner bug fix, 2026-09-12. The shared server insertion calculation puts
new Next requests after all pinned/next flags. Queue controls also toggle an
existing Next flag off. This disagrees with the owner's expectation that Next
moves the chosen song to the first upcoming position.

Contract: latest explicit Next wins, before pinned/previous Next items. Preserve
the currently playing occurrence, all other relative order, pin flags, duplicates,
permissions and unavailable-item safeguards. A queued Next action moves that
occurrence; Regulars/search Add next creates a new occurrence. Clear previous
Next markers when accepting a new Next request. Next is a command, not a toggle.
Explicit subsequent drag, shuffle or pinned-first actions remain authoritative.

Scope: server queue insertion and priority helper, equivalent local calculation,
Watch/Listen queue command adapters and labels, related stale explanatory copy.
No schema or bindings change. Compact correction to existing queue authority.

QA: update ordering tests and observe failure before code; add reducer-level
tests for repeated Next, old flags/pins, existing vs new occurrence, isolation and
permission denial. Run queue/server tests, typecheck/build and focused browser QA.
Keep unrelated recording-review work excluded. Record deployment separately.

## QA and review

- Baseline 385df01. Updated local/server ordering tests failed with position 2
  instead of 0 before production edits. Executed reducer tests then reproduced
  both existing-item and new-item insertion behind old flags/pins (after fixing
  an initial fixture missing normalizeQueuedPositions). Both cases now pass.
- 213 queue/server tests pass. Reducer coverage verifies repeated selection,
  fresh Add next, retry deduplication, unchanged playing item/pins/other rooms,
  clearing older flags and no mutation without authority.
- Six browser tests pass: existing marked Next in Watch and Listen at widths
  1440/390 emits true on every click; Regulars repeat/recovery still passes.
  Browser command regression coverage is post-hoc; core ordering is test-first.
- Application and module TypeScript pass, scoped ESLint passes. Spacetime build
  passes; its tsc-discovery warning is covered by explicit module TypeScript.
- Entry-point audit: Regulars/recommendations/search/history/library Add next all
  use add_queue_item; queued selections and mobile actions use the priority
  reducer. Both share corrected insertion. Queued buttons no longer toggle off.
  Play now remains separate and unavailable-item/authority guards are unchanged.
- Prior Next markers clear only during a new authorized Next insertion. Existing
  rows are not reordered merely by deployment. No schema or data migration.
- Design hook font-size reports point to pre-existing unchanged compact metadata
  styles. This correction changes commands/accessibility labels only; typography
  and suppressions are deliberately untouched.
- Live music/multi-device listening was not simulated in the owner's room.
