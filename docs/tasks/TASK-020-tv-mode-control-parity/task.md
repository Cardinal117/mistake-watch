# TASK-020: TV Mode Control Parity

Status: Complete
Documentation level: Compact task
Updated: 2026-09-01

## Objective

Give Listen TV mode access to the established active-media Like action and TV
display settings without leaving the cinematic presentation.

## Scope

- Show the existing Like control for the canonical active media in TV mode,
  including a directly loaded YouTube source that is not currently in the queue.
- Reuse the room preference controller already owned by Listen mode.
- Add a compact three-dot TV settings trigger beside the existing Exit action.
- Open the existing TV display settings dialog over TV mode and apply changes
  through the existing browser-local persistent settings state.
- Keep controls reachable through mouse, touch, and keyboard activity when idle
  UI hiding is enabled.
- Close settings before exiting TV mode on Escape and restore focus to the
  settings trigger.

## Exclusions

- No new preference, settings, persistence, or room-authority model.
- No queue, playback, synchronization, reducer, schema, or provider changes.
- No TV-mode card transitions or other MW-QOL-006 animation work.
- No Add Media, direct-load identity creation, or recommendation-scoring
  changes. TV mode reuses TASK-022's established active-media identity.

## Decisions And Approach

- TV mode receives the existing `MediaPreferenceController`; it does not fetch
  or mutate preference state separately.
- The shared `PreferenceHeartButton` remains the accessible source of Like,
  pending, unavailable, and error behavior.
- The existing `ListenRoomSettingsDialog` remains the only TV settings surface.
- Settings-open state stays in the Listen layout so the global TV keyboard
  shortcut can distinguish closing the dialog from exiting TV mode.
- Opening settings suspends idle hiding; focus returns to the trigger on close.

## Implementation

1. Pass preference and TV-settings controls through the Listen TV boundary.
2. Add the Like action and compact settings trigger to the TV overlay.
3. Preserve idle visibility, Escape ordering, and focus restoration.
4. Add focused source-contract tests and run the full project gates.

## Risks

- Escape could exit TV mode while the settings dialog is open.
- Idle hiding could make the settings trigger unreachable or immediately hide
  the UI after closing the dialog.
- A second preference/settings controller could drift from the normal Listen
  surface; this task must reuse the existing instances.

## Acceptance Criteria

- Signed-in users can Like and Unlike the canonical active media from TV mode,
  including direct Play Now sources.
- The control reflects the same liked, pending, unavailable, and error state as
  normal Listen mode.
- The three-dot trigger opens the established TV display settings dialog without
  leaving TV mode or interrupting playback.
- Dimness, UI brightness, and idle-hiding changes apply immediately and retain
  existing browser-local persistence.
- Escape closes settings first; a later Escape exits TV mode.
- Focus returns to the settings trigger after the dialog closes.
- Mouse, touch, focus, and keyboard activity reveal controls when idle hiding is
  enabled.
- Existing playback, queue state, synchronization, volume, fullscreen, and TV
  exit behavior remain unchanged.

## Evidence

- Linked intake items: MW-BUG-008 and MW-QOL-008.
- Refreshed against released `main` commit `860f2aa` in merge commit `50cfb85`;
  the only merge conflict was the product-intake index and was resolved by
  preserving TASK-022 closure while keeping both TASK-020 items active.
- Focused TV/preference/direct-source tests: 16 passed.
- Full `npm test`: 516 passed.
- Typecheck, ESLint, production build, targeted Prettier, diff checks, and the
  file-length policy passed with zero violations. ESLint retains the pre-existing
  `window.location.href` warning in `room-experience.tsx`.
- Configured Vercel Preview deployment `dpl_YeruNwphVxqGqvuN2eTQhWV4MG3k`
  reached Ready with the minimum production-equivalent Supabase and SpacetimeDB
  runtime values. `/api/health` and `/api/ready` returned 200, then Preview
  targeting was removed from all six variables. Supabase OAuth returned the
  temporary Preview login to the canonical production origin, so signed-in
  persistence remained the bounded post-deployment smoke gate.
- A fresh throwaway Listen room on the matching local Supabase plus local
  SpacetimeDB stack passed desktop and 390 x 844 interaction QA: TV settings
  opened without leaving TV mode, values updated immediately, Escape closed the
  dialog before TV mode, focus returned to the settings trigger, and the compact
  overlay and dialog had no horizontal overflow.
- Idle hiding reached zero overlay opacity after its timer and keyboard activity
  restored the controls. The test restored the idle preference afterward.
- A directly loaded embeddable YouTube source advanced from 0 to 3 seconds in
  Listen, to 6 seconds in TV mode, and to 9 seconds while settings were open.
  A clean-tab room reload produced no console warnings or errors.
- The TV Like control changed the shared source state to `Remove Like`; exiting
  TV mode showed the same state in normal Listen mode, and the test restored the
  source to unliked afterward.
- Independent Opera and in-app browser profiles joined one fresh local room as
  separate participants. Both showed two connected participants, stayed
  synchronized from 0:09 through 1:30, and preserved playback while the second
  participant entered TV mode and changed its browser-local display preference.
  Fresh diagnostics contained no errors or redirect/postMessage loop.
- PR #4 merged to `main` as `a6747f8b8792987db06c0aee42969dc05dfe4e3a`
  on 2026-08-31. Vercel production deployment
  `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7` reached Ready and aliased
  `watch.mistakestudios.com`; canonical `/api/health` and `/api/ready` returned
  200 with Supabase and SpacetimeDB ready and CloudConvert configured.
- Signed-in owner production QA used the existing `Me at the zoo` source. Like
  changed to Remove Like in TV mode, synchronized to normal Listen, survived a
  reload and tab close/reopen, and remained present in reopened TV mode. The
  temporary Like was removed and the original unliked baseline persisted after
  returning to Listen and reloading. Production browser diagnostics contained
  no errors.
