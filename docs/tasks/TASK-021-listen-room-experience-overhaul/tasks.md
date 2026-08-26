---
id: TASK-021-TASKS
status: in-progress
related: [TASK-021]
updated: 2026-08-26
---

# TASK-021 Implementation Batches

## Batch A - Contract Baseline And Shell

**Status:** user QA accepted on 2026-08-25. Follow-up density, command, and
drawer-clearance corrections were accepted on 2026-08-26 and recorded in
branch checkpoints; release review remains.

- Capture desktop, portrait, and mobile baselines before source changes.
- Establish characterization coverage for playback continuity, queue state,
  provider mounting, participant count semantics, Save Room, Like, and drawer
  virtualization.
- Extract a stable responsive shell without changing room behavior.
- Implement the open-background gutters, rounded player rail, and unboxed top
  command composition.
- Review point: shell appearance and unchanged behavior before deeper controls.

## Batch B - Header And Participant Entry Point

**Status:** user QA accepted on 2026-08-25 and recorded in branch checkpoints;
release review remains.

- Add the existing Save Room action beside the room name.
- Preserve active avatars and numeric blip on the right with adaptive name
  sizing and wrapping.
- Make the cluster open the existing participant/audience surface.
- Test owner, member, and guest permission states before implementation.
- Keep account avatar and Settings as distinct actions.
- Review point: keyboard/focus and authority QA before proceeding.

## Batch C - Player Rail And Up Next

**Status:** user QA accepted on 2026-08-25 and recorded in branch checkpoints;
release review remains.

- Round and frame the existing provider surface without changing the YouTube
  lifecycle or native menu.
- Refine transport hierarchy, mirrored Like state, and volume percentage.
- Render three/two/one immediate Up Next rows by responsive state.
- Preserve direct/uploaded playback, next preparation, and queue identity.
- Review point: YouTube, uploaded media, natural completion, Next/Previous, and
  two-participant continuity.

## Batch D - Discover Surface

**Status:** user QA accepted on 2026-08-25 and recorded in branch checkpoints;
release review remains.

- Keep the Discover/Visualizer segmented control paired with the functional
  Visualizer stage in Batch E; do not expose an empty selectable state.
- Add pure shelf derivation coverage before changing the UI: source mapping,
  order, stable deduplication, fallback, and empty-shelf behavior.
- Replace the single filter rail with the approved multi-shelf Discover surface
  described in `discover-design.md`.
- Implement compact landscape media cards and the restrained playlist variant
  without changing Play Now, queue, Play Next, Like, or permission semantics.
- Preserve `Most listened` through a visible shelf or Browse All route.
- Add independent loading/error states, keyboard shelf navigation, lazy artwork,
  and responsive card budgets.
- Review point: data honesty, action correctness, density, loading behavior,
  desktop/mobile layout, and unchanged playback/queue state.

## Batch E - Visualizer Stage

**Status:** user QA accepted on 2026-08-26, including visual-parity,
artwork-palette, glass-surface, and player-rail corrections. Branch checkpoints
are recorded; release review remains.

- Present compatible visualizers, metadata, progress, and mirrored Like under
  Visualizer.
- Add the explicit Static Artwork fallback message.
- Keep Ambient Waveform non-default and user-controlled. The accepted browser
  preference replaces the temporary development flag without changing Static
  Artwork as the safe default.
- Review point: capability, fallback honesty, performance, and visual prominence.

## Batch F - Floating Queue And Responsive Completion

**Status:** implementation and user QA accepted on 2026-08-26. Integrated live
checks passed for Opera Listen-to-Watch switching, two-participant playback,
uploaded playback boundaries, catalogue denial, and owner/member/guest
permissions. Final automated gates and atomic Git review passed; branch
publication and release review remain.

- Restyle the collapsed queue and themed disclosure handle.
- Preserve open-drawer virtualization, scrolling, controls, and history.
- Complete portrait/tablet/mobile states and safe-area handling.
- Run full accessibility, large-queue, visual, and regression gates.
- Review point: production-candidate comparison against the approved reference.

## Visual Refinement Gate - Player, Discover, And Ambient Presentation

**Status:** implemented and user accepted on 2026-08-26. Branch checkpoints are
recorded; integrated release review remains.

- Make the player artwork/provider frame consume its available top surface
  without introducing provider remounts or cropping native controls.
- Restore comfortable metadata, progress, transport, and volume spacing at
  desktop widths while retaining compact responsive spacing on shorter screens.
- Present five comfortable landscape recommendation cards at the reference
  desktop width and hide the redundant visual scrollbar while preserving arrow,
  wheel, touch, and keyboard shelf navigation.
- Add a browser-local Background vibrancy control under Personalization. Keep
  color extraction authoritative; vibrancy changes presentation strength, not
  which palette colors are selected.
- Replace always-visible Visualizer capability copy with an accessible compact
  information trigger and anchored popover. Fallback state remains explicit to
  assistive technology and available on demand without obscuring artwork.
- Add an optional browser-local Ambient Waveform fallback, off by default, plus
  an independent artwork-behind-visualizers preference that defaults on.
- Strengthen the bounded Background vibrancy range so its endpoints are
  materially distinct without changing extracted palette identity.
- Refine the primary Play/Pause control into the approved circular translucent
  accent treatment with restrained depth and halo.

## Safe Checkpoints

Each batch should be independently reviewable and eligible for an atomic commit
only after its focused QA passes. Do not combine all layout work into one final
commit. Deployment remains separately approved after the integrated gate.
