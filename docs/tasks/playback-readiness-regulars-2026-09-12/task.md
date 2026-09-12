# Playback readiness and Regulars browsing

Status: implemented and locally verified, 12 September 2026. See [QA evidence](qa.md).

## Scope and contract

The owner approved the findings in `docs/playback-sync-inspection-2026-09-12.md`
and requested the Regulars refinements below. SpacetimeDB remains playback
authority. Changes must preserve permissions, occurrence fencing, replay,
queue order, dynamic room accents and the existing manual-review worktree edits.

1. Manual YouTube Play/Next/Previous/Play Now must prepare the selected occurrence
   before advancing its timeline. Cancel stale readiness on another command,
   permission loss, disconnect or timeout. A slow follower must not hold the room
   indefinitely; joining/following clients catch up to the authoritative timeline.
2. Clock estimation changes must never count as playback commands. Reduce arrival
   jitter in clock sampling and distinguish measured samples from assumptions.
3. Native playback must not repeatedly seek while an earlier seek is unfinished.
   Use modest pitch-preserving rate corrections in both modes, restore normal
   speed when settled, and retain bounded recovery for large drift.
4. Regulars: bounded rendering with access to all available items, previous/next
   controls, smooth drag/swipe, skeletons, reduced motion and accessible controls.
   Replace redundant explanation text with an info control. Theme Discover
   scrollbars and browse filters using existing site tokens.

No recommendation-provider changes, account/device authority redesign or mandatory
room-wide readiness barrier. Native loading behavior and slow-follower limitations
must be reported honestly if they require a further server protocol slice.

## Verification

Write failing regression tests before playback fixes. Cover clock-only changes,
explicit command preemption, delayed native seeking, small drift/rate restoration,
manual start with autoplay disabled, resume away from zero, stale readiness and
timeout. Run existing replay/autoplay/reconnect suites and module build/typecheck.
Check Regulars on desktop/mobile and review changes with the single GPT-5.6 medium
assistant. Record local proof separately from real multi-device/audio QA.

## Release

Post-release owner feedback: wide screens leave unused space because page size
was capped at eight. Approved correction: derive capacity from available width
without that fixed cap, retaining current-page-only rendering and existing tile
dimensions. Verify a wide viewport fills the row and mobile paging is unchanged.

Preserve unrelated dirty recording-review files. No release claim until required
checks pass; record exact changed files, limitations and deployment state.
