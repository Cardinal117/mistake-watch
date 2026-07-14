# Brain Dump: Watch Media Hub Performance

## User Direction

Improve Watch Media Hub opening, rendering, and private-poster loading while
preserving TASK-009 security and every catalogue action.

Use progressive rendering because responsive grid/list cards have variable
height and interactive menus that make fixed-height virtualization risky.

## Targets

- Improve median hub opening time by at least 40% in a controlled benchmark.
- Initially mount no more than 24 grid cards or 12 list rows.
- Reduce initial poster requests by at least 75% for 250 catalogue items.
- Preserve owner, guest, folder, search, queue, playback, and management paths.

## Live Stress Room

The approved room contains 348 total queue items, with 347 upcoming at the
initial inspection. It may be used for non-destructive room-load, mode-switch,
hub-opening, and playback-continuity QA. Automated checks must not clear,
reorder, remove, or add queue items.

## Boundaries

No database migration, Supabase policy change, public API change, Media Hub
redesign, recommendation work, upload-processing change, or queue mutation.
