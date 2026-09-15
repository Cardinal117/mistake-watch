# CPU efficiency slice — Personal Discover refresh control

Status: released on 2026-09-15 in `6a2c893`; production deployment
`dpl_BnUxVRq9pebHuEX1c35JjMGzS4Sc` is Ready.

## Objective

Reduce avoidable Vercel work from Personal Listen Discover without changing
recommendation, feedback, queue, expiry, authorization or playback behaviour.

## Scope

- Stop scheduled Discover reads while Visualizer is selected.
- Retain mounted Discover state and metadata-expiry enforcement.
- Allow only one Discover read in flight per mounted Personal panel.
- Coalesce focus, visibility, preference and mutation invalidations into at most
  one required follow-up read.
- Refresh once when Discover becomes active again.

## Exclusions

- Preference polling, authorization reuse, delivery scheduling, maintenance,
  heartbeat, health-check and upload-polling changes.
- Recommendation ranking, provider, database or SpacetimeDB behaviour.
- Git publication and deployment unless separately requested after QA.

## Acceptance

- No interval-triggered Discover GET occurs while the panel is inactive.
- Concurrent refresh requests share one in-flight operation and schedule no more
  than one follow-up.
- An inactive invalidation is retained and runs when the panel becomes active.
- Existing stale mutation protection and metadata-expiry removal remain intact.
- Targeted tests, typecheck, lint and production build pass.

## Implementation and QA evidence

- Added a per-panel refresh coordinator that distinguishes ordinary coalesced
  refresh requests from invalidations that require one follow-up read.
- Discover activity follows workspace visibility and the selected tab, never
  playback play/pause state. React Strict Mode initial effects remain one read.
- The existing expiry timer remains independent of panel activity.
- Test-first coordinator chronology: initial naive behavior failed 4/4 because
  inactive requests ran and bursts started multiple reads; final coordinator
  passes 5/5, including inactive retention, no redundant focus follow-up,
  mutation follow-up, deactivation and disposal.
- Browser QA: 20/20 Personal Discover checks pass at mobile, landscape, tablet
  and desktop sizes. New checks simulate 90 seconds in Visualizer with zero
  Discover GETs, expiry while hidden, exactly one read on return, and a feedback
  mutation during a delayed read producing exactly one fresh follow-up.
- Recommendation regression suite: 235/235 passed.
- `npm run typecheck`, production `npm run build`, changed-file ESLint and full
  source ESLint excluding ignored local `.tmp`/Playwright artifacts passed.
- `npm run check:file-lengths` reports one pre-existing violation in unchanged
  `components/room/youtube-media-player.tsx`; this slice introduced no new
  violation. The expanded Personal Discover browser file remains a warning.

DeepSeek run `d0304bee17e344ea90e1d3d236a61a8a` completed a read-only static
review. It found no high-severity issue. Its Strict Mode, passive-effect race,
render-ref lint and responsive-count concerns were addressed and independently
verified on the host. The worker could not execute dependencies in its isolated
container; host-side evidence above is authoritative for tests.

The exact committed release snapshot passed a clean production build before
deployment. Production health and readiness return 200 on the custom domain.
See the combined [release receipt](../cpu-maintenance-scheduling/release.md).
