# State and visual design

## Persistent ownership

Place a small client transition provider/host beneath app/layout.tsx so it survives route navigation and Watch/Listen layout replacement. Keep the root layout server-rendered. A room adapter at RoomExperience publishes room facts; individual buttons only request operations. The host renders one full-viewport presentation. It neither owns playback nor duplicates useLiveRoom.

Use the same lightweight aperture fallback in room-route Suspense for direct entry/streaming before hydration. After hydration, that fallback registers a reason with the persistent host and suppresses its own visual. No second full-screen renderer. Route errors/not-found and cancellation explicitly end or fail the associated transition. Check installed Next loading/error guides before implementation. Do not treat generic pathname change or a prefetch as room readiness.

## State model

idle -> pending (anti-flash grace) -> visible -> revealing -> idle
pending/visible -> failed
any active state -> cancelled/superseded -> appropriate current state

Each operation stores local generation ID, connection epoch, room ID, kind, requested destination, prior confirmed mode, started time and a palette snapshot. Independent facts: operation outcome, observed live mode, admission/subscription readiness, destination shell readiness. Frame animation state is derived from these facts; it never writes application state.

Same-tab second switch is disabled while pending. Remote mode changes or navigation may supersede the destination. Ignore old generation/room/connection-epoch callbacks. React StrictMode repeated effects and teardown must be idempotent. Avoid transient missing-session flashes during delete/insert updates; require an actual coherent snapshot.

## Completion gates

| Operation | Ready when |
|---|---|
| Initial/joined room | Current connection epoch has subscription applied, accepted local membership/join result and initialized clock, coherent live session, destination shell committed |
| Local mode switch | Request completed successfully AND a non-optimistic live snapshot matches destination AND that destination shell committed |
| Remote member sees mode change | Current confirmed live mode is observed and matching shell committed; there is no local request promise to await |
| Leave / return to dashboard | Navigation destination committed; do not wait for room media or a subscription that is being disposed |
| Create/join submit | Submission resolves to destination and then room readiness gates pass; validation failure returns to the form with entered values preserved |

Current connectionReadiness becomes ready at socket connection, ahead of admission/subscription. Add a separate presentation readiness signal without silently changing sync behavior or trusting seeded/stale snapshots. Publish confirmed live mode from subscription-derived data. Implementation removes optimistic mode writes entirely; immediate feedback belongs to the persistent loading host. A reducer resolving is not enough: unauthorized reducers may no-op. No server request-ID/revision field exists for mode changes; do not pretend local operation IDs provide transactional acknowledgements. Observed current state convergence plus operation success is the available completion contract.

Destination shell readiness is emitted by the mounted layout for its generation/mode after required shell controls exist. It must not depend on optional catalogue, avatars, artwork, queue metadata, autoplay permission or audio becoming audible. Avoid deadlock: mount the destination beneath the overlay so it can report ready. The loading wrapper must not key/remount the player on phase or palette changes.

## Failure and recovery

- Request rejection/denial: retain the authoritative room presentation, show the confirmed destination/current-mode error and usable Back/Retry where appropriate.
- Durable success/live failure: do not silently report complete or issue compensating writes. Keep the confirmed live layout, expose the mode error and let the user retry through the normal mode control; reserve connection retry for terminal connection failure.
- Retry uses a new generation/connection epoch and the normal permission checks; do not overlap unresolved server writes. A timeout is not evidence that an operation was cancelled on the server.
- PendingLink cancellation/same-route/hash-only navigation: do not create a permanent pending state. Preserve modified clicks/new tabs. Route commit, failure and history navigation release the correct token.
- Existing connection retry limits remain authoritative. Proposed presentation thresholds: at 8s show a calm still-working hint and Back; at 20s show recoverable timed-out status with animation stopped. Late confirmed readiness may still settle the current generation. Permit Retry only once the prior request has settled or a fresh connection safely supersedes it.
- Access removal/deletion/sign-out beats animation and displays the existing access/error path, never an endless spinner. Loader errors must not swallow app errors.

## Full-screen composition and motion

Use fixed full-viewport dark themed backdrop, centered approved flat aperture with independent secondary ring, destination heading and one precise status line. No inner bordered loading card, sweep or multiple decorative orbits. Support safe areas and short landscape; recovery controls may scroll if enlarged text requires it.

An explicit mode request covers the old layout immediately with the themed background. Reveal the animated mark after a short ~150ms grace to avoid a spinner flash on fast readiness. Initial server fallback can show a static branded shell immediately. If ready fast, release immediately; do not force the 650ms/850ms prototype cycle. For visible mode changes close, swap the hidden symbol once, reopen; repeated waiting retains destination icon. The ring reflects unresolved work, never percent progress. On ready, stop loop and use a ~150ms opacity reveal without blocking controls after readiness; reduced motion removes that fade. Final timings are visual QA targets, not network timers.

Default navbar is still; mode changes animate once. Cancel obsolete frames and timers on supersession, ready/error, hidden tab and unmount. On tab return derive current state, not accumulated animation time. Reduced motion: static open destination mark, no spinning ring or pulses. One polite status announcement per meaningful state, never per frame.

While blocking, mark the content region inert, manage focus inside the overlay's recovery controls and restore focus to the matching destination mode tab or room heading. Never restore to removed DOM. Expose aria-busy/status and a meaningful label; decorative SVG hidden from assistive technology. Avoid two modal focus owners. Native video fullscreen may require an overlay inside its fullscreen element or a deliberate exit before a mode transition; native PiP/TV paths get explicit characterization coverage, not assumed document-overlay coverage.

## Theme integration

Use a normalized brand palette adapter over existing --listen-primary, --listen-secondary and background values, for both Watch and Listen. Silver wordmark remains neutral; Watch lettering uses primary hue preserving bevel luminance; tiny details use secondary; leaves primary and room icon secondary. Preserve original gold/blue fallback when no room context exists. Navbar reference takes precedence over older mechanical-demo role copy.

Coordinator snapshots outgoing resolved colors before layout unmount. Retain them until matching destination room/source palette is available, then a restrained color transition. Ignore stale image results; never delay readiness for image load. Missing/CORS/failed artwork uses existing deterministic fallback. A room/source key prevents old-room colors leaking after navigation. Dashboard settles to default brand colors rather than retaining the last room indefinitely. Portaled full-screen content receives explicit palette values, since ancestor CSS variables do not automatically follow portals.

Reuse existing brightness/intensity/dimming preferences; map roles once. Validate contrast after adjustment, keep text neutral and center silhouette visible even if accents match. Respect reduced motion during color changes. Do not serialize private room/source data into new storage or fetch artwork again just for the logo. Direct SSR entry uses deterministic default styling until client palette is ready, avoiding hydration mismatch.

## SVG delivery

Extract real prototype geometry and contours, not a new font. Use stable unique SVG mask/gradient IDs for multiple instances. Optimize the 507016-byte trace and compare tiny details at 32/36px and zoom in all palettes. Prefer grouped shared color rules/memoized geometry over recoloring hundreds of paths each animation frame. Keep wordmark out of full-screen loader critical path; share/cache it and render only the visible responsive variant where feasible. No new runtime dependency is assumed. Record raw/transfer size and theme-change costs; loss of fidelity is a release blocker, not an optimization tradeoff to conceal.
