# TASK-020: TV Mode Control Parity

Status: QA ready
Documentation level: Compact task
Updated: 2026-08-27

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
- Focused TV/preference/direct-source tests: 16 passed.
- Full `npm test`: 516 passed.
- Typecheck, ESLint, production build, targeted Prettier, diff checks, and the
  file-length policy passed with no new architecture warning.
- The configured local app started and rendered successfully in the in-app
  browser. Interactive room QA was not forced because the available environment
  combines the cloud Supabase project with local SpacetimeDB; creating test room
  data there would cross the non-production-mutation boundary.
- Manual draft-PR gates: signed-in Like/Unlike, guest unavailable behavior,
  settings focus and Escape ordering, narrow/mobile layout, idle reveal,
  persistence, playback continuity, and two-participant synchronization.
