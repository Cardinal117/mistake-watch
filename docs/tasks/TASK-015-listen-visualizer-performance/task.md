# TASK-015: Listen Visualizer Performance

Status: Implemented - performance QA pending
Documentation level: Compact task
Updated: 2026-08-18
Related intake: MW-BUG-009

## Objective

Replace the high-cost Listen waveform with a small set of efficient, artwork-
reactive visual modes while preserving playback, room synchronization, reduced-
motion behavior, and the established Mistake Watch visual language.

## Scope

- Replace the 96 independently animated waveform bars and their 192 glow
  shadows with a maximum of three transform-animated SVG wave layers.
- Make artwork-reactive Dynamic Horizon the default Listen visualization.
- Add Signal Ribbon, Minimal Pulse, Static Artwork, and Off alternatives.
- Expose the visual mode in Account Personalization with browser-local
  persistence for both signed-in and guest sessions in this task.
- Animate only the selected Personalization preview and stop previews after a
  bounded interval.
- Pause continuous visual motion while playback is paused, the document is
  hidden, or the operating system requests reduced motion.
- Preserve the existing artwork palette extraction and deterministic fallback
  themes.

## Exclusions

- No BPM provider, GetSongBPM integration, audio analysis, Web Audio capture,
  Librosa, Aubio, Essentia, or YouTube audiovisual retrieval.
- No Supabase migration, account preference API, RLS, or cross-device setting
  synchronization.
- No queue, playback authority, SpacetimeDB, recommendation, upload-processing,
  CloudConvert, or media API changes.
- No Listen-room layout redesign and no new dependency.
- No deployment, production mutation, commit, or push in this implementation
  run.

## Decisions And Approach

- Adapt the public CodePen Responsive and Configurable SVG Waves pattern under
  its MIT license. Keep the attribution in the source and store all visual
  assets locally.
- Render three reusable SVG wave paths and animate only their wrapper transforms.
  Do not animate blur, shadow, clip-path geometry, path data, layout, or color.
- Continue using `useArtworkTheme`; palette extraction runs once when artwork
  changes and updates existing Listen CSS variables.
- Dynamic Horizon maps the three layers to `--listen-wave`,
  `--listen-primary`, and `--listen-secondary` over Deep Charcoal.
- Keep personalization viewer-local. A room participant's visual choice must
  not enter room-authoritative state or affect another participant.
- Persist a versioned, allowlisted mode value in `localStorage`, synchronize it
  across same-origin tabs through the storage event, and fall back safely when
  storage is unavailable or corrupt.
- Account-backed persistence is deferred until a durable general account-
  personalization contract is designed.

## Implementation

1. Add a typed visualization-mode contract, safe storage parsing, and a client
   hook for reduced motion, document visibility, and cross-tab preference
   changes.
2. Implement Dynamic Horizon, Signal Ribbon, Minimal Pulse, Static Artwork,
   and Off using stable SVG geometry and bounded animation counts.
3. Replace `ListenCenterWaveform` while retaining the existing ambient artwork
   and palette pipeline.
4. Replace the Personalization placeholder with an accessible segmented choice
   surface and one-at-a-time bounded previews.
5. Add focused contract, source-boundary, accessibility, and rendering-budget
   tests; run full repository gates and local responsive browser QA.
6. Run the same two-minute active-playback CPU comparison on the affected
   laptop before release approval.

## Risks

- **False performance confidence:** automated DOM budgets cannot replace the
  laptop's active-playback A/B measurement.
- **Layer inflation:** previews and production visuals must never mount several
  continuously animated modes at once.
- **Motion accessibility:** reduced-motion and hidden-document states must
  freeze every new continuous animation.
- **Palette contrast:** artwork-derived colors remain decorative and may not
  reduce control or text contrast.
- **Storage drift:** unknown stored values must resolve to Dynamic Horizon
  without breaking rendering.
- **License loss:** retain the source attribution and MIT notice with the
  adapted component.

## Acceptance Criteria

- Dynamic Horizon is the default and changes its three wave colors when the
  active artwork-derived theme changes.
- Active Listen renders no more than three continuously animated wave layers,
  no per-wave box shadows, and no animated blur or path geometry.
- Signal Ribbon and Minimal Pulse render no more than two continuous animated
  elements; Static Artwork and Off render none.
- Pausing playback, hiding the document, or enabling reduced motion freezes all
  continuous visualization motion.
- The selected mode survives refresh and updates another same-origin tab.
- Personalization is keyboard operable, reports the selected option, and never
  runs more than one preview at once.
- Existing room playback, queue state, participants, artwork color extraction,
  TV mode, and mobile Listen behavior remain unchanged.
- Full tests, typecheck, ESLint, changed-file formatting, file-length policy,
  production build, and desktop/mobile browser checks pass.
- On the affected laptop, active playback improves by at least 70% from the
  measured 17% aggregate-Chrome median, with a target of no more than 5%
  median and 10% short peak using the same measurement method.

## Evidence

- Owner testing measured approximately 26-32% Mistake Watch tab CPU during
  active Listen playback and approximately 3.6% with Windows animation effects
  disabled.
- A controlled 120-second active-playback run measured 17% median and 32% peak
  aggregate Chrome CPU, versus 0% median and 3% peak while paused.
- The deployed layout mounted 96 continuously animated bars with two large
  glow shadows per bar. Pausing stopped all 96 animations.
- The controlled layout contained no separate side-bar or player-visualizer
  animation, identifying the center waveform as the dominant rendering defect.
- The implementation removes every legacy `.listen-center-wave-bar`, mounts at
  most three Dynamic Horizon layers, and keeps every visualization free of
  per-layer shadows, filters, and animated SVG geometry.
- Focused visualization, waveform, and account-room tests passed: 23 of 23.
- The full repository suite passed: 362 of 362 tests, typecheck, ESLint,
  changed-file formatting, file-length policy, and the Next.js production
  build.
- Local browser QA passed at 1440x900 and 390x844: all five modes were present,
  one close control was visible, no horizontal overflow occurred, the selected
  mode survived reload, and a preview stopped after five seconds.
- Browser inspection confirmed one preview active at a time, three Dynamic
  Horizon layers, one Signal Ribbon layer, and zero legacy waveform bars.
- Release approval remains blocked on the affected laptop's two-minute active-
  playback CPU comparison and ordinary playback/TV-mode regression smoke test.
