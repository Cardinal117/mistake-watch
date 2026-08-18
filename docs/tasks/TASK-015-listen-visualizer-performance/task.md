# TASK-015: Listen Visualizer Performance

Status: TASK-015A2 visibility correction locally verified - live QA pending
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
- Make Static Artwork the safe default Listen visualization.
- Add Signal Ribbon, Minimal Pulse, Static Artwork, and Off alternatives.
- Identify every continuously animated mode as a higher-power experiment until
  it independently passes the affected-laptop performance budget.
- Expose the visual mode in Account Personalization with browser-local
  persistence for both signed-in and guest sessions in this task.
- Add browser-local Visual Intensity and Background Dimming controls directly
  below the visualization choices, with representative current-artwork
  previews when the panel opens from a Listen room.
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

## Decisions And Approach

- Adapt the public CodePen Responsive and Configurable SVG Waves pattern under
  its MIT license. Keep the attribution in the source and store all visual
  assets locally.
- Treat the affected-laptop benchmark as authoritative for the default. The
  three-layer SVG implementation reduced DOM complexity but did not reduce
  steady-state CPU, so it cannot remain the default.
- Render three reusable SVG wave paths and animate only their wrapper transforms.
  Do not animate blur, shadow, clip-path geometry, path data, layout, or color.
- Continue using `useArtworkTheme`; palette extraction runs once when artwork
  changes and updates existing Listen CSS variables.
- Dynamic Horizon maps the three layers to `--listen-wave`,
  `--listen-primary`, and `--listen-secondary` over Deep Charcoal.
- Keep personalization viewer-local. A room participant's visual choice must
  not enter room-authoritative state or affect another participant.
- Persist a versioned, allowlisted mode value in `localStorage`, synchronize it
  across same-origin tabs through the storage event, and fall back to Static
  Artwork when storage is unavailable or corrupt. Preserve an explicit stored
  animated choice rather than silently overriding it.
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
7. TASK-015A: make Static Artwork the default, mark continuous modes as higher
   power, preserve explicit user choices, and deploy the safety remediation.

## Remediation Batches

- **TASK-015A - Safe default:** release Static Artwork as the default and retain
  the animated variants only as explicit higher-power choices.
- **TASK-015A2 - Visibility controls:** make previews representative, add
  bounded intensity and dimming sliders, and preserve Static Artwork's lack of
  continuous motion. Keep minimum dimming visibly permissive across the room,
  content panel, and now-playing rail rather than only inside previews.
- **TASK-015B - Rendering experiment:** separately test one shallow,
  pre-rasterized wave surface and throttled motion. Do not ship it as the
  default unless it passes the same laptop benchmark.
- Keep GetSongBPM and tempo-aware motion blocked until an animated renderer
  meets the resource budget.

## Risks

- **False performance confidence:** automated DOM budgets cannot replace the
  laptop's active-playback A/B measurement.
- **Layer inflation:** previews and production visuals must never mount several
  continuously animated modes at once.
- **Motion accessibility:** reduced-motion and hidden-document states must
  freeze every new continuous animation.
- **Palette contrast:** artwork-derived colors remain decorative and may not
  reduce control or text contrast.
- **Over-bright artwork:** maximum intensity must retain dark-overlay control
  contrast and may not animate filters, blur, brightness, or opacity.
- **Storage drift:** unknown stored values must resolve to Static Artwork
  without breaking rendering.
- **License loss:** retain the source attribution and MIT notice with the
  adapted component.

## Acceptance Criteria

- Static Artwork is the default for users without a valid stored choice.
- Dynamic Horizon, Signal Ribbon, and Minimal Pulse are visibly identified as
  higher-power experiments and remain opt-in.
- An explicit valid stored choice remains selected after the default changes.
- Visual Intensity and Background Dimming are keyboard-operable, bounded, and
  persist locally across reload and same-origin tabs.
- Listen-room Personalization previews use the current artwork transiently;
  non-room surfaces use a local fallback asset without creating durable media
  state.
- Intensity and dimming changes update static presentation variables only and
  do not add animation layers or room-authoritative state.
- At minimum dimming, room, content-panel, and now-playing-rail scrims leave the
  selected visualization clearly visible behind readable foreground content.
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
- The default mode meets no more than 5% median and 10% peak using the same
  affected-laptop measurement method. Animated modes do not qualify as safe
  defaults until they meet that budget independently.

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
- The affected-laptop comparison and ordinary playback regression smoke test
  completed. Functional behavior passed, but all three animated variants
  failed the performance budget.
- Production comparison results showed that the first animated replacement
  failed its primary performance gate:

  | Visualization   | Median |   Mean | P95 | Peak | Result        |
  | --------------- | -----: | -----: | --: | ---: | ------------- |
  | Dynamic Horizon |    17% | 17.41% | 23% |  41% | Fail          |
  | Signal Ribbon   |    17% | 16.52% | 20% |  23% | Fail          |
  | Minimal Pulse   |    12% | 12.15% | 15% |  35% | Fail          |
  | Static Artwork  |     5% |  5.15% |  8% |   9% | Pass at limit |
  | Off             |     5% |  5.32% |  8% |   9% | Pass at limit |

- Dynamic Horizon matched the former waveform's 17% median despite reducing
  the animated element count from 96 to three. Its large translated SVG-mask
  surfaces remained expensive to rasterize and composite.
- Functional QA passed: pause returned every mode near idle, artwork colors
  changed between songs, natural transitions reset metadata correctly, queue
  counts advanced, and no playback or synchronization failure was observed.
- TASK-015A verification passed 362 repository tests, typecheck, ESLint,
  changed-file formatting, file-length policy, and the production build.
- Local browser QA confirmed the safe-first option order and power labels, one
  visible close control, no horizontal overflow, and no console warnings or
  errors at desktop and 390x844 mobile dimensions.
- An explicit stored Dynamic Horizon choice survived the default change. After
  selecting Static Artwork, that choice also survived reload.
- TASK-015A2 adds bounded 25-100 Visual Intensity and 35-85 Background
  Dimming preferences using versioned browser-local storage and same-origin
  change events. The values only feed static presentation variables.
- Account Personalization now previews the current Listen artwork when supplied
  by the room and otherwise uses the local Signal Aperture asset. Browser
  inspection confirmed four local fallback artwork previews, one visible close
  control, no horizontal dialog overflow, and zero running infinite preview
  animations with Static Artwork selected.
- TASK-015A2 local verification passed 363 repository tests, standalone
  typecheck, ESLint, changed-file formatting, file-length policy with zero
  violations, and the Next.js production build. Responsive live QA and the
  affected-laptop comparison remain release checks rather than local claims.
- Owner production QA found that previews were representative but the room's
  compounded foreground scrims still hid Static Artwork and animated modes at
  100% intensity and the 35% minimum dimming setting. The corrective calibration
  lowers only existing static scrim alpha budgets and adds explicit visibility
  ceilings; it adds no render layer, animation, filter, or API behavior.
- Corrective verification passed all 363 repository tests, standalone
  typecheck, ESLint, changed-file formatting, the file-length policy with zero
  violations, and the Next.js production build. Production room visibility
  remains the acceptance gate.
