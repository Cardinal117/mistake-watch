# TASK-019 Review Notes

## 2026-08-21 Planning Review

- **Documentation level:** Full packet. The task crosses a private extension
  boundary, realtime authority, a public SpacetimeDB table, and synchronized
  rendering.
- **Base:** `task/task-019-rhythm-publication`, rebased onto remote `main` after
  TASK-018 PR #5 merged as `f65d94c`.
- **Release dependency:** Satisfied before implementation continued. TASK-019
  does not contain an accidental stacked TASK-018 release.
- **Architecture decision:** Prefer exact-origin `externally_connectable` plus
  a long-lived port over a broad content script. Add a stable private extension
  ID and prove Opera GX behavior before shared-state work.
- **Privacy decision:** Local detailed visual frames may reach only the same
  captured tab. Shared room state contains stable timing metadata only.
- **Authority decision:** Host-only publication in the first release. Existing
  playback permission does not grant rhythm-publication authority.
- **Fidelity decision:** Do not synthesize a fake live spectrum for devices
  without detailed frames. Shared-tempo support is renderer-specific.
- **Testing:** New bridge, reducer, phase, and fallback behavior is test-first.
  Existing renderer behavior uses characterization-first coverage.
- **HTML:** Not created. Markdown is sufficient for this architecture review.

## Implementation Evidence

### Batch A - 2026-08-21

- **Test-first record:** The initial bridge suite failed 5/5 before the external
  connection existed. The website client shell then failed 4/4 while its
  implementation deliberately threw. Both were implemented only after those
  meaningful failures were recorded.
- **Stable identity:** Extension `0.6.0` uses a manifest public key whose derived
  ID is `gjhgbhjblbbpcpallbnpakijoheemgdb`.
- **Boundary:** Manifest candidates are limited to the two production aliases
  and local development hosts. Runtime validation additionally requires an
  exact approved origin, `/rooms/*`, and a top-level sender.
- **Lifecycle:** Approved pages stay dormant while capture is inactive. Only the
  captured tab receives normalized rhythm and bounded visual frames. Stop
  clears authorization, pending frames, and timers without requiring polling or
  page reconnect.
- **Backpressure:** One visual frame may be in flight per port. Newer frames
  replace pending work, ACK timeout releases the stream, and listener failures
  cannot permanently stall delivery.
- **Resource gate:** Offscreen-to-worker detailed visual delivery is enabled
  only while an authorized website port exists.
- **Independent review:** One read-only reviewer found inactive-connect,
  freshness, lost-ACK, async-disconnect, localhost-scope, one-sided port cleanup,
  and idle-forwarding gaps. Regression tests were added before each correction.
  The final follow-up review found no remaining security or lifecycle issue.
- **Focused tests:** 16/16 bridge and website-client checks pass.
- **Extension suite:** 61/61 tests pass.
- **Full suite:** 439/439 repository tests pass.
- **Repository checks:** TypeScript, ESLint, `git diff --check`, and file-length
  policy pass. File length reports zero violations and 15 pre-existing warnings.
- **Browser-real proof:** Chromium loaded the unpacked extension by stable ID;
  an approved `http://127.0.0.1:5371/rooms/*` page opened the named external
  port and received the inactive state without starting capture. The existing
  Rhythm Lab startup and renderer-switch check also passed.
- **Pending gate:** Load this exact working-tree checkpoint in Opera GX and
  verify inactive-to-captured activation, bounded visual delivery, stop to
  dormant state, navigation cleanup, and no extension network/storage output.
- **Scope:** No SpacetimeDB, Supabase, room authority, queue, recommendation,
  upload, renderer, commit, push, or deployment change is included in Batch A.

### Batch A Opera GX Revision - 2026-08-21

- **Gate verdict:** Revise at `e30d89c`. Active bounded rhythm/visual delivery,
  ACK backpressure, privacy, audio continuity, and navigation cleanup passed.
- **Finding:** After capture stopped, Opera GX retired the inactive Manifest V3
  service worker and disconnected the physical external port. Restarting
  capture could not resume delivery through that retired port.
- **Platform correction:** Chrome 114 and later do not extend a service-worker
  lifetime merely because a port is open. The product contract is therefore a
  durable logical bridge, not an immortal physical port.
- **Test-first record:** The website-client recovery test failed before the fix
  because an unexpected disconnect scheduled zero reconnect attempts. It now
  requires one bounded replacement connection and verifies explicit cleanup
  creates none.
- **Implementation:** Unexpected disconnect schedules recovery after 250 ms,
  1 second, and 5 seconds at most. A valid capture state resets the attempt
  budget. Explicit disconnect cancels recovery. There is no idle heartbeat or
  polling loop.
