# Notes: Home Page

## Role In Product
This reference now works best as the visual foundation for the Mistake Watch dashboard: cinematic, premium, and discovery-oriented, while still needing to become a functional personal/friends dashboard rather than a public content-discovery page.

## What Works
- The design direction is polished and approachable while still matching the cinematic command-center style.
- The full-width atmospheric hero is stronger than the earlier card-based layout and gives the app a memorable first impression.
- The top navigation, search field, notification/settings actions, avatar, and current-room chip are a strong app-shell direction.
- The featured hero actions are clear and can map well to create/start room and queue actions.
- The horizontal content rows create a good structure for recent rooms, friends' open rooms, and saved/shared experiences.
- The current-room chip in the top-right is useful for rejoining an active room without interrupting dashboard browsing.
- The bottom floating controls should not be used as-is; the product should avoid detached bubble-like control docks.

## Required Adjustments
- Reframe generic discovery sections into product-specific dashboard sections.
- Replace "Trending Now" and "Community Favorites" with personal/friends-and-family concepts unless public discovery is deliberately added later.
- Show open rooms from friends/family, recent rooms, saved rooms, and clear create/join actions.
- Keep the main actions focused: create a room, join by link/code, rejoin current room, or join a friend's open room.
- Avoid making the home page feel like a marketing landing page; it should be a functional product screen.
- Align nav labels and mode labels with the room experience: Watch, Listen, Browse.
- Replace reference branding with Mistake Watch.
- Make sure the dashboard does not imply global public browsing, public trending content, or provider catalog access before those systems exist.

## Implementation Insights
- Use this as the visual basis for the first app screen at `watch.mistakestudios.com`.
- The top nav pattern, avatar/status treatment, and notification/settings affordances are worth carrying into the app shell.
- The hero can represent either a featured active room, the user's current room, or a create-room prompt with rich visual treatment.
- Active room cards should include host, participants, mode, now playing, privacy, and join status.
- The search box can search room codes, recent rooms, saved sources, and later friends.
- For guest-first MVP, direct room links should still bypass the dashboard and land on a display-name join screen.
- If dashboard controls are needed for an active session, use the grounded Cinematic Room Page bottom control bar pattern instead of a floating bubble dock.

## Risks To Watch
- The updated page is beautiful but leans toward a public media catalog. Implementation must convert it into a private/friends dashboard.
- The hero is tall; on smaller screens, create/join actions must remain visible without excessive scrolling.
- Floating bubble controls make the dashboard feel less solid and should be avoided.
- Search and content rows must not promise provider search, global trending, or public content discovery before the backend supports it.
- Some labels still reference CineSync and should become Mistake Watch language.
