---
id: TASK-021-BRAIN-DUMP
status: captured
related: [TASK-021, MW-FEAT-009, MW-QOL-007, MW-QOL-012]
updated: 2026-08-25
---

# Listen Room Experience Overhaul - Owner Direction

## Desired Feeling

The Listen room should feel smooth, open, and intentional. The dynamic
artwork-derived background should connect the player, header, central stage,
and queue instead of being repeatedly blocked by dark rectangular bands.

## Confirmed Direction

- Use a rounded, floating left player rail with background visible around it.
- Use the player rail's unused lower space for a clear Up Next preview:
  three items on desktop, two on tablet, and one on compact mobile.
- Keep a full queue in the bottom drawer; the rail is only the immediate preview.
- Restyle the collapsed queue as the reference's wide rounded floating bar,
  with background visible on every side.
- Adapt the reference queue handle and tint its arrow, focus, and active state
  with the current artwork-derived room color.
- Remove the full-width dark backing rectangle from the top command area.
- Keep Add Media primary, TV Mode secondary, Settings separate, and the Google
  account avatar present as its own account entry point.
- Keep the room name on the left. Keep active participant avatars and the
  numeric overflow/history blip on the right, adapting to name length.
- Use the room star as the existing Save Room action, not a second bookmark
  system.
- Add a Discover/Visualizer segmented control. Discover owns recommendations;
  Visualizer owns the focused visualization stage.
- Keep Like available in the player rail and visualizer. Both controls must
  share one preference state and mutation controller.
- Keep the YouTube overflow/menu behavior in the YouTube player, not in the
  visualizer stage.
- Keep room colors dynamic. Accent color communicates state and identity rather
  than becoming a fixed cyan/green decoration.
- Open the participant/audience and permissions surface from the avatar cluster
  as described by MW-QOL-012.

## Discover Direction

- Make Discover a complete browsing surface instead of one Room Picks rail with
  four mutually exclusive filter tabs.
- Show several recommendation reasons at once using compact horizontal shelves
  and landscape media cards.
- Adopt the reference hierarchy for Room picks, contextual recommendations,
  recently played room media, and playlist-related items.
- Keep the design honest: current playlist matches belong to the room and must
  not be presented as the signed-in user's YouTube playlists.
- Preserve Most listened, all current media commands, Like synchronization,
  provider fallback, and permission behavior.
- Use one rounded translucent Discover surface with unframed shelf sections;
  only repeated media or playlist items are cards.
- Keep dynamic room color visible and reserve it for selected, focused, and
  active state rather than outlining every card.

## Provider Clarification

The reference image presents square artwork, while the current YouTube Listen
surface mounts the real provider iframe. TASK-021 must not quietly replace or
hide required provider behavior.

The first implementation should change framing only: clip the existing player
surface into the approved rounded rail, preserve the YouTube iframe, native
provider controls, overflow menu, playback bridge, and source identity. A later
artwork-first or minimized-player mode requires an explicit decision after
provider-policy, keyboard, playback, and accessibility verification.

Direct and uploaded audio-like sources may use artwork when their playback path
does not require an interactive video surface. Video-capable sources must remain
inspectable and recoverable.

## Fallback Candidate

When a selected rhythm visualizer has no usable rhythm input, the owner prefers
something more alive than a blank stage. Evaluate a very lightweight ambient
mirror waveform using artwork-derived colors and playback-clock-driven motion.

It must not pretend to be audio-reactive. It should be deterministic across
clients, stop while paused or hidden, honor reduced motion, and pass the safe
default resource budget. Static Artwork remains the production fallback until
that candidate passes. A visible fallback label must explain the active state.

## Explicit Non-Direction

- Do not remove the Google account avatar.
- Do not center the room name.
- Do not add a second room favourite system.
- Do not duplicate the provider overflow menu in the visualizer.
- Do not make the entire queue permanently visible in the left rail.
- Do not add fixed cyan/green styling, heavy blur, broad glow, or decorative
  animation.
- Do not alter queue reducers, room authority, uploads, recommendations, or
  provider integration as part of the layout work.
