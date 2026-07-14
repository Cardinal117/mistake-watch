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
- [x] Repeat owner-authenticated Listen/Watch switching for paused and playing
  YouTube, direct, and uploaded sources on a temporary deployment.

Batch 1.1 status: released to production after automated and live owner QA.

### Incident hardening: MW-BUG-001 atomic uploaded autoplay

- [x] Replace uploaded autoplay's separate source-load and playback writes with
  one `advanceUploadedQueueItem` canonical mutation.
- [x] Add a backward-compatible uploaded reducer with required
  expected-next-item and uploaded-session-reference validation.
- [x] Regenerate the TypeScript reducer contract.
- [x] Make the existing atomicity regression pass and extend stale/source
  validation coverage.
- [x] Run the complete automated release gate.
- [x] Publish the additive reducer to production SpacetimeDB before deploying
  the frontend client; the existing reducer contract remains unchanged.
- [x] Verify uploaded autoplay with an owner and second participant, including
  duplicate-ended and stale/reordered-next scenarios.

MW-BUG-001 status: closed after ordered production release and user-confirmed
two-client QA.

## Batch 2: Shared workflow and server boundaries

- [x] Split `queue-panel.tsx` into queue rendering, controls, history,
  notifications, and Add Media modules.
- [x] Extract shared queue/Add Media contracts and controller behavior used by
  listen and watch.
- [x] Split `lib/media/assets.ts` into domain services behind compatibility
  exports.
- [x] Remove verified dead mocks and stale room status text.
- [x] Expand formatting coverage and introduce warning/ratchet reporting.

Batch 2 status: implementation and automated QA complete on the isolated
integration branch. Local browser navigation reached the dashboard and stale
room recovery, but fresh-room interaction is blocked before queue rendering by
the local SpacetimeDB connection environment. Preview owner/member/guest QA
remains the release check.

### Batch 2 production-QA blocker: MW-BUG-003 Play Next consumption

- [x] Confirm the active item retains `is_play_next` after manual and automatic
  queue advancement.
- [x] Consume one-shot Play Next priority in every reducer path that promotes a
  queue item to `playing`.
- [x] Add regression coverage for autoplay, explicit play, and failure-recovery
  advancement.
- [x] Build the SpacetimeDB module and run focused sync, reducer, and queue
  suites.
- [x] Publish the behavior-only SpacetimeDB update before retesting production.
- [ ] Confirm manual and automatic uploaded advancement remove the NEXT badge
  for the owner and a second participant.

MW-BUG-003 status: fix committed as `867e7b0` and published without a breaking
migration; live owner/two-client QA remains.

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
