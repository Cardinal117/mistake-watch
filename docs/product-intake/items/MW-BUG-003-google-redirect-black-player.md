---
id: MW-BUG-003
type: bug
status: needs-verification
priority: P1
area: youtube-playback
related: [TASK-004, TASK-021]
created: 2026-08-17
updated: 2026-08-26
---

# Google redirect failure can leave a black player

> [!bug] Needs verification - P1

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
- **Related:** TASK-004 playback stability and TASK-021 Listen-room integration
  QA.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 7]]
