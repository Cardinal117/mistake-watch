# Shared room branding and full-screen loading

Status: Implementation approved and completed locally on 2026-09-13. Full packet because this is a cross-layout, asynchronous UI lifecycle change. See qa.md for verification and remaining owner device checks. Not committed or deployed.

## Outcome

A faithful, dynamically colored SVG navbar and one coherent full-screen room-loading experience. Watch/Listen switching must not lose its loader when the outgoing layout unmounts, flash an unrelated skeleton, show an incorrect destination or trap the user behind an endless animation.

## Included in the next milestone

- Extract/optimize approved aperture and detailed wordmark; use one shared brand implementation.
- Dashboard and room navigation adoption, including Listen and compact mark-only layouts. Account surfaces inherit the shared navigation where present, not a new duplicate navbar inside panels.
- Full-screen create/join/open/leave, connection and Watch/Listen transition presentation; one visibility coordinator surviving route/layout changes.
- Real readiness signals, cancellation/failure/retry, accessibility, reduced motion, hidden-tab and rapid-event handling.
- Reuse current room artwork palette and appearance intensity/dimming preferences; default identity palette outside room context. Correct missing/stale palette behavior.
- Update DESIGN.md to the approved SVG/contextual color contract during implementation.

## Separate follow-ups

- Custom per-player buffering animation: design-compatible but not a full-screen room-loading blocker in this milestone.
- New preset/custom color editor, canonical-color-lock toggle, account-synced themes or shared-room theme ownership: separate settings scope. No new controls/persistence promised here; current dynamic palette is integrated now.
- No playback synchronization changes, queue/recommendation changes, auth/RLS/migrations, remote-browser work, favicon redesign or provider masking.

Keep existing skeletons for content and real progress for imports/uploads. Do not create two live players to conceal a transition. Preserve current playback lifecycle; baseline any existing mode-switch remount behavior before asserting continuity improvements.

## Key risk

Current mode mutation writes durable mode and then the live reducer sequentially. This is not atomic. A loader cannot fix this by declaring failure rollback successful. On partial failure reconcile/display confirmed live state and offer recovery; do not automatically compensate the database or claim both stores agree. Broader durable/live reconciliation remains separate unless required for safe completion, in which case amend scope first.

## Delivery

One implemented milestone with internal verification gates in tasks.md and evidence in qa.md. Git/deployment remain the next release step; no hosted change is claimed.
