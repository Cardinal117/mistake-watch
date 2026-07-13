# TASK-007 Tasks

## Gate 0: Safety and baseline

- [x] Create safety tag and integration branch.
- [x] Record LOC and room bundle baselines.
- [x] Run the complete pre-change verification suite.
- [x] Preserve unrelated untracked screenshots.

Safe commit: task packet and baseline only.

## Batch 1: Independent room decomposition

### Agent A: listen mode

- [x] Move listen header, TV, discovery, queue, Add Media, settings, and theme responsibilities into `components/room/listen/**`.
- [x] Keep `components/room/listen-mode-layout.tsx` as a compatibility entrypoint or thin re-export.
- [x] Do not share or redesign behavior yet.
- [x] Do not modify watch, shared queue, media, realtime, config, tests, or task files.

### Agent B: watch mode

- [x] Move watch header, audience, queue surface, media library, folder, and upload responsibilities into `components/room/watch/**`.
- [x] Keep `components/room/watch-mode-layout.tsx` as a compatibility entrypoint or thin re-export.
- [x] Do not change API calls, access checks, upload behavior, or UI.
- [x] Do not modify listen, shared queue, media, realtime, config, tests, or task files.

### Integration checkpoint

- [x] Review and integrate each commit independently.
- [x] Run typecheck, lint, queue/media/player tests, build, and available local browser QA.
- [x] Reject hidden behavior changes or incomplete moves.

Batch 1 status: implementation and automated QA complete on the integration
branch. Listen desktop/mobile browser QA passed. Local owner-authenticated watch
interaction remains a manual release check because Google OAuth is unavailable
on localhost.

### Batch 1.1: Mode-switch continuity release blocker

- [x] Confirm the temporary modularized deployment resets direct/uploaded
  playback to `0:00` while the production baseline preserves position.
- [x] Prevent passive direct-player pause, play, and seek events from writing
  canonical room state during player remount and synchronization.
- [x] Add regression coverage for passive event authority and mode-reducer
  preservation of playback position and duration metadata.
- [x] Run player, queue, media/security, SpacetimeDB, typecheck, lint, and build
  gates.
- [ ] Repeat owner-authenticated Listen/Watch switching for paused and playing
  YouTube, direct, and uploaded sources on a temporary deployment.

Batch 1.1 status: implementation and automated QA complete. Live owner QA is
the remaining release gate; the branch must not merge before it passes.

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
