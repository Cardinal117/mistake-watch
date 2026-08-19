---
id: MW-BUG-014
type: bug
status: needs-reproduction
priority: P1
area: youtube-playback
related: [TASK-004]
created: 2026-08-19
updated: 2026-08-19
---

# YouTube embed reports too many requests for one user

> [!bug] Needs reproduction - P1

- **Expected:** A normal participant can play supported YouTube media without
  persistent provider throttling under ordinary room use.
- **Observed:** One user repeatedly receives a YouTube embed "too many requests"
  failure while other participants appear unaffected.
- **Evidence:** Owner report based on one affected user. No sanitized HAR,
  response body, status code, account state, network comparison, or browser
  profile evidence is attached yet.
- **Repository-side finding:** Every new iframe player was constructed with the
  active video ID, but its source tracking remained empty until `onReady`.
  Ready-state synchronization therefore issued a second `loadVideoById` or
  `cueVideoById` for the same initial source. The isolated correction claims the
  constructor source before the ready callback so ordinary initialization does
  not duplicate the provider load.
- **Evidence limit:** The redundant initial load is an application defect and a
  plausible throttling contributor, but it does not prove the affected user's
  provider message has the same cause. A sanitized affected-versus-working
  capture remains required before this item can be resolved.
- **Implementation verification:** The isolated correction passed the full 378
  test suite, targeted YouTube playback regression coverage, TypeScript,
  ESLint, the production build, formatting, and the file-length policy. Manual
  affected-user production verification remains outstanding.
- **Unknowns:** Separate YouTube embed/provider throttling from Mistake Watch API
  rate limits, network/VPN reputation, cookies, extensions, browser privacy
  settings, autoplay restrictions, and repeated player recreation.
- **Related work:** TASK-004 playback stability and provider error handling.
- **Next action:** Capture a sanitized affected-versus-working comparison with
  exact timestamp, media ID, embed error, Network response, browser profile,
  VPN state, and player lifecycle count before changing code.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
