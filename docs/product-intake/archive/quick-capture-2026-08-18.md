# Quick Capture Archive - 2026-08-18

This file preserves the owner-authored reports exactly as captured before
triage. Classification and proposed next actions live in the linked intake
items.

## Capture 1

When in tv mode, the like button is no where to be seen

## Capture 2

Also, in tv mode perhaps a cool transition animation to and from tv mode and also when a song changes? Like the panel similar to a card deck changes like one would move a card off of a card deck, that could be cool. This is a feature for future.

## Capture 3

For some obnoxious reason the site is using a  ton of GPU and CPU resources. and on my laptop it occasionally freezes the audio then plays then freezes then platys every 20 seconds or so due to not enough resources, it also uses a lot of ram and yes it is the only site pretty much running in the browser. My suspicion is that it might be due to the Queue size of 186 and history of 330. So I tested it and it does not seem to be the case, even with 1 actively playing song and 0 in the queue and only 18 in history it still shows massive usage. So my next idea is that perhaps the new rooms code is causing high usage with refreshes? Doe not make sense though, so perhaps it is the animation of the song laying, like the wave bar but then I would have noticed it in the past. So this is a high priority and deep research and discovery task.

## Capture 4

One more thing, so with the new account based ownership of rooms. Currently if a user is indeed signed into their google account and they have added rooms to their account rejoining that room again but with another username and still signed into the same google account does not give them host privilege. So that means if they happen to close the tab and leave the room, joining the room again but with another name then makes the room useless as they have no privileges or permissions to use anything in the room. This is an issue that should be addressed and handled gracefully. Another top priority. If the owner tries to add an item to queue withing the for you part or change it to play next they can't do to no permission and a toast of "Queue item ignored because the same active source is already in the live queue" is shown. That brings up a similar issue it seems that the add next in queue button in the For You part in Room pick only works for the host and not other users(like I said even if they are indeed signed in as a google account that made and owns the room they have no host permissions)

## Capture 5

Future Task, in the new rooms tab there should be a way to add/create a new room. Perhaps a button at the top right in the header "Add New Room +" or something of the sort, that opens a new pop out or drop down so that the user can fill in the requirements for the new room and once all details are filled in or selected there are 2 buttons create room and create and join room. They should have 2 different colors of course otherwise one can mistake the one for the other too easily.

## Capture 6

These are 2 Bug reports the should be handled when the time sees right:
## Bug: Recommendation preference polling returns repeated 429 responses

Date observed: 2026-08-18
Environment: Production
URL: https://watch.mistakestudios.com
Area: Recommendations / Likes
Severity: Medium
Security: Network exports were sanitized and exposed sessions have been rotated.

### Reproduction

1. Open the same account-owned room on multiple devices or browser sessions.
2. Sign in to the same Google account where applicable.
3. Leave the room open while recommendation preferences reconcile.
4. Open DevTools Console and Network.
5. Watch requests to `/api/recommendations/preferences`.

### Actual behavior

Repeated requests eventually return:

`429 Too Many Requests`

The recommendation authorization layer uses a shared limit of 30 requests per
60 seconds for the same account and room. Preference reconciliation, focus
refreshes, multiple devices/tabs, and recommendation ranking requests appear
to consume the same shared budget.

### Expected behavior

Normal use across a small number of devices or tabs should not exhaust the
recommendation request budget. Background polling should remain bounded,
deduplicated, and should not interfere with Likes or Room Picks.

### Evidence

- Preference reconciliation runs approximately every 10 seconds.
- Captured HAR sample contained nine sequential successful preference requests.
- Median interval was approximately 10 seconds.
- Peak request concurrency was one.
- Separate console evidence showed repeated preference endpoint 429 responses.
- This was not caused by overlapping Account Rooms polling.
- Playback and queue synchronization remained functional.

### Suggested investigation

Separate read/reconciliation and mutation rate budgets, or introduce a
server-side cache/coalescing layer. Test multiple tabs, multiple devices,
focus restoration, and the Recommended tab together.

## Capture 7

## Observation: SpacetimeDB participant cache warning after guest admission

Date observed: 2026-08-18
Environment: Production
Area: Live room synchronization
Severity: Low pending reproduction

### Actual behavior

After a guest joined an account-owned room, the console reported:

`Updating a row that was not present in the cache. Table: room_participant`

### Expected behavior

Participant insert/update events should be applied to a subscribed cache entry
without producing missing-row warnings.

### Current impact

No visible failure was confirmed. Participant synchronization, playback,
queue state, and Account Rooms behavior continued working.

### Suggested investigation

Correlate participant subscription readiness with join/update event ordering.
Test rapid join, reconnect, refresh, account attachment, and guest-to-account
transitions. Confirm whether this is harmless SDK ordering noise or a missed
participant-state transition.
