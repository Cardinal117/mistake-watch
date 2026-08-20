---
id: TASK-018
status: in-progress
type: compact-task
related: [MW-FEAT-006, MW-FEAT-007, TASK-015, MW-BUG-009]
created: 2026-08-19
updated: 2026-08-20
---

# Private Local Audio Companion Extension Prototype

## Objective

Prove that an optional, privately installed Chromium extension can capture the
user-approved Mistake Watch tab, derive rhythm features with a focused
first-party detector, and drive selected TASK-015B visualizers without
uploading audio or making the website depend on an external BPM provider.

This task starts only after TASK-015B records its final laptop benchmark and
owner classification. High-power visualizers may remain owner-approved
experimental modes without being misreported as performance passes. TASK-018
must not interrupt or expand the active renderer testing run.

## Scope

- Build an isolated Manifest V3 research extension for a user-invoked current-
  tab capture session.
- Validate the minimum permissions and active user gesture required by Chromium.
- Preserve audible tab output while analysis is active.
- Process mono PCM locally through an AudioWorklet-backed first-party
  `BeatDetector` rather than the website main UI thread.
- Derive onset energy or spectral flux, peaks, inter-onset intervals,
  autocorrelation candidates, normalized tempo, and beat-phase alignment.
- Produce a bounded versioned contract containing BPM, beat interval, beat
  offset, confidence, onset, bass, mids, highs, and energy.
- Connect the contract to Mirror Spectrum and Siri Ribbon first in an isolated
  review surface. Dot Waves, Signal Bloom, and Constellation follow as
  owner-approved experimental integrations; Dot Waves should concentrate its
  reactive field toward the visual center.
- Measure extension plus analyser plus renderer cost on the affected Opera GX
  laptop.
- Record Chrome, Edge, and especially Opera GX capability differences without
  claiming unsupported compatibility.

## Exclusions

- No production Mistake Watch component, room, queue, recommendation, account,
  Supabase, SpacetimeDB, upload, or playback-authority change.
- No GetSongBPM or other external BPM service.
- No Native Web Audio integration for direct or uploaded media; MW-FEAT-007
  preserves that separate future direction.
- No Electron, native messaging host, WASAPI, microphone capture, stream
  download, media extraction, or server-side audio processing.
- No captured PCM, FFT frame, or source audio may be transmitted or persisted.
- No Essentia.js, general music-information-retrieval package, or remotely
  loaded executable analysis code.
- No extension-store publication, public distribution, or claim of YouTube
  policy compliance. This task targets trusted private users only.
- No durable room-wide rhythm synchronization in this prototype.

## Decisions

- Extension support is optional enhancement, never a prerequisite for normal
  playback or room participation.
- Static Artwork remains the safe default. Animated visualizers are explicit
  opt-in experimental modes with honest high-power labeling until future
  optimization demonstrates otherwise.
- Capture begins only after a clear user invocation and stops immediately when
  the user disables it, the tab closes, capture ends, or the extension unloads.
- The first implementation proves the Opera GX capture and audible-output path
  before adding the focused detector. It does not begin with sophisticated DSP.
- The detector is deliberately narrow: it seeks a stable perceptual pulse for
  animation rather than catalogue-grade music analysis across every time
  signature and tempo transition.
- The website-facing boundary contains numerical features only and is explicitly
  versioned so the analyser can change without coupling visualizers to it.
- Stable tempo and phase may become a later room-shared contract. Live energy
  bands stay local during this task; they are not streamed through SpacetimeDB.
- A later integration must treat extension output as untrusted, host-authorized
  input and reject stale media generations. That integration is not authorized
  here.
- YouTube-specific experimentation remains private and reversible.

## Capability And Policy Matrix

