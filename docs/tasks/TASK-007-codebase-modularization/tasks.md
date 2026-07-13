# TASK-007 Tasks

## Gate 0: Safety and baseline

- Create safety tag and integration branch.
- Record LOC and room bundle baselines.
- Run the complete pre-change verification suite.
- Preserve unrelated untracked screenshots.

Safe commit: task packet and baseline only.

## Batch 1: Independent room decomposition

### Agent A: listen mode

- Move listen header, TV, discovery, queue, Add Media, settings, and theme responsibilities into `components/room/listen/**`.
- Keep `components/room/listen-mode-layout.tsx` as a compatibility entrypoint or thin re-export.
- Do not share or redesign behavior yet.
- Do not modify watch, shared queue, media, realtime, config, tests, or task files.

### Agent B: watch mode

- Move watch header, audience, queue surface, media library, folder, and upload responsibilities into `components/room/watch/**`.
- Keep `components/room/watch-mode-layout.tsx` as a compatibility entrypoint or thin re-export.
- Do not change API calls, access checks, upload behavior, or UI.
- Do not modify listen, shared queue, media, realtime, config, tests, or task files.

### Integration checkpoint

- Review and integrate each commit independently.
- Run typecheck, lint, queue/media/player tests, build, and local watch/listen browser QA.
- Reject hidden behavior changes or incomplete moves.

## Batch 2: Shared workflow and server boundaries

- Split `queue-panel.tsx` into queue rendering, controls, history, notifications, and Add Media modules.
- Extract shared queue/add-media contracts and controller behavior used by listen and watch.
- Split `lib/media/assets.ts` into domain services behind compatibility exports.
- Remove verified dead mocks and stale room status text.
- Expand formatting coverage and introduce warning/ratchet reporting.

## Batch 3: Realtime and loading boundaries

- Decompose `use-live-room.ts` while preserving `LiveRoomState`.
- Extract pure helpers from `spacetime/src/index.ts` without schema/reducer changes.
- Add dynamic room-mode loading and lazy hidden workflow boundaries.
- Re-run and compare route bundle baselines.

## Final gate

- Complete automated suite and production build.
- Desktop/mobile watch and listen QA.
- Owner, member, guest, queue, playback, upload, permissions, Media Session, and failure-resilience checks.
- Commit report and explicit approval before main/push/deploy.
