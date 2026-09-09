# Quick Capture

> [!tip] Write first, triage later
> Add new findings below the marker in plain language. IDs, formatting, task
> links, and priority are optional. Ask Codex to triage the product inbox when
> convenient.

<!-- QUICK-CAPTURE:START -->

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
