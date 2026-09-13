# Planned implementation order

Status: Steps 1-7 implemented and locally verified, 2026-09-13. See qa.md. Not committed or deployed.

1. Establish behavioral red/characterization baselines and save approved asset/reference comparisons. Inspect local Next loading/layout/error guides.
2. Extract shared aperture/wordmark and palette adapter in components/brand; resolve competing exports. Validate geometry/fidelity, motion cleanup and size before navbar adoption.
3. Implement pure transition state model plus persistent provider/host in components/ui and root client boundary. Introduce separate presentation-readiness and confirmed-mode observations at the live-room adapter, with no server schema changes.
4. Wire RoomExperience layout-ready callbacks and mode requests. Replace component-local pending overlays; test both local/follower transitions and failure/cancellation first.
5. Wire route/create/join/leave/connection/Suspense/error paths to the same host, removing duplicate full-screen surfaces. Keep real progress and content skeletons.
6. Adopt shared dynamic navbar in dashboard, Watch and Listen with compact mark-only behavior; integrate palette handoffs and theme fallbacks. Keep fullscreen/TV intentional exceptions.
7. Run matrix in acceptance-criteria.md, inspect responsive visuals, optimize only with fidelity proof. Update DESIGN.md and release/handoff docs with actual evidence after implementation.

Likely touch points: app/layout.tsx and scoped room loading/error boundaries; components/brand/*; components/ui/room-transition-overlay.tsx and pending-link.tsx; components/room/room-experience.tsx, mode-switcher.tsx and listen/header/header-tools.tsx; watch/watch-room-header.tsx, listen technical/mobile headers; dashboard forms/nav; lib/spacetime live-room observation adapter; brand/transition styles; focused tests.

Do not edit unrelated Listen recommendation/recording-review changes. Preserve intake Quick Capture; this direct user-request packet does not reclassify earlier items.