- **Pending gate:** Repeat only stop, at least 35 seconds dormant, restart,
  navigation cleanup, and console/network/storage checks using the logical
  bridge probe. Do not repeat renderer or detector qualification.
- **Local verification:** The corrected client test passes 6/6, the extension
  suite passes 62/62, and the full repository passes 440/440. TypeScript,
  ESLint, production build, changed-file Prettier, `git diff --check`, and the
  file-length policy pass with 15 pre-existing warnings. The browser-real
  approved-origin bridge smoke test passes 1/1.
- **Separate observation:** The laptop saw a natural-transition page error that
  read `title` from `undefined`. It is outside this bridge correction and needs
  separate product-intake reproduction rather than being swept into TASK-019.

### Batch A Opera GX Revision 2 - 2026-08-22

- **Gate verdict:** Revise at `2f50ca7`. The website created four replacement
  ports, but every port disconnected before receiving an inactive state. Both
  extension-action starts still reached PCM, proving capture and analysis were
  healthy while the logical website bridge remained unavailable.
- **Finding:** The extension registered the external port and then awaited an
  optional offscreen status lookup before posting its first message. With no
  active offscreen document, Opera GX could retire the newly started Manifest
  V3 worker during that await, so the website exhausted its bounded retries
  without ever receiving a valid state.
- **Test-first record:** A focused regression test failed with zero messages
  while the status promise was pending. It now requires the safe inactive
  envelope synchronously, before the optional lookup resolves.
- **Implementation:** Extension `0.6.1` posts the inactive state immediately.
  The later lookup may authorize only the matching captured tab, and a status
  revision prevents an older async result from replacing a newer worker event.
- **Scope:** No reconnect heartbeat, capture command, new permission, network
  path, persistence, SpacetimeDB, queue, room-authority, media, or renderer
  behavior is added.
- **Pending gate:** Reload exact extension `0.6.1` and repeat only initial
  inactive delivery, capture start, bounded rhythm/visual delivery, stop,
  40-second dormancy, restart, and navigation cleanup. Batch B remains blocked
  until this focused Opera GX gate passes.
- **Local verification:** Focused external-bridge tests pass 13/13, the complete
  extension suite passes 64/64, and the full repository suite passes 442/442.
  TypeScript, ESLint, production build, and the file-length policy pass with 15
  pre-existing warnings. Changed-file Prettier and `git diff --check` pass. The
  browser-real approved-origin probe receives the immediate inactive state.

### Batch A Promotion - 2026-08-24

- **Gate verdict:** Promote at exact SHA `3920005`, extension `0.6.1`. The
  detached laptop checkout remained clean and `git diff --check` passed.
- **Tested browser:** Opera One Stable `134.0.5954.66`, Chromium
  `150.0.7871.230`. This is the installed Opera build used for the gate, not an
  Opera GX-branded build; the result qualifies the Chromium extension lifecycle
  but does not claim separate Opera GX branding coverage.
- **Inactive contract:** The first connection immediately received exactly
  `active:false`, `hasSignal:false`, and `phase:idle`. No rhythm or visual frame
  arrived while inactive, and the valid state reset the reconnect budget.
- **Active contract:** Capture reached PCM. The original logical probe received
  active state, rhythm, and bounded visual frames without a page refresh. All
  7,372 observed visual frames were acknowledged.
- **Dormant recovery:** After stop and more than 40 seconds inactive, only one
  replacement connection occurred. Restart resumed delivery without refresh,
  retry exhaustion, a rapid reconnect loop, disconnected-port errors, or
  duplicate capture, Lab, or analysis sessions.
- **Privacy and cleanup:** Extension Network panels and storage remained empty.
  No PCM, URL, token, account, or room-secret payload was observed. Navigation
  stopped capture, cleared the badge, and left the Lab inactive.
- **Continuity:** Playback advanced naturally. The tested room retained its
  track, volume, participant state, and `1 / 181` queue position. Computer-use
  automation could not independently assess subjective echo or distortion.
- **Runner note:** The laptop's literal Node invocation passed 58/59 because its
  default runner rejected direct `.ts` loading. The same suite passed 64/64
  with that installed Node runtime's `--experimental-strip-types` support.
- **Outcome:** Batch A is complete. Batch B may begin with its existing
  test-first host-authority and shared-state boundary.

### Batch B Local Completion - 2026-08-24

- **Test-first record:** The initial authority, phase, wiring, and snapshot
  tests failed before the room-rhythm modules, generated bindings, subscription,
  and host publisher existed. A later provider-identity regression test also
  failed before the server parser was tightened to exact 11-character YouTube
  IDs and approved YouTube hosts.
