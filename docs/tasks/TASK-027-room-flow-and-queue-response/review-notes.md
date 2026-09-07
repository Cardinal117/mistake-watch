# Review notes and evidence

## 2026-09-07: Documentation checkpoint

Owner approved the discussed direction and local implementation after docs,
adding swipe-up expansion of the compact Listen browsing bar. Medium reasoning
selected by the owner. Full packet chosen for shared queue concurrency and
cross-mode responsive/player-state breadth, not to introduce an approval loop.

Branch: `codex/task-027-room-flow`.
Worktree: `C:/Users/Admin/dev/Personal/watch-together-platform/.worktrees/task-027-room-flow`.
Base: `c0b8247c33949f64ed07b0d8219dada90659592d`.
`git fetch origin main` completed; origin/main and base matched on this date.
No application implementation, backend publish, production QA, commit or push
has occurred for TASK-027. TASK-026's accepted deployment is historical baseline;
production state has not been independently reverified during this docs pass.

## Verified source observations

- `components/room/queue/use-queue-gestures.ts`: dispatches move on drop, then
  clears pointer-local translation; no retained optimistic order there.
- `components/room/queue/queue-content.tsx`: maps the full upcoming list.
- `components/room/listen/queue/queue-drawer.tsx`: uses a virtual window from
  `lib/queue/virtualization.ts`. Do not claim Watch already has this behaviour.
- `spacetime/src/index.ts`, move_queue_item: numeric destination, permission
  check and current-server-list splice/reindex; no expected revision argument.
- `components/room/watch/watch-room-header.tsx`: participant group precedes
  desktop mode/tools; account control renders current room member avatar. The
  account prop is in the type but not used to resolve a profile photo here.
- Watch Add uses shared `add-media/preview-cards.tsx`; Listen also has a separate
  `playlist-review-overlay.tsx`. Fix the actual reported path and test both.

The owner's 400–600 ms delay and screenshots are reported evidence. The code
explains a plausible visible-wait mechanism; it does not measure network latency,
prove a device percentile or establish the exact CSS cause of the overlap.

## Adjacent work protection

Original checkout remains on `fix/task-023-uploaded-playback-url-renewal` with
dirty Listen layout, transport, Media Session, owner inbox and untracked files.
Those files were not modified or imported. TASK-025 draft read-only overlap:
startup/snapshot/clock/discovery/metadata performance stays there; its earlier
floating Listen dock design is replaced for this task by the owner's explicit
compact-bar/drag-up direction. Recheck overlap before the Listen batch.

Focused Jarvis memory was retrieved read-only using its CLI. Its TASK-024 state
is older than the accepted repository release; current source/packet evidence
was used instead. No vault checkpoint or native memory edit was made.

## Engineering decisions to resolve before their respective batches

1. Characterize pin/Play next/queue-mode ordering before defining relative moves;
   record whether explicit flags affect presentation or playback priority.
2. Inspect existing action-result transport before selecting additive move
   outcome correlation. Client dispatch alone is not confirmation; do not use
   recommendation analytics as an assumed acknowledgement protocol.
3. Verify provider-safe compact Listen geometry against supported embed behavior.
   No tiny/hidden iframe or fake audio-only promise to satisfy a visual mockup.
4. Measure queue-drop/confirmation/render baselines before setting final numeric
   animation/timeout/overscan constants. Targets are not measured results.
5. Confirm local runtime/dependency availability and free QA port before creating
   or advertising a server. No copied production secrets by default.

## Validation log

Documentation validation passed on 2026-09-07: 15 changed/new Markdown files,
62 local Markdown links with zero missing targets, 24 unique acceptance IDs and
two screenshot copies matching the supplied originals by SHA-256. Manual
traceability review maps all 17 captured discussion requirements plus the latest
swipe-up refinement to the acceptance matrix and ordered batches.

`git diff --check` passed; Git reports only its ordinary LF-to-CRLF conversion
notices. Changed tracked files are Markdown only; new files are the six-file
task packet and its two reference images. No application/configuration changes.
Application tests and browser QA: not run (documentation checkpoint only).

## Implementation evidence template

For each batch record: baseline and changed scope; exact test and intended red
failure; implementation choice; green and regression commands/results; local
route/screenshots; measured before/after performance; real-provider/device
evidence separately; unresolved issues and intake disposition. Do not mark a
checkbox complete from a plan or source inspection alone.

## 2026-09-07: First implementation checkpoint

The owner approved high-effort, local-only implementation. Batches 027.1 and
027.2 are implemented; [local-qa.md](local-qa.md) records exact changes, tests,
measurements, links, the unresolved early convergence diagnostic and release
boundaries. Earlier documentation-only statements above describe that earlier
checkpoint. Nothing was committed, pushed or deployed to production.


## 2026-09-07: 027.3 local implementation

Owner approved 027.3, retaining the local-only boundary. The Watch shell/header
implementation and test chronology are recorded in [watch-local-qa.md](watch-local-qa.md).
The existing 027.1/027.2 changes are preserved. 027.4 and release acceptance are
not implied by this checkpoint.
