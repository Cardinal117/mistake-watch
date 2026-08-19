# Mistake Watch Audio Companion

Private Manifest V3 rhythm companion for trusted Mistake Watch users. Phase 1
proved that Opera GX can expose audio-only tab PCM to an offscreen AudioWorklet
while captured audio remains audible. Phase 2 adds a focused first-party beat
detector. Phase 3 connects that bounded contract to an isolated Mirror Spectrum
and Siri Ribbon review lab without changing the production website.

This is not a public extension package and does not contain a production website
bridge or room-wide rhythm synchronization.

## Boundaries

- Capture starts only after clicking the extension action on an approved
  Mistake Watch tab.
- Only the current tab's audio is requested; video is disabled.
- Captured audio is routed back to the default output so playback remains
  audible.
- A silent AudioWorklet branch derives bounded RMS, peak, onset, band energy,
  tempo, confidence, interval, and phase values inside the extension.
- Tempo combines onset intervals with autocorrelation candidates and retains an
  established pulse when a later candidate appears at half or double time.
- The extension emits only `RhythmFrameV1`; no raw PCM or FFT arrays leave the
  worklet.
- The review lab reconstructs bounded display arrays from `RhythmFrameV1`
  scalars. They are visual approximations, not exported analyser samples.
- No PCM, FFT data, URL, account data, or playback data is uploaded or stored.
- Navigation, tab closure, capture termination, a second action click, and
  extension unload stop the capture graph.
- No website, room, queue, SpacetimeDB, Supabase, or player code is involved.

## Load In Opera GX

1. Copy or pull this repository onto the test laptop.
2. Open `opera://extensions`.
3. Enable Developer mode.
4. Select **Load unpacked**.
5. Choose the `extensions/watch-audio-companion` directory.
6. Pin **Mistake Watch Audio Companion** to the toolbar.

## Capture Check

1. Open an approved Mistake Watch room and start audible YouTube playback.
2. Click the extension action once.
3. Confirm the badge changes from `...` to `ON`, then to `PCM` after a
   non-silent signal is observed.
4. Confirm the private Rhythm Lab opens once and begins in Mirror Spectrum at
   the 24 FPS cap.
5. After a steady rhythmic section, hover the `PCM` badge. A locked estimate
   shows BPM and confidence; quiet or ambiguous audio may remain unlocked.
6. Confirm the lab readout and Mirror Spectrum respond without exposing raw
   audio data. Switch to Siri Ribbon and repeat.
7. Confirm playback remains audible at the expected level without an echo or
   doubled signal.
8. Use the lab's Stop capture command or click the action again from the Watch
   tab. Confirm the badge clears and playback remains under
   the ordinary tab path.

The lab includes a deterministic 120 BPM fixture for renderer-only measurement.
Fixture mode does not start tab capture. It is intentionally not persisted.

An `ERR` badge indicates capture startup failed. Hover over the action for the
bounded error message and inspect the extension service worker from
`opera://extensions` for technical details.

## Lifecycle Check

Repeat capture while testing each condition separately:

- Pause and resume the YouTube player.
- Move to another tab for 30 seconds, return, and confirm capture has neither
  stopped nor duplicated while hidden.
- Click the action to stop and restart three times.
- Navigate the captured tab to another page.
- Close the captured tab.
- Disable or reload the extension while capture is active.

After every stop condition, confirm tab audio is normal, the badge is clear,
and Opera reports no continuing tab capture. Reload the extension before the
next condition when testing extension disable or reload.

## Phase 1 Laptop Evidence

Opera GX Phase 1 passed on 2026-08-19: PCM, audible output, pause/resume, three
stop/restart cycles, hidden-tab operation, navigation and tab-close cleanup,
extension reload cleanup, a clean worker console, no observed extension network
activity, and intact playback/queue continuity.

A brief audible dip occurs when capture starts or stops. A possible tiny volume
increase was subjective and unconfirmed. Phase 2 laptop QA must compare the same
steady song segment before, during, and after capture. Prefer a system-loopback
recording and report RMS or LUFS delta; target no more than 0.5 dB steady-state
change and no new clipping. Record the transition dip separately because it is
not a steady-state gain measurement.

## Local Verification

From the repository root:

```powershell
node --test tests/extensions/watch-audio-companion.test.mjs
node --test tests/extensions/beat-detector.test.mjs
node --test tests/extensions/rhythm-visualizer.test.mjs
npx prettier --check "extensions/watch-audio-companion/**/*.{js,json,md,mjs}" "tests/extensions/watch-audio-companion.test.mjs"
```
