# Playback timing inspection — 2026-09-12

Scope: code inspection, existing focused tests and controlled timing simulation.
No application changes, hosted mutations, playback actions or deployment.
Related existing report: product-intake/items/MW-BUG-006-host-refresh-playback-drift.md.

## Findings

1. **Manual startup lacks the automatic-next readiness handshake.**
   `lib/spacetime/use-live-room.ts:371` selects a queue item and immediately sends
   playing at position zero. Watch and Listen Next/Previous use this method.
   Ordinary Play also publishes playing directly. The progress bar extrapolates
   canonical time independently of local media readiness. A three-second load
   therefore advances the target to three seconds before sound starts.
   Automatic YouTube advance alone uses prepare/start reducers and waits for the
   initiating player's PLAYING callback (`use-live-room.ts:433`,
   `lib/youtube/prepared-autoplay.ts`). This is not a room-wide readiness barrier:
   a slower follower can still load behind the initiating device.

2. **Clock jitter can bypass YouTube correction damping.**
   `lib/spacetime/live-room/clock.ts` estimates offset as local receive time minus
   server reducer time. It includes one-way transport delay. Each valid new sample
   replaces the previous estimate (`use-room-connection.ts:140`). A device with
   500ms delivery delay targets 450ms behind one receiving after 50ms, even with
   correct device clocks. These are controlled input examples, not measured users.
   `lib/youtube/correction-gate.ts:16` treats an adjusted timestamp shift over 500ms
   as a new command, bypassing the ordinary 2.5-second settling period and 2-second
   playing-drift deadband. A simulation using the actual production functions
   confirmed an 850ms timestamp jump permits an 850ms backward seek one second
   after the previous application. Repeated jitter can repeat this mechanism;
   perpetual audible jolting has not been reproduced on real devices here.

3. **Existing protections are useful but do not promise subsecond alignment.**
   YouTube periodic correction runs every 750ms, normally suppresses playing seeks
   within 2 seconds, waits 2.5 seconds after a correction and allows buffering 8 seconds
   before another attempt. Stable offsets inside that deadband can persist.
   The source/status and visibility resync paths use a separate 750ms threshold.
   A late-loading player may therefore seek while catching up even though routine
   periodic corrections are damped.

## Authority and provider constraints

Independent reviewer also confirmed a native-player correction gap:
`components/room/direct-media-player.tsx:363` applies corrections every750ms without
checking seeking/readiness or waiting for a previous seek to settle. Direct Watch
seeks above350ms drift; direct Listen above750ms. A slow seek that leaves the
reported position stale can therefore trigger another seek and play command on
each tick. This proves a command-repetition risk, not a measured audible glitch.

SpacetimeDB owns the canonical position, status and update timestamp. Authorized
host/controller actions write that timeline; it is not a continuous host-audio
stream or sample-by-sample host clock relay. Each device extrapolates the target
locally and corrects its own player. Sharing a Google account does not eliminate
device-specific buffering, clock estimation, autoplay or background-tab limits.

Separate Spacetime identities support concurrent devices for one room member.
If two connections reuse the same identity/token, join replaces the previous
identity session (`spacetime/src/room-participation.ts:182`). Permissions are
member-level; there is no separate per-device controller arbitration here.
Conflicting authorized commands are serialized by the server. Same-account
multi-device behavior needs its own test; Google identity alone is not a clock.

Direct Watch currently allows rate correction up to 6% for small drift; direct
Listen and YouTube do not use that smoothing path. Do not assume arbitrary tiny
YouTube speed adjustments work: unsupported rates are rounded toward 1, and a
requested rate change is not guaranteed. Seeks may land at a preceding keyframe.
Official reference: https://developers.google.com/youtube/iframe_api_reference

## Recommended fix sequence

1. Unify explicit Play/Next/Previous/Play Now with occurrence-scoped preparation;
   anchor the room start only after playback readiness, with cancellation and
   timeouts. Define a bounded readiness policy for present followers and late
   joiners; one unavailable device must not hold everyone indefinitely.
2. Separate command revision from estimated clock offset. Use measured round-trip
   clock samples with outlier rejection and gradual offset adjustment; avoid
   reinterpreting arrival jitter as a seek command. Network asymmetry still limits
   exact clock estimation.
3. Consolidate correction paths, buffering/seek-in-flight guards, sustained-drift
   thresholds and cooldowns. Use small pitch-preserving native rate adjustments
   where supported, ramp back to 1, and use a provider-aware YouTube fallback.
   Do not substitute coarse, audible YouTube speed jumps for small seeks.
4. Verify host/guest and same-account devices under delayed loading, jitter,
   repeated skip, reconnect, buffering and background/resume. Measure actual
   player time versus target, correction frequency and lost opening time.

## Evidence

58 existing focused sync, direct replay, prepared autoplay, queue transition and
clock/reconnect tests pass. Temporary `.tmp/playback-audit-proof.mjs` runs the
production sync/clock/gate functions and confirms the three-second startup target,
450ms delivery-dependent clock difference and 850ms gate bypass described above.
These tests establish code behavior; real embedded audio and cross-device
perceptual quality still require controlled browser/device QA.

One GPT-5.6-sol medium reviewer independently inspected correction, clock and
device identity paths. Their37 focused tests pass (overlapping the root suite;
do not sum totals). Missing coverage includes delayed native seeks, repeated
latency-jitter sequences and same-account multi-device playback. The reviewer
confirmed the clock/gate findings and supplied the native repeated-seek finding.