| Area                | Current conclusion                                                                                              | Prototype consequence                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Chromium capture    | `tabCapture` requires explicit extension invocation                                                             | Start only from a deliberate extension action                              |
| Audible output      | Captured tab audio must be routed to an `AudioContext` destination                                              | Prove normal audible playback before analysis                              |
| Manifest V3         | Chrome 116+ permits a service-worker stream ID to be consumed by an offscreen document                          | Use service worker orchestration and one offscreen audio owner             |
| Offscreen lifecycle | Offscreen documents require an explicit reason and cleanup; only `chrome.runtime` messaging is available there  | Keep capture, output routing, worklet, and teardown in a bounded lifecycle |
| Permissions         | `tabCapture` and `offscreen` own capture; `activeTab` narrowly validates and targets the user-invoked Watch tab | No `tabs`, host permissions, `<all_urls>`, microphone, or interception     |
| Opera GX            | Opera accepts Chromium extensions, but exact API parity is not proof                                            | Load unpacked and test on the affected Opera GX laptop                     |
| DSP                 | The required pulse contract does not justify a general MIR dependency                                           | Implement and fixture-test a focused first-party detector                  |
| Distribution        | The owner requires trusted private installation                                                                 | Do not optimize scope around extension-store submission                    |
| YouTube             | Private local feature extraction is not a claim of policy approval                                              | Keep research private, reversible, and audio-free outside the device       |

Primary references:

