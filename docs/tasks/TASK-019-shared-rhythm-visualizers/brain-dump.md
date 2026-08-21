# TASK-019 Brain Dump

## Owner Intent

- Move the promoted private companion visualizers from Rhythm Lab into the
  actual Mistake Watch Listen room.
- Keep capture explicit, local, private, and optional.
- Let one authoritative host analyse a YouTube song and share stable beat timing
  so compatible visualizers can align for participants without the extension.
- Preserve Mirror Spectrum, Siri Ribbon, Dot Waves, Signal Bloom, and
  Constellation, including honest warnings for expensive modes.
- Keep Static Artwork as the safe default.

## Proven Inputs

- TASK-018 `0.5.1` passed Opera GX capture, detector, local visual frames,
  renderer lifecycle, audio continuity, and privacy QA at `b60bc69`.
- `RhythmFrameV1` contains bounded scalar rhythm data. `VisualFrameV1` contains
  fixed-size transient spectrum and waveform bytes for local visual fidelity.
- SpacetimeDB already owns room playback state, host identity, permissions, and
  `playback_occurrence_id`.
- The website currently ships Static Artwork, Off, and three CSS visual modes;
  it does not receive companion data or expose the promoted canvas renderers.

## Questions Resolved

- Use a long-lived Manifest V3 external connection restricted to exact Mistake
  Watch origins instead of a broad content script.
- Keep detailed visual frames local to the captured tab. Publish no FFT,
  waveform, onset, or energy stream to the room.
- Restrict shared rhythm publication to the authoritative host in the first
  release. Delegated analysers are future work.
- Bind every shared profile to the active YouTube media ID and playback
  occurrence. Stale profiles must be ignored even if cleanup is missed.
- Do not promise full Mirror Spectrum or Signal Bloom fidelity on devices that
  lack local visual frames.

## Unknowns To Prove

- Opera GX support for webpage-to-extension `runtime.connect` with
  `externally_connectable` and a stable private extension ID.
- Practical bridge latency when converting detector phase into media-relative
  beat offset.
- Which shared-tempo renderers remain visually convincing on the target laptop
  without detailed frequency frames.
