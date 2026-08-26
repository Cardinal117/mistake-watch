---
id: MW-FEAT-008
type: feature
status: resolved
priority: P1
area: listen-visuals
related: [TASK-018, TASK-019, MW-FEAT-006, MW-BUG-009]
created: 2026-08-21
updated: 2026-08-25
---

# Shared rhythm visualizers

> [!success] Resolved through TASK-019 - P1

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
- **Production result:** Extension `0.6.2` and website SHA `75f33ef` passed the
  focused production rerun. Shared Siri Ribbon remained active beyond 35
  seconds, reached an extension-free participant, returned safely to Static
  Artwork after capture stopped, and preserved Personalization containment.
- **Release:** Vercel deployment `dpl_A1TzXCpKJtJ6ySHD7QF5HYtW28En` serves both
  production aliases. Static Artwork remains the default and experimental
  visualizers retain their power labels.
- **Post-release status:** TASK-015C commit `7951355` preserves the completed
  shared-rhythm capability while optimizing Siri Ribbon. Current production QA
  requires a narrow visibility and measurement correction; this does not
  reopen the resolved bridge, authority, privacy, or extension-free participant
  capability.
- **Task:** [[../../tasks/TASK-019-shared-rhythm-visualizers/proposal|TASK-019]]
- **Origin:** Follow-up from
  [[MW-FEAT-006-local-audio-companion-extension|MW-FEAT-006]].
