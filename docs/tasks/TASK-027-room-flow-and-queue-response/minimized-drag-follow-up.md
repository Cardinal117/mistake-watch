# Minimized Watch player movement

Approved 2026-09-08. Local implementation only.

Add a dedicated, touch-sized grip alongside the existing thumbnail/title restore
button. Reuse free-position docking, pointer capture, viewport clamping and
keyboard movement. Dragging must not expand the bar, remount the provider, or
publish room commands. Keep the existing paused-only minimize policy unchanged;
account-specific playing minimization is a separate pending scope.

Test-first: desktop/mobile browser test must fail on the missing grip, then pass
movement, keyboard, restore and provider-identity assertions. Check touch drag
and viewport bounds. Preserve unrelated account-membership and owner edits.

Implemented locally in `watch-mode-layout.tsx` and `watch-browse-layout.css`.
The 44px grip has its own pointer/keyboard handlers; the adjacent restore button
keeps thumbnail/title/chevron presentation. Touch restoration handles a short
tap directly because the browser test exposed a suppressed compatibility click
after captured touch dragging. Mouse and keyboard retain native button clicks.

QA: the new desktop/mobile test failed before implementation because the grip
was absent (2 failures). Final `watch-minimized-drag.spec.ts` plus existing
`watch-dock-placement.spec.ts` passed 4/4 on local port 5383. Coverage includes
mouse drag, touch drag, bounds, keyboard movement, restoring, retained video DOM
identity, and no room commands. Touch restore initially failed and passed after
the explicit touch-tap handler. Mobile screenshot inspected at 390x844.
Typecheck and focused lint passed; no production build/deployment for this small
local UI change. The previous membership fix remains a separate local change.

Design-hook review: existing 6px thumbnail rounding, black media-stage surfaces
and translucent overlay values are retained as established presentation. No new
palette/radius values or suppressions were introduced. Other reported CSS files
were unchanged by this patch.

Owner QA preview: http://127.0.0.1:5383/dev/watch-design. Minimize the paused
player, drag its dotted grip, then tap its thumbnail/title to restore it.
