# TASK-005 Mobile PWA Playback Brain Dump

## Raw Intent

The mobile site should feel more like an app and should support better mobile listening/watch usability. The key user question was whether a web app or similar mobile treatment could allow music to keep playing in the background and make the website easier to use on phones.

## Product Direction

- Make Mistake Watch installable and app-like on mobile.
- Improve mobile room controls, queue access, audience/chat surfaces, and account access.
- Add Media Session API support so supported browsers can expose lock-screen/notification playback controls.
- Treat first-party direct media/R2 playback as the realistic path for background audio.
- Do not promise unrestricted background playback for YouTube iframe media.

## Constraints

- Mobile browser behavior differs across iOS Safari, iOS installed web apps, Chrome Android, Samsung Internet, and other WebViews.
- YouTube iframe playback is subject to provider and browser restrictions.
- iOS may throttle or suspend JavaScript, timers, and WebSocket activity when backgrounded.
- Background playback should be validated per media source type.
- This task should not replace the existing room architecture or SpacetimeDB sync authority.

## Important Product Boundary

PWA support improves installability, ergonomics, and native-feeling controls. It does not automatically grant native-app-level background execution.

