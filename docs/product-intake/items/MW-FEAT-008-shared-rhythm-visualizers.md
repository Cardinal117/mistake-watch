---
id: MW-FEAT-008
type: feature
status: in-progress
priority: P1
area: listen-visuals
related: [TASK-018, TASK-019, MW-FEAT-006, MW-BUG-009]
created: 2026-08-21
updated: 2026-08-25
---

# Shared rhythm visualizers

> [!feature] In progress through TASK-019 - P1

- **Requested:** Put the promoted companion visualizers inside the Mistake
  Watch Listen room and let trusted users opt into song-reactive rendering.
- **Local bridge:** A private extension may stream bounded `RhythmFrameV1` and
  `VisualFrameV1` values to its own captured Mistake Watch tab. Frames remain
  in browser memory and never enter storage, HTTP, Supabase, or room state.
- **Shared rhythm:** The authoritative host may publish only stable YouTube
  timing metadata: media ID, playback occurrence, BPM, beat interval, media
  beat offset, confidence, algorithm version, revision, and expiry.
- **Fidelity boundary:** Mirror Spectrum and Signal Bloom require local visual
  frames for full fidelity. Siri Ribbon, Dot Waves, and Constellation may use
  the shared playback clock and stable rhythm profile on devices without the
  extension. Do not disguise synthetic data as live frequency analysis.
- **Safety:** Static Artwork remains the default. Experimental modes retain
  honest high-power labels and stop while paused, hidden, or inactive.
- **Production revision:** The first TASK-019 gate exposed a missing steady-
  rhythm refresh and an Opera Personalization focus trap. Extension `0.6.2`
  and the corresponding website correction pass local gates and await one
  focused exact-SHA production rerun.
- **Task:** [[../../tasks/TASK-019-shared-rhythm-visualizers/proposal|TASK-019]]
- **Origin:** Follow-up from
  [[../archive/MW-FEAT-006-local-audio-companion-extension|MW-FEAT-006]].
