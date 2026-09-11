# Quick Capture

> [!tip] Write first, triage later
> Add new findings below the marker in plain language. IDs, formatting, task
> links, and priority are optional. Ask Codex to triage the product inbox when
> convenient.

<!-- QUICK-CAPTURE:START -->

Owner subsequently approved the catalogue admission, account Like consistency
and compact Discover follow-ups together on 2026-09-11. The two related captures
below are implemented under [030.6–030.8](../tasks/TASK-030-personal-music-catalogue/approved-follow-ups.md);
their original proposal/future wording is retained as history. The additional
reported persistent "Hidden from suggestions for 7 days" Undo message is also
fixed with a ten-second pausable auto-dismiss and explicit Dismiss control,
without changing the seven-day exclusion. See [release evidence](../tasks/TASK-030-personal-music-catalogue/follow-up-release-2026-09-11.md).

### 2026-09-11 - Account Likes appear lost and Personal completion counts remain zero

Owner request (verbatim):

> Agreed, and that liked songs of said accounta re properly shown and used whre it matters as I just had to relike 4 songs I am very confidant I liked before
>
> Propose what to do next

Owner reports re-liking four previously liked songs. Whether the durable Likes were lost, a different upload was shown, or the displayed state was stale is not established. The preceding read-only production check found zero stored playback-completed events for the owner's Personal room and six projected regulars with zero completed plays. This proves missing durable completion evidence at that check, not the failure's origin.

Recommended priority: P1 reliability investigation, before Discover UI polish or broader learning. See [proposed investigation and repair gates](../tasks/TASK-030-personal-music-catalogue/reliability-follow-up.md). Proposal only; no application change or preference rewrite authorized by this capture. Preserve the earlier UI requests below.

Subsequent owner-approved delivery repair is deployed: [release evidence](../tasks/TASK-030-personal-music-catalogue/delivery-release-2026-09-11.md). Backlog reached zero; both supplied Like events and one completion reached durable storage. The subsequent country-aware admission and claim repair made both uploads eligible and cleared catalogue preparation to 308 ready/zero pending. Account consistency and the UI capture below are implemented. The original remembered Likes are not historically reconstructed; preserve this distinction when evaluating natural use.

### 2026-09-11 - Compact expandable regulars and visible Add next actions (implemented)

Owner request (verbatim):

> Log these as future things to add, the Your regulars should have an easy add to queue and  add next button shown and added in in an appropriate section, I suggest we use the same method I made for the mobile UI where it shows the thumbnail with small text below it of the name and when you click on this it opens up with an animations(look at how it was done in mobile) Same when closing when you click off it closes with a smooth animation.
>
> This allows more refulars to be shown at a time to make it easier for the user(and naturally mobile better)
> Same with reccomended for you next to add to queue should be add as next icon/button

Original capture was future work; subsequently approved and implemented as 030.8. Original requirements:

- **Your regulars:** compact thumbnail tiles with small song titles underneath, allowing more regulars to be visible at once on desktop and mobile. Clicking/tapping a tile opens its details and a clearly placed action section with visible **Add to queue** and **Add next** controls. Match the existing mobile discovery card's smooth opening and click-away closing behaviour. Opening the tile should reveal controls rather than accidentally start playback; retain a separate explicit play action and access to the existing recorded play count.
- **Recommended for you:** expose an **Add next** icon/button beside **Add to queue**, rather than requiring the overflow menu. Preserve permission checks and pending/confirmed queue feedback.

Source reference checked on 2026-09-11: [RecommendationCard](../../components/room/listen/discovery/media-cards.tsx) already implements mobile compact/expanded state, click-away dismissal, Escape/focus handling and a closing phase. [Mobile discovery styles](../../components/room/listen/mobile/listen-mobile-discovery.css) define thumbnail/title previews and transitions. Use this specific card interaction as the reference, not the mobile player expansion gesture. The Personal surface currently uses [PersonalTrackView](../../components/room/listen/discovery/personal-track.tsx); reuse the interaction pattern without reintroducing provider lookups into catalogue reads.

Future planning should retain the accepted song-derived accent/gradient, recorded-count wording, reduced-motion support, keyboard access and unclipped bottom scrolling. Related: [TASK-029](../tasks/TASK-029-recommendation-quality-baseline/task.md) Discover UI and [TASK-030](../tasks/TASK-030-personal-music-catalogue/proposal.md) catalogue foundation. No ranking, database, provider or automatic queue-refill change requested here.

### 2026-09-09 - Maintenance, prototype schedules and release notices (future work)

Owner: "we should put a thing into the website that notifies users when we do these maintenence and prototyping events with times schedules and then whats new messages. This can be recorded as later or future work"

Record for later planning: visible upcoming/active maintenance and prototype notices, start/end times with timezone, and concise post-release "what is new" messages. Keep compact and accessible on Watch/Listen desktop/mobile. Decide publishing controls, dismissal, expiry and scheduling in a future scoped task. No implementation or scheduling automation in the TASK-028 rollout.

### 2026-09-09 - SpacetimeDB dashboard performance notifications (owner capture)

Owner: "Note these Spacetimedb notifications" (attached screenshot, Last 72 Hours).

- `live_queue_item`: 190 subscription queries using sequential scan; recommends index on `room_id`.
- `room_chat_message`: 190 subscription queries using sequential scan; recommends index on `room_id`.
- Informational average CPU use per minute: `add_queue_item` 4.23 ms; `on_disconnect` 1.39 ms; `prepare_youtube_autoplay` 1.00 ms.
- Average execution duration: `advance_queue_item` 135.96 ms; `play_uploaded_queue_item` 119.51 ms; `play_queue_item` 100.83 ms.

Source check: candidate/base already define composite btree indexes `(room_id, position)` and `(room_id, created_ms)`. Screenshot alone does not establish deployed schema parity or whether the subscription planner uses those prefixes. Verify exact deployed schema/query plans, then measure room-only index changes and profile transition reducers. The warning does not prove these scans cause all reducer latency. CPU/minute is not per-call duration. Keep separate from TASK-028 R3 lifecycle implementation; no performance schema change is approved by this capture.

Hosted preflight update (2026-09-09): deployed Spacetime schema confirms both compound btree indexes are present, not merely in source. Index/planner usage and reducer profiling remain unverified; no performance changes made.

Attachment: `C:/Users/Admin/AppData/Local/Temp/codex-clipboard-3626a9ed-c890-48d4-88bd-956a8980f51e.png` (temporary local reference; figures preserved above).

<!-- QUICK-CAPTURE:END -->

Triaged work is listed in [[INDEX]]. Completed and declined work remains in
[[ARCHIVE]]. Operating rules are in [[README]].
