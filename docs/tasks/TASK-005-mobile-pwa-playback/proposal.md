# TASK-005 Mobile PWA Playback Proposal

## Problem

Mistake Watch works as a mobile website, but mobile users need a more app-like experience: easier room navigation, reliable compact controls, installability, and better media controls when the browser supports them. Users also expect music to continue when the screen locks or the app is backgrounded, but that expectation is only technically reliable for some media paths.

## Goal

Create a mobile/PWA foundation that improves installability, mobile room usability, and supported background/lock-screen media behavior without making unsupported claims about YouTube or mobile OS limitations.

## User Value

- Faster access from the phone home screen.
- Cleaner mobile room controls with less browser chrome.
- Better lock-screen/notification controls where supported.
- More predictable behavior for direct/R2 media.
- Clear fallback messaging when background playback is not supported for a source.

## Scope

- Audit current manifest and installability.
- Add or refine service worker/PWA shell behavior only where it is safe.
- Add Media Session API integration for current title, artist/source, artwork, and playback actions.
- Improve mobile room surface ergonomics for watch/listen rooms.
- Add visibility/background handling so reconnect/resync behavior is deliberate.
- Document supported vs limited behavior by media source.

## Not In Scope

- Native iOS/Android app.
- Capacitor wrapper.
- YouTube background playback guarantees.
- Offline media downloads.
- DRM or restricted provider playback.
- Replacing SpacetimeDB live sync.
- Cloudflare Stream transcoding.

## Risks

- iOS may suspend background JavaScript and WebSocket updates.
- YouTube iframe behavior may block background playback regardless of PWA status.
- Service worker caching can accidentally cache dynamic room/auth responses if scoped too broadly.
- Lock-screen controls must not let guests mutate room state without permission.

## Success Criteria

- The site is installable where browser support allows.
- Mobile room controls remain usable in standalone display mode.
- Media Session metadata updates for active direct/R2 and YouTube sources where possible.
- Direct/R2 media background behavior is tested on at least one Android browser and one iOS browser/device path.
- Unsupported background behavior is surfaced honestly, not hidden.

