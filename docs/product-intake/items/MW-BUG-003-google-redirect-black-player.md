---
id: MW-BUG-003
type: bug
status: in-progress
priority: P1
area: youtube-playback
related: [TASK-004, TASK-021]
created: 2026-08-17
updated: 2026-08-27
---

# Google redirect failure can leave a black player

> [!bug] In progress - P1

- **Expected:** Switching an active YouTube room between Listen and Watch keeps
  the current source playable without leaving a failed provider frame.
- **Observed:** Switching a playing source from Listen to Watch produced a
  persistent `ERR_TOO_MANY_REDIRECTS` page inside the media surface. The frame
  reported that `www.google.com` redirected too many times. Refreshing,
  switching back to Listen, and opening another room tab did not recover the
  affected browser session.
- **Earlier evidence:** A separate participant previously reached the same
  black, silent player state while Mistake Watch controls and room progress
  remained active. The new report supplies the first concrete interaction
  trigger.
- **Console evidence:** The failure generated sustained YouTube iframe
  `postMessage` target-origin mismatches, one provider-side
  `isFeatureEnabled` exception, and unused-preload warnings. No Mistake Watch
  route redirect or authentication redirect appeared in the supplied log.
- **Repository finding:** Listen and Watch render separate
  `YoutubeMediaPlayer` instances under mutually exclusive layouts. A mode
  switch therefore destroys the playing provider iframe and immediately
  constructs a replacement for the same source.
- **Assessment:** This is a provider iframe lifecycle race, not evidence of a
  local CPU, memory, Supabase, or Vercel capacity limit. The provider warnings
  are treated as downstream evidence, not individually as root causes.
- **Implemented correction:** YouTube iframe ownership is serialized across
  room surfaces, with a 250 ms teardown handoff before a replacement can start.
  Cancelled and repeated React mounts release their queued lifecycle turn.
- **Local verification:** Five actively playing Listen-to-Watch-to-Listen cycles
  retained exactly one iframe in every sampled state, produced no redirect
  frame or console error, and recovered to the authoritative playback position.
  The targeted lifecycle tests, full `494/494` suite, TypeScript, ESLint, and
  file-length policy pass.
- **Verification remaining:** Repeat the playing mode-switch cycle in the
  affected browser profile on production and confirm second-participant
  continuity before resolving the item.
- **Production recurrence:** On 2026-08-26, the same participant who had
  previously reported provider failures again reached a persistent Google
  redirect / YouTube bootstrap failure on the production release at
  `8a534bfc1f3310cfbb654850f0cf154c439faf99`. The affected profile produced
  repeated YouTube widget `postMessage` target-origin warnings and a provider
  `isFeatureEnabled` exception while the owner remained unaffected.
- **Isolation evidence:** Private browsing and a full computer restart did not
  recover the participant. The page contained exactly one YouTube embed iframe,
  disproving an uncontrolled application reattachment loop in the observed
  state. Manually removing that iframe in developer tools and refreshing the
  page restored playback.
- **Revised assessment:** A provider iframe can remain mounted after its
  browsing context has entered a failed redirect/bootstrap state without
  delivering a useful ready or error callback. The application needs bounded
  failed-startup recovery; this does not invalidate the shipped duplicate-load
  correction tracked by MW-BUG-014.
- **Approved recovery boundary:**
  - detect a player that does not become ready within a bounded startup window;
  - allow one automatic clean recreation per playback occurrence and page
    session;
  - fall back to a user-invoked `Reload player` action after the automatic
    attempt is consumed;
  - prevent repeated automatic retries and rapid manual retries;
  - guarantee lifecycle-lease release even when provider teardown throws;
  - restore from canonical room position without mutating queue or authority.
- **Acceptance:** Deterministic tests must first fail against the missing
  startup-recovery contract, then prove one-shot automatic recovery, manual
  fallback, cooldown, ready-state cancellation, teardown safety, and existing
  single-player ownership. Production QA remains required in the affected
  participant profile.
- **Test-first evidence:** The focused lifecycle suite first retained its three
  existing passes while four new recovery tests failed because the approved
  recovery APIs were absent. After implementation, the combined lifecycle and
  playback suite passes `20/20`.
- **Implementation checkpoint:** A player that does not report ready within 12
  seconds now receives one clean recreation for its active queue occurrence.
  A second failed startup presents `YouTube player failed to initialize` with a
  `Reload player` action. Manual retries have a five-second reservation
  cooldown, and provider destruction cannot prevent lifecycle-lease release.
- **Current validation:** Full tests pass `507/507`; TypeScript, ESLint,
  changed-file Prettier, whitespace checks, file-length policy, and the Next.js
  production build pass. The player remains below its recorded legacy ceiling
  at 883 lines after recovery ownership and provider-instance helpers were
  extracted.
- **Live gate:** Keep this item in progress until the affected participant
  confirms either automatic recovery or the manual reload state on a deployed
  build. Normal ready playback must remain unchanged, and recovery must not
  alter queue order, room authority, or canonical playback position.
- **Related:** TASK-004 playback stability, TASK-021 Listen-room integration
  QA, and MW-BUG-014 provider-throttling investigation.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 7]]
