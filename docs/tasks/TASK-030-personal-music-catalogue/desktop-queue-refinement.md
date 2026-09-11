# Desktop Listen queue rows

Owner requested implementation on 2026-09-11. Scope: desktop Listen queue item
presentation, preserving mobile, ordering, menus, permissions and virtualized
large queues. Replace separate bordered cards with contiguous 60px rows, subtle
separators, artwork, title/artist, aligned duration and existing actions. Keep
one ordered column: queue position must remain unambiguous.

Use the existing desktop-shell breakpoint (900px and fine pointer). Virtual
row pitch, drag targeting, keyboard focus and spacer height must share the same
60px value. Mobile/Watch retain their current 82px pitch. No optimistic-add or
learning implementation is included. Test desktop geometry/drag and mobile
regressions before handoff; no new dependencies or deployment.

Status: implemented and locally verified. Desktop 1440/1024 geometry and drag checks,
queue virtualization/focus regression checks and manual browser visual review pass.
See [release QA](listening-rollout-qa.md) for publication state.