- **Shared contract:** Added one public `room_rhythm_profile` row per room with
  only source type, opaque YouTube media ID, playback occurrence, BPM, interval,
  media-time beat offset, confidence, algorithm version, revision, and
  server-authored publish/expiry timestamps. No URL, detailed frame, energy,
  onset, account, participant, extension, or audio field enters shared state.
- **Authority:** Only the admitted current host whose Spacetime identity matches
  the participant can publish or clear. The reducer rejects inactive playback,
  non-YouTube sources, wrong room/media/occurrence, malformed or non-finite
  values, inconsistent BPM/interval pairs, low confidence, invalid TTL,
  out-of-order revision, excessive cadence, and stale clear requests.
- **Publication:** The Listen host publishes only while connected, authoritative,
  and playing the exact YouTube occurrence. Two sequential stable detector
  observations are required. Refresh is bounded to six seconds with a 12-second
  server expiry, and source changes are occurrence-safe.
- **Phase:** Capture-relative beat timing is mapped once to media time. Future
  participant renderers can reconstruct phase from the canonical playback clock
  without receiving PCM, spectrum, waveform, energy, or onset data.
- **Generated client:** Spacetime bindings, room-scoped subscription, snapshot
  mapping, listeners, and publish/clear client commands are wired. Explicit
  deletion clears the client snapshot instead of retaining a stale row.
- **Runtime proof:** An isolated local database admitted separate host and guest
  identities. A host publication appeared in both subscribed client caches, a
  guest replacement was denied, the exact revision remained unchanged, and a
  host stale-safe clear removed the row from both clients. The temporary
  database was deleted afterward.
- **Verification:** Focused Batch B checks pass 24/24. The complete repository
  suite passes 463/463 when run serially after the workstation restart. The
  default concurrent run had exhausted system RAM before assertions executed.
  TypeScript, ESLint, production build, Spacetime module build, changed-file
  Prettier, `git diff --check`, and file-length policy pass. File length reports
  zero violations and 15 pre-existing warnings.
- **Release boundary:** No Maincloud publish, Vercel deploy, Supabase change,
  production room mutation, renderer integration, commit, or push was performed
  for Batch B. Batch C remains the next implementation slice.

### Batch C Local Completion - 2026-08-24

- **Test-first record:** Capability fallback, browser animation-frame binding,
  visual-detail expiry, fixed-buffer reuse, and effective ambient fallback were
  each captured by failing tests before their corrections. Existing renderer
  behavior was promoted behind direct lifecycle characterization.
- **Visualization surface:** Personalization now offers Static Artwork, Off,
  Mirror Spectrum, Siri Ribbon, Dot Waves, Signal Bloom, and Constellation with
  explicit capability and power labels. Static Artwork remains the safe default.
- **Input boundary:** Mirror Spectrum and Signal Bloom consume bounded local
  companion detail only. Siri Ribbon, Dot Waves, and Constellation reconstruct
  deterministic input from the shared room rhythm profile. Detailed frames are
  never published into room state.
- **Capability fallback:** Missing or stale local detail and missing, mismatched,
  or expired shared rhythm fail closed to Static Artwork. The canvas and ambient
  backdrop use the same effective mode, so unavailable selections cannot leave
  contradictory visual state.
- **Runtime lifecycle:** The canvas host caps DPR at 1.25 and rendering at 24 FPS,
  owns one animation loop, pauses for hidden, paused, or reduced-motion states,
  reuses fixed input buffers, and disposes observers, renderers, subscriptions,
  and frames on mode changes or unmount.
- **Browser finding:** Local visual QA exposed an unbound browser
  `requestAnimationFrame` receiver. A regression test was added first, then the
  engine was corrected to call the global methods through their browser receiver.
- **Independent review:** A read-only reviewer identified stale local-detail
  capability, missing direct renderer characterization, ambient fallback drift,
  and per-frame array allocation. All four findings were corrected and covered
  before the final gate.
- **Browser QA:** The isolated app passed desktop and 375px Personalization QA.
  All seven options were present, all five canvas previews were nonblank, controls
  remained bounded, and the narrow page had no horizontal overflow.
- **Verification:** Focused correction checks pass 29/29 and the complete serial
  repository suite passes 471/471. TypeScript, ESLint, production build,
  changed-file Prettier, `git diff --check`, and file-length policy pass. File
  length reports zero violations and 15 pre-existing warnings.
- **Release boundary:** No commit, push, Maincloud publish, Supabase mutation,
  Vercel deployment, production room mutation, or Batch D laptop gate was
  performed for Batch C.
