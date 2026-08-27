---
id: TASK-021
status: complete
type: full-packet
related: [MW-FEAT-009, MW-QOL-001, MW-QOL-007, MW-QOL-012, TASK-015, TASK-019]
created: 2026-08-25
updated: 2026-08-27
---

# Listen Room Experience Overhaul

## Problem

The Listen room's current major surfaces are individually functional but read
as separate dark panels. The top command band obscures the dynamic background,
the player rail leaves useful space empty, recommendations dominate the center,
and the collapsed queue feels attached to the viewport rather than integrated
with the room composition.

The mobile and portrait layouts also inherit too much desktop structure. The
result is visually dense without using that density to improve repeated room
workflows.

## Goal

Create an immersive, responsive Listen shell in which the player, room
identity, participants, Discover/Visualizer stage, and queue form one coherent
experience while preserving all proven playback, queue, authority, account,
provider, visualizer, and uploaded-media boundaries.

## Value

- The current media and selected visualizer become the visual focus.
- Dynamic artwork-derived color and background remain visible without reducing
  text or control contrast.
- The player rail uses its full height to expose useful upcoming context.
- Queue access remains powerful while the collapsed state consumes less visual
  weight.
- Participant permissions become discoverable from the participant cluster.
- Desktop, portrait, and mobile layouts feel deliberately composed rather than
  compressed.

## Scope

- Listen player rail framing, transport hierarchy, Like placement, volume
  percentage, and bounded Up Next preview.
- Room identity and action header with left-aligned name, Save Room star,
  right-aligned participant cluster/count, Add Media, TV Mode, account avatar,
  and Settings.
- Discover/Visualizer segmented stage selection.
- Multi-shelf Discover composition using existing Room Picks, contextual
  recommendations, room history, room playlist matches, and Most listened data.
- Compact landscape media cards, restrained playlist cards, per-shelf states,
  and bounded Browse All navigation.
- Focused visualizer stage metadata and mirrored Like control.
- Honest Static Artwork fallback and a separately measured ambient waveform
  candidate.
- Floating collapsed queue composition and themed disclosure handle.
- MW-QOL-012 avatar-cluster participant/permissions entry point.
- Desktop, portrait, tablet, and mobile responsive behavior.

## Exclusions

- No new recommendation algorithm, AI DJ, provider scope, account playlist
  access, playlist import, or Add Media workflow.
- No queue reducer, ordering, history, autoplay, or playback-authority change.
- No Supabase, SpacetimeDB, migration, RLS, upload, CloudConvert, or media API
  change unless a later approved permissions defect requires a separately
  documented security task.
- No replacement of the YouTube iframe or required provider controls.
- No new visualization signal contract, audio capture, BPM provider, or PCM
  transfer.
- No Watch-room or TV-mode redesign beyond regression compatibility.
- No VengeanceUI package, design-system replacement, or new UI dependency.

## Dependencies

- TASK-015C must complete its visibility and affected-laptop performance gate.
- TASK-019's shared-rhythm contract remains unchanged and becomes an input to
  the central visualizer stage.
- TASK-011 remains the recommendation and Like-state foundation. TASK-021 may
  reorganize its outputs but may not broaden their source claims.
- The implementation branch must reconcile the current TASK-019 documentation,
  MW-FEAT-009, and MW-QOL-012 before application edits begin.

## Success

The released Listen room matches the approved reference hierarchy, preserves
room behavior, remains clear at all required widths, exposes participant
permissions safely, and adds no measurable idle animation or large-queue
regression.
