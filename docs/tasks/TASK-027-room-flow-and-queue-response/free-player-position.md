# Watch mini-player free positioning

Approved 2026-09-07: replace four-corner snapping with free placement on desktop and mobile; deploy for owner QA after local checks. Keep the existing provider, controls, visual tokens, compact/minimized behavior and Cinema/fullscreen. Drag uses the existing handle and stays where released. Arrow keys move in small increments. Clamp to usable viewport above mobile navigation and within safe insets; re-clamp after resize, rotation or player size changes. Cancelled gestures restore their starting position. No room commands or provider remounts from movement. Do not add Listen changes or persistence across browser sessions.

Verification: failing free-placement browser case before implementation, desktop/mobile bounds, keyboard, cancellation, minimize/restore, Cinema and media element identity; relevant regressions, typecheck/lint/build. Production deployment is explicitly authorized; preserve previous deployment as rollback.

## Local QA

Baseline browser cases failed because releasing snapped to corners. Final free placement, keyboard, cancellation, resize and element continuity cases pass. Added browser touch-input coverage in 844x390 landscape. 35 relevant browser checks pass across browse-first, docking, YouTube continuity and 320px through 1920px responsive flows. Typecheck, scoped lint and file-length policy pass (0 violations, existing warnings retained). Desktop, portrait and landscape screenshots inspected. Real-device owner acceptance follows deployment.

Movement changes only local geometry; no provider reload, room reducer, database or backend change. The old short-landscape side-panel rule was superseded for the mini-player so touch movement remains available after rotation.
