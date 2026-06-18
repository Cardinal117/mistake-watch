# TASK-005 Mobile PWA Playback Acceptance Criteria

## Functional

- The site can be installed as a PWA where supported.
- Installed launch opens the dashboard or intended start URL without redirect loops.
- Media Session metadata updates when active media changes.
- Play/pause lock-screen controls work for supported direct/R2 media.
- Room playback permissions still gate room-state mutation.
- Passive viewers can locally resume playback if browser autoplay policy requires a gesture.

## Mobile UI

- Watch and listen rooms fit mobile viewport constraints in standalone mode.
- Bottom controls remain reachable and do not overlap safe-area areas.
- Queue sheet remains usable on mobile.
- Audience/chat remains readable and does not hide critical transport controls.

## Background Behavior

- Direct/R2 background behavior is tested and documented.
- YouTube background behavior is tested and documented as limited if restricted.
- Returning from background resyncs to canonical room state without replay loops.

## Security

- Service worker does not cache private/auth/dynamic room responses.
- Media Session action handlers do not bypass member permissions.
- Guest-first access remains intact.

## Must Not Break

- Existing dashboard guest flow.
- Google account sign-in.
- SpacetimeDB room sync.
- Queue reducers and permissions.
- Current watch/listen desktop layouts.

