# TASK-019 Implementation Batches

## Batch A: Contract And Bridge Gate

Testing mode: **test-first**.

Status: **complete**. Local Chromium checks and the exact-SHA Opera lifecycle
gate passed for extension `0.6.1`. The logical bridge restores bounded delivery
after idle worker retirement and capture restart without a page refresh.

1. Add failing tests for exact-origin external ports, captured-tab matching,
   version normalization, no remote capture start, frame bounds, backpressure,
   reconnect, and cleanup.
2. Add a stable private extension ID and external connection manifest boundary.
3. Implement the service-worker port registry and bounded status/rhythm/visual
   delivery to the captured tab only.
4. Add a small website client that reports unavailable, inactive, detecting,
   locked, stale, and disconnected states without polling, and restores the
   logical bridge after unexpected Manifest V3 worker termination.

Checkpoint: local extension tests, browser-real bridge startup, privacy scan,
and exact-SHA Opera GX bridge proof. No SpacetimeDB change yet.

## Batch B: Host-Authoritative Room Rhythm

Testing mode: **test-first** because this changes realtime authority and shared
state.

Status: **complete locally**. The bounded public profile, host-only reducers,
generated client, room subscription, snapshot mapping, stable detector gate,
and deterministic media-clock phase mapping pass focused, full-suite, build,
and isolated two-client SpacetimeDB verification. Production publication is
reserved for Batch D's approved release order.

1. Add failing contract and reducer tests for host acceptance, guest denial,
   sender mismatch, wrong media/occurrence, bounds, rate limit, revision,
   expiry, clear, and stale-row behavior.
2. Add `room_rhythm_profile`, publish/clear reducers, generated bindings, room
   subscription, snapshot mapping, and client types.
3. Add pure phase-mapping and stable-publication selectors with deterministic
   clock tests.
4. Connect publication only when the host is admitted, connected, playing a
   YouTube occurrence, and the detector has stable confidence.

Checkpoint: Spacetime module build/generate, focused authority tests, two-client
local sync, and proof that no detailed frame enters room state.

## Batch C: Listen Room Renderers

Testing mode: test-first for capability/fallback state and characterization-
first for promoted renderer behavior.

1. Establish characterization coverage for the promoted renderer contract.
2. Add the canvas host adapter without driving React state at frame cadence.
3. Add Mirror Spectrum, Siri Ribbon, Dot Waves, Signal Bloom, and Constellation
   to the existing visualization preference surface with truthful capability
   and power labels.
4. Use local detailed frames for full-fidelity modes and shared room rhythm for
   only the modes that pass the deterministic participant check.
5. Preserve Static Artwork fallback, intensity/dimming settings, reduced
   motion, pause, hidden state, mobile bounds, and renderer cleanup.

Checkpoint: desktop and narrow browser QA, no-extension fallback, one-loop
instrumentation, and focused screenshot comparison with the approved showcase.

## Batch D: Release Gate

1. Run the full repository gate and changed-file formatting/file-length checks.
2. Load the exact extension SHA on the Opera GX laptop.
3. Publish SpacetimeDB before the website deployment.
4. Deploy Vercel production and test one host plus one participant without the
   extension, then one participant with the extension.
5. Record CPU/GPU for Static Artwork, one shared-tempo mode, Mirror Spectrum,
   and Signal Bloom. Do not repeat the entire TASK-018 lifecycle matrix.

Checkpoint: owner promote/revise/reject verdict. Commit, PR, merge, SpacetimeDB
publish, and Vercel deployment each remain explicit release actions.
