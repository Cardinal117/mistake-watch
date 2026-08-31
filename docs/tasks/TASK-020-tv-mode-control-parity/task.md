# TASK-020: TV Mode Control Parity

Status: QA ready
Documentation level: Compact task
Updated: 2026-08-31

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
- Vercel Preview deployment `dpl_Fpiqz7VRZDU2dwbgJoRJSWZdZ861` reached Ready
  and returned 200 from `/api/health` through authenticated Vercel CLI access.
  It is access-protected and has no Preview runtime integrations, so `/api/ready`
  correctly returns 503 and it is not a room-interaction QA environment.
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
- Remaining draft-PR gates: repeat Like/Unlike with a signed-in account, confirm
  persistence after a full browser restart, and verify playback/control state
  with a genuinely separate second participant. Production deployment remains a
  separate release decision.