- [Chrome tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [Chrome offscreen documents](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Opera extensions](https://help.opera.com/en/latest/customization/)
- [YouTube API Services developer policies](https://developers.google.com/youtube/terms/developer-policies)

## Prototype Rhythm Contract

The private prototype emits one bounded local frame. `beatOffsetSeconds` is the
phase relative to the analyser's current source timebase: beats occur at
`beatOffsetSeconds + n * beatIntervalSeconds`. A later production bridge must
calibrate that offset to the authoritative media timeline before sharing it.

```ts
type RhythmFrameV1 = {
  version: 1;
  sequence: number;
  sampledAtSeconds: number;
  bpm: number | null;
  beatIntervalSeconds: number | null;
  beatOffsetSeconds: number | null;
  confidence: number;
  onset: number;
  bass: number;
  mids: number;
  highs: number;
  energy: number;
};
```

- `sequence` increases monotonically for one capture session.
- `sampledAtSeconds` is a finite non-negative source-time value.
- `bpm` is `null` while unlocked, otherwise `40-240`.
- `beatIntervalSeconds` is `null` while unlocked, otherwise `0.25-1.5`.
- `beatOffsetSeconds` is `null` while unlocked, otherwise greater than or equal
  to zero and less than `beatIntervalSeconds`.
- `confidence`, `onset`, `bass`, `mids`, `highs`, and `energy` are finite values
  clamped to `0-1`.
- Consumers ignore unknown versions, non-finite values, regressions in sequence,
  and frames older than the agreed stale timeout.

Only the stable tempo subset may be proposed for the later room integration:
algorithm version, media identity, playback generation, BPM, beat interval,
media-timeline beat offset, confidence, revision, and expiry. Live onset and
energy bands remain extension-local during TASK-018.

## Implementation Order

1. Finish and record the active TASK-015B laptop matrix and owner classification.
2. Build an Opera GX capture lifecycle spike with no analyser and prove PCM is
   available while normal audio continues to reach the user.
3. Verify stop, restart, navigation, tab close, hidden state, and extension
   unload cleanup before adding DSP.
4. Add the focused detector and deterministic 60, 90, 120, 128, and 160 BPM
   fixtures, including half-time and double-time candidate checks.
5. Connect Mirror Spectrum and Siri Ribbon through the versioned local contract,
   then exercise the remaining owner-selected experimental modes.
6. Run three controlled Opera GX laptop measurements separating capture-only,
   detector-only, renderer-only, and combined overhead.
7. Decide whether to reject, revise, or promote the extension into a separately
   approved host-synchronization task.

## Implementation Progress

Phase 1 is implemented under `extensions/watch-audio-companion/` as an isolated
private Manifest V3 extension:

- The toolbar action accepts only the two production Watch origins or local
  HTTP development hosts and requests audio-only tab capture.
- The service worker transfers the user-approved stream ID to one offscreen
  document. The offscreen audio graph routes the captured source directly to
  the output destination so tab audio remains audible.
- A silent AudioWorklet branch calculates only bounded RMS, peak, and processed
  frame counts. It proves local PCM availability without transmitting or
  persisting samples.
- Stop, navigation, tab closure, capture termination, extension unload, failed
  startup, and repeated stop paths have bounded cleanup.
- The extension has no host permissions, storage permission, content script,
  web-accessible resource, or network-capable extension CSP.

Phase 1 was accepted on the owner-priority Opera GX laptop on 2026-08-19. The
badge repeatedly reached `PCM`; captured audio remained audible without detected
echo; pause/resume, three stop/restart cycles, hidden-tab operation, navigation,
tab closure, extension reload, playback, and queue continuity passed. Navigation,
tab closure, and extension reload cleared capture state. The service-worker
console remained clean and no extension network activity was observed. Source
and CSP inspection confirmed that only bounded probe telemetry crossed internal
extension messaging and no PCM samples were stored or uploaded.

The laptop operator observed a brief audio dip when capture starts or stops and
a possible tiny steady-state volume increase that could not be confirmed by ear.
The dip is a non-blocking Phase 1 caveat. Phase 2 laptop QA must objectively
compare the same steady song segment before, during, and after capture, targeting
no more than 0.5 dB RMS or LUFS steady-state change and no new clipping. Capture
transition behavior must be reported separately from steady-state level.

Phase 2 now adds a focused first-party detector inside the existing silent
AudioWorklet branch. It uses a small time-domain filter bank, positive band-energy
flux, adaptive onset detection, inter-onset interval consensus, autocorrelation
candidates, established-pulse half/double folding, and phase estimation. The
worklet emits only bounded `RhythmFrameV1` values and retains the Phase 1 audible
audio graph. Renderer and website integration have not started.

Automated evidence recorded on 2026-08-19:

- `node --test tests/extensions/watch-audio-companion.test.mjs`: 8 passed.
- `npm test`: 385 passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run check:file-lengths`: 0 violations; all new Phase 1 source and test
  files are below 250 lines. Existing warnings are outside this task.
- Changed-file Prettier check: passed.
- `npm run build`: passed.
- Source scan found no extension network, storage, content-script, microphone,
  video-capture, broad host, or web-accessible-resource surface.

Phase 2 local evidence recorded on 2026-08-19:

- Deterministic 60, 90, 120, 128, and 160 BPM fixtures lock within 1.5 BPM.
- Jitter, autocorrelation-candidate, half/double folding, phase-bound, contract-
  validation, freshness, and out-of-order tests pass.
- The extension CSP and source remain free of network and persistence APIs.
- The service worker receives only bounded state transitions rather than every
  analyser frame; raw PCM and FFT arrays remain inside the worklet.
- `npm test`: 398 passed; typecheck, ESLint, changed-file Prettier, file-length
  policy, `git diff --check`, and the production build passed.

Phase 2 passed its owner-priority Opera GX laptop gate on 2026-08-19 at commit
`e54ee777e89a94fa96432f6c82abd712fb4d6566`:

- Purpose-built 60, 120, and 160 BPM metronome sources resolved to 60.1, 120.2,
  and 160.1 BPM. Error remained at or below 0.2 BPM, no half/double mistake
  occurred, and every estimate stayed unchanged during its 60-second window.
- Confidence measured 88%, 87%, and 53%. The accurate but lower-confidence
  160 BPM result remains a Phase 3 presentation and fallback consideration.
- Aggregate Opera CPU median did not increase between playback-only and active
  capture plus detector. Aggregate GPU median increased by 4.81 percentage
  points and must be measured again with each renderer.
- Audio remained audible without detected echo, clipping, distortion, or
  sustained speed change. Objective RMS/LUFS parity remains blocked; the brief
  activation/deactivation dip remains a recorded caveat.
- Lifecycle, cleanup, privacy, bounded-message, queue, playback, and authority
  checks passed. The extension and repository were left clean and inactive.

Phase 3 now connects the local contract to an internal extension Rhythm Lab:

- Mirror Spectrum and Siri Ribbon consume only reconstructed bounded display
  arrays derived from `RhythmFrameV1`; no PCM or FFT arrays leave the worklet.
- One Canvas, a 1.25 DPR cap, 24/30 FPS controls, hidden/reduced-motion stops,
  stale-frame fallback, and reusable signal buffers bound renderer cost.
- A non-persisted 120 BPM fixture separates renderer-only measurement from the
  combined capture, detector, and renderer path.
- The lab is an internal extension page, opens after explicit capture, adds no
  host permission, content script, network surface, storage, website bridge,
  or room synchronization.
- Local desktop and 390-pixel visual checks passed for both renderers. Live
  input without the extension falls back to an inactive static state.

Phase 3A received a **Revise** verdict on the owner-priority Opera GX laptop at
commit `35454a35e7072d35ae9c5dc6ffc56a0e3f67d735`. Mirror Spectrum and Siri
Ribbon both passed the 24 FPS functional, lifecycle, privacy, audio, and
aggregate resource checks. Mirror remains the safer default because Siri's 30
FPS GPU increase reproduced. Repeated capture cleanup exposed one service-worker
race when the offscreen receiver disappears between the existence check and
`getStatus()`. The cleanup completed, but the warning violates the clean-console
gate. See [Phase 3A Opera GX gate](phase-3a-opera-gx-gate.md).

The missing-receiver revision is now implemented test-first. The new lifecycle
test failed against the original warning path, then passed after the worker made
only that known terminal condition idempotent while preserving warnings for
unexpected failures. All 28 extension tests, all 406 repository tests,
typecheck, ESLint, formatting, file-length policy, and the production build pass.
Production integration and Phase 3B remain blocked until three Opera GX
start/stop cycles pass with a clean service-worker console. See the linked gate
record for exact red/green evidence.

## Risks

- Opera GX may differ from Chrome in extension APIs, permission surfaces, or
  offscreen-document behavior despite Chromium compatibility.
- Tab capture can interrupt audible output unless the captured stream is routed
  correctly to an output AudioContext.
- Ads, notifications, and other sounds in the captured tab can distort rhythm
  analysis.
- Quiet introductions, syncopation, half-time feel, and tempo changes can delay
  or destabilize a 15-30 second estimate. Low-confidence output must remain
  provisional rather than forcing incorrect phase.
- An analyser and animated visualizer can jointly exceed the laptop resource
  budget. Experimental owner approval does not convert a failed measurement
  into a performance pass.
- Capture and output routing introduce latency that must be accounted for when
  aligning beat phase with the website playback clock.
- A future shared result can be stale or malicious unless room authority,
  playback generation, bounds, revision, and expiry are enforced.
- Broad extension permissions would create unnecessary trust and review risk.

## Acceptance Criteria

- Capture requires explicit user action and uses only documented minimum
  permissions.
- Opera GX either passes a recorded capture test or is explicitly marked
  unsupported; Chromium similarity is not accepted as proof.
- Tab audio remains audible while analysis is active.
- No audio samples, FFT frames, credentials, cookies, browsing history, or
  participant data are sent over the network or written to storage.
- The numerical rhythm contract is versioned, bounded, and contains no media
  URL, provider token, title, account identity, or room membership data.
- Contract fields use explicit units and ranges, and stale or out-of-order
  updates are rejected by sequence and timestamp.
- BPM, phase, onset, and energy behavior are tested against deterministic local
  fixtures before any YouTube experiment.
- Starting, stopping, navigating, and unloading leave no capture track,
  AudioContext, worker, worklet, timer, or animation loop running.
- Paused and inactive CPU returns near the established Static Artwork baseline.
- Capture-only, detector-only, renderer-only, and combined overhead are reported
  separately. Experimental visualizers retain their measured high-power status;
  no result is relabeled to satisfy the safe-default budget.
- The normal website and playback path remain unchanged when the extension is
  absent.
- The prototype remains privately installed and is not packaged for a public
  extension store.

## Evidence To Record

- Browser/API capability and permission matrix.
- Extension manifest and permission review.
- Capture-only audible-output and PCM proof on Opera GX.
- Network proof that captured audio and analysis frames remain local.
- Deterministic-fixture accuracy and lifecycle results.
- Three-run Opera GX CPU, GPU, memory, frame-cadence, active, and paused table.
- Cleanup tests for stop, navigation, tab closure, and extension unload.
- Per-renderer experimental classification, including the safe default.
- Explicit owner decision to reject, revise, or promote the prototype.

## Separately Approved Follow-Up

If the private prototype is promoted, create a separate production task for a
small extension-to-site bridge and host-authoritative rhythm publication. That
task may allow one authorized analyser to publish stable `mediaId`, BPM, beat
offset, confidence, algorithm version, and playback generation through
SpacetimeDB. Participants would reconstruct beat pulses from the synchronized
room playback clock without requiring the extension. Continuous PCM, FFT,
onset, or energy-frame streaming remains excluded unless separately justified.
