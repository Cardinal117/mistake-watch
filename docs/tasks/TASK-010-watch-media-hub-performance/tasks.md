# Tasks: Watch Media Hub Performance

## Batch A: Baseline and Packet

- [x] Create the TASK-010 packet and review surface.
- [x] Record deterministic 0/24/25/250/1000 catalogue baselines.
- [x] Record non-destructive 348-item live-room evidence.

Review checkpoint: baseline facts are measured, not invented.

## Batch B: Progressive Catalogue Rendering

- [x] Add a pure catalogue-window helper and focused tests.
- [x] Add the grid/list progressive rendering hook and sentinel.
- [x] Reset safely across search, folder, sort, and view changes.
- [x] Report rendered and total matching results.

Review checkpoint: initial mount caps and item identity tests pass.

## Batch C: Lazy Private Posters

- [x] Add scroll-root-aware near-viewport poster loading.
- [x] Keep first-row posters eager and later posters low priority.
- [x] Preserve placeholders, signed-route privacy, and stale cleanup.

Review checkpoint: initial poster request budget and TASK-009 security pass.

## Batch D: Integration and QA

- [x] Run deterministic tests and complete repository gates.
- [x] Run the post-deployment 348-item live-room browser check and record user
      acceptance.
- [x] Run deterministic desktop and mobile browser checks.
- [x] Compare five-run baseline and final measurements.
- [x] Complete independent agent review and corrective re-review.
- [x] Update implementation and QA evidence.

Review checkpoint: no release until the 40% target and all must-not-break paths
are satisfied.
