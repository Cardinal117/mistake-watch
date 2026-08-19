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
- **Unknowns:** Separate YouTube embed/provider throttling from Mistake Watch API
  rate limits, network/VPN reputation, cookies, extensions, browser privacy
  settings, autoplay restrictions, and repeated player recreation.
- **Related work:** TASK-004 playback stability and provider error handling.
- **Next action:** Capture a sanitized affected-versus-working comparison with
  exact timestamp, media ID, embed error, Network response, browser profile,
  VPN state, and player lifecycle count before changing code.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
