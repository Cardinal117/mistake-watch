# First implementation: local QA candidate

Updated: 2026-09-07. Scope: 027.1 queue + 027.2 playlist repair.
High effort was approved for this implementation. No commit, push, production
publish, production credential copy or deployment was performed.

The subsequent 027.3 Watch slice is documented separately in [watch-local-qa.md](watch-local-qa.md).

## Open the candidate

- [Watch room](http://127.0.0.1:5383/dev/watch-design): open Queue and drag,
  use Play next, swipe twice or tap the revealed trash icon, and use the row menu.
- [Focused QA surfaces](http://127.0.0.1:5383/dev/queue-qa): Watch playlist,
  Listen playlist and a 1,000-item Listen queue. Moves deliberately acknowledge
  after 600 ms. The permission toggle is a local test control.

These routes render the real product components with deterministic fixture data;
they do not connect to production or play a real catalogue/YouTube source.
The additive server reducer was independently published and tested on disposable
local SpacetimeDB at `127.0.0.1:5384`, database `task027-queue-qa`.
The full authenticated room remains on its existing services when deployed later.
Both QA routes return not-found outside development with `WATCH_DESIGN_QA=1`.

## Changes and boundaries

- Watch and Listen upcoming queues share compact rows and a bounded virtual list.
  Normal rendering is capped at 30 rows plus at most one retained held/focused row.
  History keeps its existing behavior; Listen history rendering was extracted
  into a small component to keep the drawer below the repository file ceiling.
- Dropping immediately projects the intended order locally. Pending actions have
  separate IDs, an eight-second timeout and a 32-action bound. Failure/timeout
  removes only that action and exposes feedback; disconnect/permission loss
  cancels projections. There are no automatic retries or per-pointer reducers.
- The local projection affects presentation only. Playback and auto-advance still
  consume canonical room state. Missing/active/removed items are not resurrected.
- `move_queue_item_relative` resolves a source and destination identity against
  the current server list in a transaction. The last accepted transaction decides
  placement if several participants move the same item. Different items also
  resolve against the current list. Missing destination/source or lost permission
  rejects the action; there is no stale-array overwrite from the browser.
- Legacy numeric moves remain supported. Explicit pin/Play next flags are retained;
  manual order remains position-based. Existing add permission also grants queue
  management in this repository; that policy was characterized and preserved.
- Successful SDK reducer promises follow application of that transaction's table
  changes and callbacks. Optimistic settling therefore uses the actual reducer
  outcome, not analytics or an assumed network delay.
- Drag lift, insertion gap, neighbor movement and settling use transforms and local
  pointer state. Reduced motion removes motion while preserving visible feedback.
  Keyboard Home/End retain focus and scroll the moved row into view. Edge dragging
  works through recycled rows. Accessible position/size comes from the full list.
- Playlist review uses a flexible header/body/footer rather than a fixed number of
  grid tracks. Artwork has a real 44px column; themed native checkboxes remain
  keyboard-operable. Short/narrow screens scroll the outer workspace so all import
  controls can be reached. Selection, filters, sort and import callbacks are retained.

Later Watch browse-first/header work and the Listen compact-bar/swipe-up experience
are still pending in 027.3/027.4. This slice does not change those layouts.

## Evidence

| Check | Result |
| --- | --- |
| Existing queue/Spacetime characterization | 151 baseline tests passed |
| Focused first red tests | Delayed drop stayed at old index; 1,000 Watch rows mounted; playlist image/title bounds overlapped; footer exceeded its panel |
| Reducer red tests | Numeric-only baseline failed relative/concurrency/rejection contracts; new actual reducer passed all five cases |
| Keyboard red test | Moving to End lost focus when its row left the render window; now passes |
| Full Node regression | 608 passed in the final full run. The first run lacked the Worker runtime dependency; matching existing Worker lockfile/dependencies were linked locally, then the full suite passed |
| Watch + queue + playlist browser regression | 79 passed, including 320px, phone landscape, fullscreen, header, dock continuity, delayed YouTube fixtures and failure recovery |
| Additional Listen queue tests | 2 passed: filtered moves/permission/Escape focus and last-row menu reachability |
| Performance browser test | Passed 24 samples across 50/250/1,000 items, normal and 4x CPU throttling, with 600 ms delayed acknowledgements |
| Local live reducer | 40 repeated four-client runs passed: concurrent same/different item moves, contiguous unique positions, pin retention, denial, absent anchors/source, legacy numeric moves. Final 30 also reject forged actors and active-item moves |
| Type checks | Application and explicit Spacetime module checks passed |
| Production build | Webpack build passed with two workers; local QA routes prerender as not-found |
| Lint | No errors; one pre-existing room-experience navigation warning |
| File policy | Zero violations; existing threshold warnings remain |
| Browser visual inspection | Watch queue and Watch/Listen playlist/queue inspected in portrait and short landscape using the app browser |

Some later safety tests were added after the initial implementation; they are
regression evidence, not retroactively claimed test-first failures. Three source
shape assertions were updated for extracted components and the flexible playlist
layout; corresponding browser behavior and bounds are tested directly.

### Measured response

[Raw browser samples](qa/queue-response-samples.json) and
[local server runs](qa/local-reducer-runs.json) retain the measurements.
At 390x844, 14 rows were mounted at every tested queue size. Normal local drop
updates took 9.8-34.8 ms. At 4x CPU throttling they took 225.7-341.1 ms. The latter
is below the simulated 600 ms confirmation delay but does not meet a 100 ms goal;
it is a development-build CPU simulation, not physical-phone evidence.
The original unmodified queue failed to update within 150 ms with delayed
confirmation and mounted all 1,000 rows. A full before-change distribution at
all sizes/CPU settings was not captured; do not invent one from these results.

Local concurrent-round confirmations were in the tens of milliseconds. These are
loopback measurements with small server queues, not internet latency guarantees
or server benchmarks for 1,000 items. Pointer feedback remains independent of them.

## Remaining acceptance / observations

- One early four-client run timed out waiting for convergence. It was not
  reproduced in the next 40 repeated runs; no root cause was established. Keep
  this diagnostic open for the next authenticated two-device/preview QA round.
  Passing repeats do not erase the initial observation.
- Physical Huawei touch/scroll/motion acceptance, long real-provider playback,
  internet reconnect/concurrent editing and production performance were not run
  in this local-only slice. Existing playback fixture tests passed.
- Under strong CPU throttling the measured development UI still has room to
  improve. Do not claim all animation frames are below 50 ms or device parity.
- A future release must publish the additive Spacetime reducer before serving
  the frontend that calls it. Legacy clients remain supported; no schema change.
- No product intake entry is closed solely by this local candidate. MW-QOL-002
  should be checked during device/live-room acceptance; later mode-flow items
  remain open and tracked in this packet.

## Reproduce locally (PowerShell)

Run from the isolated `codex/task-027-room-flow` worktree. Dependencies are local
junctions to the accepted TASK-026 installation; the Worker lockfiles match.
No production environment file is needed for these fixtures.

```powershell
$env:WATCH_DESIGN_QA='1'
node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 5383
# In another terminal:
$env:WATCH_DESIGN_QA='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5383'
node node_modules/@playwright/test/cli.js test 'tests/e2e/watch-.*.spec.ts' tests/e2e/queue-response.spec.ts tests/e2e/playlist-layout.spec.ts --workers=1
node node_modules/@playwright/test/cli.js test tests/e2e/queue-performance.spec.ts --workers=1
node --test tests/*/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit -p spacetime/tsconfig.json
node node_modules/eslint/bin/eslint.js .
node scripts/check-file-lengths.mjs
$env:CIRCLE_NODE_TOTAL='3'
node node_modules/next/dist/bin/next build --webpack
```

Local server test (separate terminal; only this local database):

```powershell
$queueCli='C:/Users/Admin/AppData/Local/SpacetimeDB/spacetime.exe'
& $queueCli start --listen-addr 127.0.0.1:5384 --data-dir .tmp/spacetime-task027 --in-memory --non-interactive
# In another terminal:
& $queueCli publish --server http://127.0.0.1:5384 --module-path ./spacetime task027-queue-qa --yes
node scripts/verify-relative-queue-local.mjs
```
