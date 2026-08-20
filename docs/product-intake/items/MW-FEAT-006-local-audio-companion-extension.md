---
id: MW-FEAT-006
type: feature
status: in-progress
priority: P2
area: listen-visuals
related: [TASK-015, TASK-018, MW-BUG-009]
created: 2026-08-19
updated: 2026-08-20
---

# Private local audio companion extension

> [!idea] Planned after TASK-015B - P2

- **Requested:** Build an optional Chromium companion extension that captures
  the active Mistake Watch tab after an explicit user action, analyses audio
  locally, and returns bounded rhythm features for enhanced Listen visuals.
- **Product decision:** Prefer local extension analysis over GetSongBPM or
  another paid BPM API. Keep the ordinary website usable without an extension.
- **DSP decision:** Use a focused first-party `BeatDetector` built around an
  AudioWorklet, onset energy, spectral flux, peak detection, autocorrelation,
  tempo normalization, and beat-phase alignment. Do not add Essentia.js or
  another general music-information-retrieval dependency.
- **Privacy boundary:** Audio samples stay on the device. Do not upload, retain,
  replay, expose, or distribute captured audio. The website may receive only a
  small, versioned rhythm contract such as BPM, beat interval, beat offset,
  confidence, onset, bass, mids, highs, and energy.
- **Distribution boundary:** Design for private installation by trusted Mistake
  Watch users. Do not design around Chrome Web Store or Opera Add-ons
  publication, and do not expand the prototype into public distribution.
- **Platform boundary:** Opera GX is the owner-priority browser. Chrome and Edge
  compatibility are useful, but Opera GX `tabCapture`, permission, audio-output,
  and lifecycle behavior require explicit proof before support is claimed.
- **Synchronization direction:** A later, separately approved integration may
  let one authorized host publish stable BPM, beat offset, and confidence for
  the active media generation. Other participants can reconstruct identical
  beat pulses from the synchronized room playback clock without installing the
  extension. Continuously changing energy bands stay local initially.
- **Policy boundary:** Treat YouTube capture as private research. Private use
  does not establish YouTube policy approval, and the prototype must not be
  presented as approved public functionality.
- **Related work:** TASK-015B selects visualizers and establishes rendering
  budgets. TASK-018 owns the isolated extension proof. MW-BUG-009 retains the
  combined resource budget.
- **Current progress:** TASK-015B is recorded. TASK-018 Phases 1 and 2 passed on
  the Opera GX laptop. Phase 3A proved that Mirror Spectrum and Siri Ribbon are
  functionally sound and inexpensive at 24 FPS without changing the production
  website, SpacetimeDB, or room authority. Mirror remains the safer default;
  Siri stays at 24 FPS because its 30 FPS GPU increase reproduced.
- **Audio caveat:** Capture activation and deactivation cause a brief dip. A
  possible tiny volume increase was not confirmed; Phase 2 laptop QA requires a
  before/during/after steady-state output-level comparison.
- **Phase 3A blocker:** The benign missing-receiver cleanup warning now has a
  test-first local fix. The automated gate passes while unexpected errors remain
  visible, but the Opera GX clean-console retest is still required.
- **Next action:** Reload extension version `0.3.1` and run three capture
  start/stop cycles. Promote Phase 3A only if the service-worker console remains
  clean and capture, audio, badge, Lab, playback, and queue cleanup still pass.
