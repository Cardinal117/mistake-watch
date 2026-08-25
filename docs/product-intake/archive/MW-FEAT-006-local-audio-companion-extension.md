---
id: MW-FEAT-006
type: feature
status: resolved
priority: P2
area: listen-visuals
related: [TASK-015, TASK-018, MW-BUG-009]
created: 2026-08-19
updated: 2026-08-21
---

# Private local audio companion extension

> [!success] Resolved through TASK-018 - P2

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
  Siri stays at 24 FPS because its 30 FPS GPU increase reproduced. The `0.3.1`
  cleanup retest passed three start/stop cycles and navigation cleanup with an
  empty service-worker console, so Phase 3A is promoted.
- **Audio caveat:** Capture activation and deactivation cause a brief dip. A
  possible tiny volume increase was not confirmed; Phase 2 laptop QA requires a
  before/during/after steady-state output-level comparison.
- **Phase 3B progress:** Private extension version `0.4.1` now integrates Dot
  Waves, Signal Bloom, and bounded Constellation through the existing rhythm
  contract. The initial `0.4.0` laptop gate returned Revise after the legacy
  Mirror renderer crashed during Lab startup. A test-first `0.4.1` repair now
  gives every renderer the complete lifecycle contract; the real startup path,
  focused tests, full suite, and local browser checks pass.
- **Phase 3C progress:** Private extension version `0.5.0` replaces the delayed
  scalar display approximation with a direct, transient 24 FPS local stream of
  48 frequency bands and a 96-point waveform envelope. Mirror Spectrum and
  Signal Bloom consume native analyser detail with showcase-aligned defaults.
  The behavior was implemented test-first. The `0.4.1` laptop rerun also exposed
  paused animation-loop waste and narrow Constellation clipping; focused failing
  regressions now pass after adding sustained-silence idle and inset rendering.
  Full repository gates and the browser-real Lab startup pass. No website or
  room bridge was added.
- **Phase 3C repair:** The exact `0.5.0` laptop checkpoint exposed a Chromium
  native-timer receiver error before capture reached `PCM`. Version `0.5.1`
  preserves the browser timer receiver through explicit wrappers, with a
  test-first regression matching the laptop failure.
- **Resolution:** Owner laptop QA promoted Phase 3C at exact commit `b60bc69`.
  Capture, local analysis, Mirror Spectrum, Signal Bloom, narrow Constellation,
  paused idle, restart, navigation cleanup, audio continuity, and privacy checks
  passed on Opera GX. The private extension prototype is complete.
- **Follow-up:** [[MW-FEAT-008-shared-rhythm-visualizers|MW-FEAT-008]]
  and [[../../tasks/TASK-019-shared-rhythm-visualizers/proposal|TASK-019]] own
  the separate extension-to-site bridge and host-authoritative stable rhythm
  publication. Do not add that boundary to completed TASK-018.
