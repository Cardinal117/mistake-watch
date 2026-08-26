---
id: MW-FEAT-009
type: feature
status: in-progress
priority: P2
area: listen-responsive-ui
created: 2026-08-25
updated: 2026-08-26
related: [TASK-021, MW-QOL-007, MW-QOL-012]
---

# Redesign the Listen room as an immersive responsive media surface

> [!feature] In progress - P2

- **Requested:** Replace the panel-heavy Listen composition with an immersive,
  responsive player shell that gives the dynamic room background, active media,
  visualizer, queue, and participants deliberate space.
- **Expected:** The player rail, room header, Discover/Visualizer stage, queue
  drawer, participants, search, settings, and mode switching remain clear and
  efficient from wide desktop through mobile portrait widths.
- **Discover direction:** Replace the single tabbed recommendation rail with a
  compact multi-shelf surface for Room Picks, contextual recommendations, room
  history, room playlist matches, and Most listened. Preserve current TASK-011
  ranking, commands, source honesty, and provider boundaries.
- **Evidence:** The current desktop layout contains unnecessary dark bands and
  unused player-rail space. The current mobile layout compresses the desktop
  composition instead of presenting a deliberate touch interface.
- **Constraints:** Preserve playback, room authority, queue behavior, provider
  controls, uploaded-media permissions, Google account access, and the proven
  visualizer capability/fallback contract.
- **Decision:** [[../../tasks/TASK-021-listen-room-experience-overhaul/proposal|TASK-021]]
  owns the planned redesign, with
  [[../../tasks/TASK-021-listen-room-experience-overhaul/discover-design|Discover design]]
  as the recommendation-surface contract. TASK-015C remains its prerequisite
  release gate.
- **Current evidence:** TASK-021 Batches A-E and the approved visual-refinement
  gate are implemented and user accepted. The responsive shell, participant
  entry point, player rail, Up Next preview, Discover shelves, Visualizer stage,
  artwork palette, and browser-local vibrancy controls pass focused automated,
  browser, type, lint, build, formatting, and file-length checks. Batch F still
  owns the expanded queue, safe-area, large-queue, accessibility, and integrated
  release gate.
