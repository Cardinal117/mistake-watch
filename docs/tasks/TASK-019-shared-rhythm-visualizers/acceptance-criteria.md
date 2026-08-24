# TASK-019 Acceptance Criteria

## Bridge And Privacy

- Capture still requires the extension toolbar user gesture.
- Only exact approved Mistake Watch origins can open the external port.
- Approved top-level room pages maintain one logical dormant bridge and receive
  an immediate inactive state before optional offscreen status lookup. Rhythm
  and detailed visual data are delivered only to the captured top-level tab. If
  Manifest V3 retires the idle service worker, the website restores the bridge
  with bounded event-driven retries.
- No PCM, audio track, media stream, cookie, token, invite, email, participant
  data, URL, detailed visual frame, onset, or energy value enters network or
  persistent storage.
- Detailed `VisualFrameV1` values never enter SpacetimeDB or HTTP responses.
- Stop releases capture authorization, queued visual data, capture resources,
  and renderer loops while leaving the approved page logically dormant.
  Navigation, tab close, page unload, and explicit client cleanup release the
  connection and cancel reconnect timers. Extension restart uses the same
  bounded recovery path; extension removal exhausts it safely.

## Realtime Authority

- Only the active authoritative host can publish or clear room rhythm.
- Guest, stale identity, wrong room, wrong media, wrong occurrence, expired,
  out-of-order, non-finite, out-of-range, and rate-excessive updates are denied
  or safely ignored.
- The public row exposes only the approved stable rhythm contract.
- One row exists per room and consumers require exact occurrence/media match.
- Source transition and expiry cause immediate client fallback.
- No reducer failure mutates playback, queue, permissions, or participants.

## Product Behavior

- Static Artwork remains the default with no extension dependency.
- The host can see companion unavailable, inactive, detecting, locked, and
  stale states without a request loop.
- Full-fidelity Mirror Spectrum and Signal Bloom activate only with local
  detailed frames; the fallback is honest and nonblank.
- Shared-tempo modes reconstruct the same beat phase from room playback on two
  participants within a perceptually acceptable tolerance.
- Pause, hidden page, reduced motion, stale profile, and unmount stop motion.
- Renderer switching creates no duplicate canvas or animation loop.
- Existing playback, queue, likes, recommendations, room authority, uploaded-
  catalogue privacy, Listen/Watch continuity, and Media Session behavior remain
  intact.

## Performance

- Static Artwork remains within its established safe baseline.
- Bridge idle state performs no polling, heartbeat, or animation work. Recovery
  attempts occur only after a real disconnect, use bounded backoff, and stop on
  explicit cleanup.
- Shared rhythm publication is low cadence and cannot form a retry storm.
- Visual frames are capped at 24 FPS with drop-under-backpressure behavior.
- Experimental modes retain their measured labels; promotion does not imply
  they meet the Static Artwork budget.

## Required Evidence

- Meaningful failing tests precede production bridge and reducer code.
- Focused extension bridge, protocol, phase, reducer, and fallback tests pass.
- Spacetime build and generated bindings pass.
- Full `npm test`, typecheck, ESLint, file-length, Prettier, and production build
  pass.
- Browser-real local bridge and two-client local room tests pass.
- Exact-SHA Opera GX and production multi-device QA are recorded.
- Extension Network/storage panels and room responses show no forbidden data.
