# TASK-019 Design

## Trust Boundaries

1. **Captured audio:** remains inside the extension audio graph.
2. **Local visual data:** `VisualFrameV1` may cross only a browser-local
   extension port into the same captured Mistake Watch tab. It is transient.
3. **Shared room data:** only a stable `RoomRhythmProfileV1` may enter
   SpacetimeDB. The reducer treats all browser and extension values as
   untrusted.
4. **Authority:** only the active authoritative host identity may publish or
   clear the room profile.

## Extension-To-Site Bridge

- Add a stable private extension ID using the manifest public `key` mechanism.
- Add `externally_connectable.matches` only for the two production aliases and
  localhost/127.0.0.1 development origins.
- The website maintains one named logical bridge to the known extension ID.
  A physical port may be recreated after Manifest V3 retires an idle service
  worker; this recovery is event-driven and bounded rather than polled.
- The service worker accepts `onConnectExternal` candidates only from approved
  top-level room pages. A candidate remains dormant until its `sender.tab.id`
  matches the captured tab; only that authorized port receives rhythm or
  detailed visual data.
- The website cannot start capture through the port. The toolbar action remains
  the explicit user gesture.
- Port messages are versioned and normalized. Status and scalar rhythm may be
  replayed on connect. Detailed visual frames are pushed at no more than the
  existing 24 FPS and dropped under backpressure.
- Stop clears authorization, queued visual data, and acknowledgement timers but
  leaves the approved page logically dormant so a later toolbar capture can
  activate it without polling. An unexpected worker-side disconnect schedules
  bounded client recovery. Navigation, tab close, page unload, or explicit
  client cleanup releases the connection and cancels recovery. Extension
  restart uses the same recovery path; extension removal exhausts it safely.
- The offscreen document forwards detailed visual frames to the service worker
  only while an authorized website consumer exists.

Chrome documents exact-origin webpage connections through
`externally_connectable`, long-lived two-way `runtime.connect` ports, and the
manifest public key for a consistent development extension ID:

- https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/manifest/key

## Shared Contract

`room_rhythm_profile` is one public row per room:

```text
room_id
source_type = youtube
media_id
playback_occurrence_id
bpm
beat_interval_seconds
media_beat_offset_seconds
confidence
algorithm_version
revision
published_ms
expires_ms
```

It contains no URL, title, extension ID, account identity, participant detail,
audio data, frequency data, or energy telemetry.

The publish reducer must:

- authenticate the current sender as the room's authoritative host;
- require an active YouTube source and exact playback occurrence;
- derive and compare the active YouTube media ID server-side;
- enforce finite field ranges, BPM/interval consistency, confidence threshold,
  algorithm length, monotonic revision, server timestamps, and bounded expiry;
- reject or safely ignore stale, out-of-order, rate-excessive, and wrong-source
  updates.

Public SpacetimeDB tables are client-readable but remain reducer-only for
writes. Reducer caller identity is supplied by `ctx.sender`; existing room
participant checks remain the authority pattern:

- https://spacetimedb.com/docs/tables/access-permissions/
- https://spacetimedb.com/docs/functions/reducers/reducer-context/

## Phase Mapping

The detector beat lattice is expressed in capture time. The host website maps
it once into media time using the active player position when a fresh frame is
received. Beats then occur at:

```text
media_beat_offset_seconds + n * beat_interval_seconds
```

All participants reconstruct current beat phase from the authoritative room
playback position. The profile is usable only while its media ID, playback
occurrence, algorithm version, and expiry match current state.

Publication requires two consistent locked observations and is refreshed at a
low bounded cadence. A source change invalidates the profile by occurrence
mismatch even if explicit cleanup is delayed.

## Renderer Behavior

- Static Artwork remains the default and Off remains available.
- Mirror Spectrum and Signal Bloom require local `VisualFrameV1` for truthful
  full fidelity. Without it, the UI explains that the companion is required and
  falls back to Static Artwork.
- Siri Ribbon, Dot Waves, and Constellation may consume shared BPM/phase on
  participants without local detailed frames after visual QA proves the result.
- Every animated mode stops when playback is paused, the document is hidden,
  reduced motion is requested, the source/profile is stale, or the component is
  unmounted.
- React state must not update at 24 FPS. Canvas delivery is imperative and
  bounded to one renderer loop.
- Existing intensity, dimming, artwork, and power-warning behavior is reused.

## Failure States

- Extension absent: no error toast; Static Artwork continues.
- Extension installed but capture inactive: show a quiet inactive status only
  where visualizer settings already live.
- Detector unlocked or low confidence: do not publish; retain local visuals.
- Host publication denied: keep local visuals and expose one actionable status.
- Profile stale or source changed: participants fall back immediately.
- Spacetime disconnected: no publication attempts or retry storm.

## Release Order

1. Merge TASK-018 through a reviewed PR.
2. Ship private extension `0.6.0` for exact-SHA Opera GX bridge QA.
3. Publish the compatible SpacetimeDB schema/reducers and regenerate bindings.
4. Deploy the website integration to Vercel production.
5. Run host, participant, guest, no-extension, and resource QA before closing.
