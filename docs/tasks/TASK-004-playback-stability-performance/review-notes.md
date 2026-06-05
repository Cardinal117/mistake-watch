# Review Notes: Playback Stability and Listen Performance

## Assumptions Made
- The mobile stutter is caused primarily by the YouTube non-controller correction branch being stricter than the normal listen-mode policy.
- The old-song spike is caused by the two-step autoplay transition and old-source iframe events during handoff.
- Performance sluggishness is meaningfully affected by hidden drawer/sidebar render cost, long queue rows, metadata hooks, thumbnails, and animations.

## Resolved Decisions
- Use an atomic SpacetimeDB autoplay reducer as the preferred clean fix.
- Split implementation into two major concerns:
  - playback transition stability;
  - listen-mode performance.
- Follow game-design style visibility rules: hidden content should not render unless needed.
- Disable heavy waveform/background visuals on mobile by default.
- Preserve existing functionality and visual direction.

## Questions For Review
- Should manual `playQueueItemNow` also become atomic in the same reducer pass, or only autoplay first?
- Should queue virtualization use a dependency or a small custom fixed-row window?
- What mobile device/browser should be considered the minimum QA target first: iOS Safari, Android Chrome, or both?

## Decisions To Confirm Later
- Exact listen-mode YouTube follower drift threshold.
- Whether the visible "Preparing next" language should change to "Next ready" after the transition guard lands.
- Whether performance measurement should become a recurring QA checklist item.

## Possible Simplifications
- If virtualization is too risky for queue controls, first lazy-mount the drawer and cap visible rows with "show more" while preserving controls.
- If atomic reducer is too large for the first slice, add it only for autoplay and leave manual play as-is until follow-up.
- If mobile waveform disabling needs rapid implementation, start with CSS media queries before adding intersection observers.

## Implementation Notes
- No implementation has started in this task packet.
- SpacetimeDB CLI can be called directly at `C:\Users\Admin\AppData\Local\SpacetimeDB\spacetime.exe` if `spacetime` is not on PATH.
- Production SpacetimeDB publishes should use `--break-clients --yes=remote` only after local publish and tests pass.

## Verification Notes
- Required after implementation:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - relevant player, queue, YouTube, and SpacetimeDB tests
  - local SpacetimeDB publish
  - browser QA with desktop host plus mobile guest without playback permission
  - production publish/deploy only with explicit user approval
