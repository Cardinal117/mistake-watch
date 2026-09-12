# Aperture and branding inspection — proposal only

Inspected after Watch production promotion. Source remains in the standalone demo
at C:/Users/Admin/.codex/visualizations/2026/09/09/01a08559-7914-72b3-afba-eb8d469a99db/aperture-room-demo.
No prototype files or branding implementation were changed or deployed.

## Evidence

Read DESIGN, LOADING-REVIEW, WORDMARK-REVIEW, loading source, wordmark size and current
application brand exports/RoomTransitionOverlay. Opened navbar.html, looping.html,
and index.html at localhost:5386. Exercised Watch/Listen, navbar palette selection,
simulated ready, reduced-motion joining, Dynamic artwork mode and Watch transition.
Reviewed screenshots of desktop/compact navbar and loading/theme composition.
The original preview server stopped during inspection; restarted a localhost-only
Python static server for the same folder. No site publication or real room actions.

## Recommended order

1. Extract one shared aperture + wordmark component and use it in dashboard, Watch,
   Listen and account navigation. Follow room accents; keep neutral silver lettering.
   Mark-only on constrained mobile headers. Keep it static except mode transitions.
2. Replace the existing boxed orbit/sweep RoomTransitionOverlay with the approved
   flat aperture and precise status. Its current create/join/PendingLink/mode callers
   provide reuse. Unify connection and lazy-mode loading with one visibility owner.
3. Add the compact mark only inside a buffering stage after a brief delay, while
   preserving controls and YouTube visibility. Immediate hide on readiness; error
   states stop motion and retain Retry. No artificial minimum loading duration.
4. Bring the theme comparison ideas into existing appearance settings as a separate
   approved slice: Dynamic/presets/custom with clear primary/secondary colour roles.
   Reuse current room theme state; do not copy the demo's browser-only persistence.

Keep row/discovery/metadata skeletons and real upload/conversion progress. Do not
add an animated logo to each card or queue item.

## Production prerequisites

- Actual standalone SVG is 507,016 bytes. It is a detailed trace, not a production
  asset budget pass. Optimize and visually compare at real 32/36px navbar scale;
  preserve approved contours/bevels and small accents. Cache shared assets.
- Extract pure geometry and a lifecycle-aware component from embedded scripts.
  The looping demo always chooses Listen on completion: production must use the
  actual requested/canonical mode. Demo timings are illustrative, not room authority.
- Demo requestAnimationFrame continues even after ready/reduced motion; production
  should cancel idle/unmounted work and handle hidden tabs without catch-up jumps.
- Preserve reduced motion, stable layout, accessible status and interruptible
  transitions; no cyclic screen-reader announcements or stacked loaders.
- Existing components/brand/index.ts exports signal-aperture-brand.tsx; another
  similarly named mark file exists. Integrate at the used export and audit callers
  to avoid parallel brand implementations.

Recommended next approved slice: shared optimized brand component + navbar adoption,
then room-transition loading. No changes to playback authority or queue behavior.
