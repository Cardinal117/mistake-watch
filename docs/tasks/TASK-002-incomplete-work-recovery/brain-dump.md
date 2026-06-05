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

## Added Listen Motion And AI DJ Direction

The user wants a future listen-room UI extra where the center recommendation cards continuously and subtly drift from left to right for ambience.

Important constraints captured:

- This applies to listen mode only.
- The drift should cycle through queue/recommendation cards when enough cards exist.
- The behavior must adapt to screen size. A small screen can loop fewer cards, while a very wide screen should not animate if it would expose awkward gaps.
- The drift should feel ambient and premium, not like a cheap marquee.
- Interaction, click/play behavior, and permissions must remain clear.

The user also described a later AI DJ direction for the listen center surface:

- `Signal Analysis`
- `Current Mood`
- `Room Energy`
- `Current Session`
- `Songs Added`
- `Top Contributor`
- `Odysseus DJ`
- `Current Pattern Detected`
- `Suggested Direction`

This is intentionally later than the current UI motion work because durable user memory should wait for accounts/profiles and consent boundaries.

## Added Easter Egg And Achievements Direction

The user wants a fun account-backed easter egg and achievements system after accounts are implemented.

Initial easter egg:

- Trigger phrase: `cardinal mistake`.
- Effect: screen fades to black, plays the chosen iconic failure-style audio, shows a `YOU DIED` style screen, then fades back to the room.
- The effect should be local to the user by default and should not disrupt playback, queue state, sync, or other users.
- The related achievement should persist to the user's account once the account/profile layer exists.

Important product notes:

- This is a friends-and-family project, and the user intends to use the `YOU DIED` style treatment for the easter egg.
- Keep the achievement/easter egg system asset-driven so visuals and audio can be replaced later without rewriting the system.
- Guest users can receive local-only fun effects before accounts exist, but durable achievement history belongs to signed-in profiles.
