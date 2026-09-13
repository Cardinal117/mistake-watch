# Acceptance and QA plan

Original QA matrix below. Executed checks and explicit limits are recorded in qa.md; this matrix is not itself a claim that every live/device scenario was exercised.

## Test-first behavior gates

1. First browser red: delay mode action and lazy layout independently. Click Listen-to-Watch; assert one full-screen loading surface survives the outgoing component disappearing, never declares ready on optimistic mode, and releases after confirmed matching destination mount. Existing outgoing-local loader/skeleton should fail for this behavior, not a fixture error.
2. State tests: permutations of promise, confirmed snapshot and mount events; older generation ignored; remote switch without local promise; disconnect/reconnect epoch; immediate-ready; cancellation; operation timeout and late response; permission no-op; partial durable/live failure. Use event outcomes, not source-string assertions.
3. Theme tests: palette mapping, missing/failed artwork, stale results, portal transfer, same-accent contrast, no readiness dependency on images. Use the current extraction contract rather than duplicating it.
4. Characterize existing mode switch/playback lifecycle, queue, permissions, autoplay, volume and connection retries before refactoring. No new seeks, duplicate providers or media controls emitted by animation.

Record baseline revision, exact test, command, intended failing assertion, then same final test green. No fabricated first-pass or red/green claims.

## Browser scenario matrix

- Both directions, cached/cold bundles; fast/slow action and subscription separately.
- Two fixture clients: host switch reflected by follower, follower cannot request unauthorized switch; remote override and authority loss while pending.
- Direct entry, create/join validation, failed admission, retry, leave, browser Back/Forward, modified click, same-route link, deleted room and sign-out.
- Missing session/clock/membership at socket connection must not reveal a falsely ready room; reconnection cannot use prior epoch evidence.
- Chunk error/retry and unresolved optional discovery/artwork: error stays actionable; optional work never traps screen.
- Source changes while loading, buffering, autoplay blocked, paused and empty queue: room loading finishes without waiting for media playback. No provider masking.
- Rapid requests, request finishes after route change, timeout then late confirmation, StrictMode mounts and duplicate readiness callbacks.
- Keyboard focus, inert underlying controls, screen-reader labels, reduced motion, hidden-tab resume, high zoom and safe areas.
- Desktop 1920x1080 and 1440x900; tablet 1024x768 and 768x1024; mobile 390x844 and 360x640; short landscape 844x390; 200% zoom. No missing compact logo, overflow or unreachable recovery controls.
- TV/fullscreen/PiP characterization: no unexpected window or fullscreen change on unrelated palette/loading updates.

## Visual and performance review

Side-by-side approved navbar/wordmark and loop reference. Check contours, silver shading, tiny colored accents, center icon upright, no extra card/sweep, correct frame at interruption, static idle/reduced motion. All brand defaults and representative red, blue, yellow and difficult dark/same-accent palettes. Asset size/caching and no duplicated hidden heavy DOM. Instrument animation lifecycle: no scheduled rAF after idle/error/unmount; no work in hidden tabs. Measure ready-to-reveal and verify no mandatory full-cycle wait.

Use deterministic local fixtures to induce errors/slow states. Do not change the owner's active room merely to manufacture failures. A two-real-device audio test remains owner confirmation if lifecycle behavior changes; fixture success is not audio proof.

## Release gate (after implementation approval)

Targeted tests, existing affected room/queue/permission suites, typecheck, lint, file-length gate, production build and visual review. Document evidence/remaining limits. Git/deployment need their applicable approval and must exclude unrelated recording-review work. No database or Spacetime publish is planned. Before claiming completion, verify all adopted surfaces, not just the standalone demo.
