# TASK-002 Brain Dump: Incomplete Work Recovery

## Raw Intent

The project has accumulated several partially completed or deferred items from `TASK-001-watch-together-platform`. The user wants a new task packet that preserves the correct order for completing these older tasks so they are not forgotten or randomly mixed into unrelated work.

User direction:

> We need to go by each that is not complete or is partially complete in some order and not forget this order, so make a new TASK-002 that we will do all these older tasks in the right order.

## Why This Exists

`TASK-001` successfully built the core Mistake Watch foundation: guest rooms, Supabase durability, SpacetimeDB live state, watch/listen modes, YouTube playback, queue controls, playlist import, avatars, dashboard/live room polish, and the dedicated listen-mode UI.

The remaining work is no longer one clean MVP task. It is a recovery queue of unfinished or partially implemented slices that should be handled one at a time.

## New Production Issue To Insert

After TASK-002.3 playback continuity work, production testing showed that many YouTube items can still fail with "YouTube could not play this video here." This is not always an app bug: YouTube videos can be non-embeddable, private, removed, age/region restricted, or blocked by provider policy.

User direction:

> A lot of videos seem to be getting the error youtube could not play this video here issues? How do we make sure this does not happen?

This needs to become the next task before provider recommendations. Recommendations, playlists, and room picks should not add or promote items that the room cannot actually play.

## Audit Result To Preserve

The code audit found that early foundation tasks are materially implemented. The incomplete or partial areas are concentrated in later tasks:

- Task 16.D: real audio-reactive waveforms.
- Task 17.A: avatar motion polish.
- Task 18: room chat.
- Task 19: seamless next item loading and resource-aware preload.
- YouTube availability hardening: pre-check, classify, skip, and display unplayable YouTube items.
- Task 22: provider recommendations and room picks.
- Task 23: listen mode queue drawer and dynamic theme quality pass.
- Later Cloudflare R2 upload pipeline.
- Later voting and suggested-next flow.
- Later accounts, friends, and friend invites.
- Later shared browser prototype.
- Later hardening and abuse controls.
- Final QA and release gate.

## Non-Negotiable Order

The task order in `tasks.md` is canonical for this recovery packet. Do not jump ahead unless the user explicitly changes the order.

## Scope Boundary

TASK-002 is a recovery roadmap, not a rewrite. Existing working systems should remain intact unless the active TASK-002 subtask explicitly requires changes.
