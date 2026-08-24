# Mistake Watch Audio Companion

Private Manifest V3 rhythm companion for trusted Mistake Watch users. Phase 1
proved that Opera GX can expose audio-only tab PCM to an offscreen AudioWorklet
while captured audio remains audible. Phase 2 adds a focused first-party beat
detector. Phase 3 connects that bounded contract to an isolated five-renderer
review Lab without changing the production website. Phase 3C replaces the
scalar display approximation with a compact, direct local visual stream.
TASK-019 Batch A adds a private exact-origin bridge and a website client library
without adding room-wide synchronization or production renderer wiring.

This is not a public extension package and does not contain room-wide rhythm
synchronization.

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
- The AudioWorklet emits only `RhythmFrameV1`; no raw PCM leaves the worklet.
- A native offscreen `AnalyserNode` separately reduces the captured signal to
  48 frequency bytes and a 96-point waveform envelope at no more than 24 FPS.
- Detailed visual frames are pushed directly to the internal Rhythm Lab and,
  while authorized, the same captured top-level Mistake Watch tab. They are
  transient, sequence ordered, ACK bounded, and never enter storage, network
  requests, or room synchronization.
- No PCM, visual frame, URL, account data, or playback data is uploaded or
  stored.
- Capture termination or a second action click stops the capture graph and
  leaves an approved website page logically dormant. Manifest V3 may retire
  the inactive service worker and its physical port; the website client
  restores that bridge with bounded event-driven retries. Navigation, tab
  closure, page unload, and explicit client cleanup release the connection.
  Extension restart uses the same bounded recovery path.
- The website cannot start capture through the bridge. No room, queue,
  SpacetimeDB, Supabase, or player authority is involved.

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
6. Confirm Mirror Spectrum and Signal Bloom react promptly with distributed
   musical detail rather than three broad synthetic regions. Smoke-check the
   remaining modes without repeating the complete lifecycle matrix per mode.
7. Confirm playback remains audible at the expected level without an echo or
   doubled signal.
8. Use the lab's Stop capture command or click the action again from the Watch
   tab. Confirm the badge clears and playback remains under
   the ordinary tab path.

The lab includes a deterministic 120 BPM fixture for renderer-only measurement.
Fixture mode does not start tab capture. It is intentionally not persisted.

Power classifications remain visible in the Lab and are not performance-pass
claims:

- Mirror Spectrum and Dot Waves: beta, very high power.
- Siri Ribbon and Signal Bloom: experimental, high power.
- Constellation: experimental, extreme power.

All modes default to 24 FPS. Static Artwork remains the production-safe website
default.

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

## Phase 3 Evidence

Phase 3A passed on Opera GX with Mirror Spectrum and Siri Ribbon at 24 FPS. The
`0.3.1` cleanup retest completed three start/stop cycles and navigation teardown
with a clean service-worker console, audible output, and unchanged playback and
queue state.

Phase 3B adds bounded Dot Waves, Signal Bloom, and Constellation modes in version
`0.4.1`. The patch release restores the lifecycle contract for the default
Mirror Spectrum and Siri Ribbon renderers after the initial `0.4.0` Opera GX
gate exposed a startup crash. Local deterministic desktop and 390-pixel checks are nonblank,
overflow-free, and console-clean. The Opera GX renderer-only and combined-load
gate remains required before Phase 3B promotion.

Phase 3C version `0.5.1` adds the local visual-fidelity bridge. Mirror Spectrum
and Signal Bloom now consume native analyser detail through direct internal
messages while the BPM detector and privacy boundary remain unchanged. This
phase requires one focused Opera GX visual, lifecycle, and short resource gate;
it does not authorize a website or SpacetimeDB bridge.

## TASK-019 Batch A

Version `0.6.1` adds a stable private extension ID and named logical website
port. Only approved production aliases and development port `5371` can connect
from a top-level `/rooms/*` page. An approved page may receive an inactive state
while dormant, but rhythm and detailed visual data are authorized only when its
tab is the captured tab. The website cannot send a capture command.

The extension posts the bounded inactive state before querying the optional
offscreen capture status. This keeps a newly created Opera GX port usable when
the Manifest V3 worker starts without an offscreen document. If Opera retires
the physical port later, the website recreates it with bounded event-driven
backoff; no heartbeat or polling loop is used.

Visual delivery allows one frame in flight, keeps only the newest pending
frame, and recovers after a missing ACK. The offscreen document forwards visual
frames to the worker only while an authorized website consumer exists. Batch A
does not mount production Listen renderers and does not publish anything to
SpacetimeDB.

## Local Verification

From the repository root:

```powershell
node --test tests/extensions/watch-audio-companion.test.mjs
node --test tests/extensions/beat-detector.test.mjs
node --test tests/extensions/rhythm-visualizer.test.mjs
node --test tests/extensions/audio-companion-client.test.mjs tests/extensions/external-bridge.test.mjs tests/extensions/external-bridge-backpressure.test.mjs
npx playwright test tests/e2e/extension-external-bridge.spec.ts --workers=1
npx prettier --check "extensions/watch-audio-companion/**/*.{js,json,md,mjs}" "tests/extensions/watch-audio-companion.test.mjs"
```
