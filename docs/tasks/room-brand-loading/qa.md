# Implementation and QA — 13 September 2026

Status: implemented, verified and deployed after owner approval; see release.md. Baseline: `fe5e243`. Unrelated recording-review files remain untouched and excluded from this milestone.

## Delivered

- Shared `BrandLockup` and `SignalApertureMark` replace competing implementations. Dashboard, Watch and Listen use the approved traced lettering and flat six-leaf geometry; compact navigation keeps an accessible mark. Existing favicon/artwork assets are preserved.
- Existing artwork extraction supplies primary/secondary colors. Both navbar and portaled loading screen receive readable accents; silver lettering stays neutral. No new artwork requests, user data, provider calls, theme storage or settings were introduced.
- One root client coordinator survives outgoing layout unmounts. Route streaming, room connection, create/join/open/leave adapters, mode switches and TV bundle loading share the presentation. Content skeletons and actual upload/import progress remain local.
- Completion requires the current room ID and connection epoch, applied subscription, fresh clock sample, online current admission, authoritative session mode and committed destination shell. Local mode changes also await operation completion. Optional artwork, catalogue loading and audible playback are not gates.
- Mode changes no longer mutate/roll back the local session optimistically. The loading screen appears immediately, while only the authoritative subscription changes the rendered mode. Durable mode storage and the live reducer remain sequential; partial failure does not claim distributed rollback.
- 150ms mark grace and nonblocking completion fade; no mandatory animation cycle. Eight-second slow hint, twenty-second static timeout, appropriate connection retry or mode-error dismissal. Terminal Back performs a document navigation so outstanding action redirects cannot unexpectedly reopen the room.
- Inert app and portaled dialogs, trapped recovery focus and destination focus restoration; reduced-motion/static states, hidden-tab cleanup, unique SVG IDs and stopped idle/error animation. Completion timing is recorded at confirmed presentation release rather than early socket connection.

## Review findings fixed

Sol independently reviewed readiness/lifecycle and assisted with the brand and admission tests. Its findings led to room-keyed readiness, epoch-bound shell/request completion, safe unresolved-write guarding, slow-join recovery, distinct mode versus connection failure handling, and focus/generation reset fixes. Root visual review corrected center-symbol scale/paint order and lifted dark navbar accents. The final state-model review found no behavioral blocker. A reveal-effect lint error was then removed by publishing completion records from the external store and using a bounded timer callback.

Luna was used only for a bounded read-only entry-path/coverage audit after consulting the official GPT-5.6 Luna model page. It identified missed dashboard entry paths; architectural decisions and acceptance review remained with root/Sol. Research source: https://developers.openai.com/api/docs/models/gpt-5.6-luna

## Verification evidence

- **Test-first browser regression:** delayed mode action with outgoing layout removed. At baseline the correctly scoped assertion failed because the full-screen transition status disappeared. Evidence: `.tmp/room-loading-red-final`. Earlier server-not-running and wrong-selector attempts are not counted as valid red evidence. The same regression subsequently passed (`.tmp/room-loading-green-2`) and remains in the final matrix.
- **368 unit/behavioral checks passed:** `node --test tests/room-transition/*.test.mjs tests/brand/*.test.mjs tests/spacetime/*.test.mjs tests/player/*.test.mjs tests/queue/*.test.mjs`. Includes actual connection-hook harness checks for delayed join, fresh epoch clock, old subscription data and admission; behavioral mode-write sequencing, durable failure and guest rejection. Supplemental coverage is post-hoc, not represented as test-first.
- **26 new browser checks passed:** `WATCH_DESIGN_QA=1`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5371`, `npx playwright test tests/e2e/room-loading.spec.ts tests/e2e/room-brand.spec.ts --workers=1`. Evidence: `.tmp/room-brand-loading-final-2`. Both directions, delayed confirmation/layout, late readiness after timeout, rejection, reconnect retry, remote-mode observation, explicit portal palette, inert external portal, focus, hidden/reduced motion, unique masks and nonblocking reveal.
- **22 existing browser checks passed across targeted runs:** Listen player polish (7), Watch header/audience (14), Watch provider continuity (1). The latter confirms one unchanged video element and no playback commands while navigating room surfaces. An obsolete `Back to add` locator was updated to the shipped `Back to catalogue` label; behavior assertions remain intact.
- Viewports: 1920×1080, 1440×900, 1024×768, 768×1024, 390×844, 360×640, 844×390 for loading; actual Watch/Listen nav at desktop/tablet/mobile/landscape, plus dashboard at 360/1440 and a 200% text-size fallback check. Screenshots inspected in `.tmp/room-brand-loading/`, including closed aperture, active palette, recovery, desktop headers and mobile mark.
- TypeScript, ESLint and production build passed. ESLint command: `npm run lint -- --ignore-pattern '.tmp/**'`; `.tmp` contains 11,427 generated JS/TS evidence files and is excluded, not application source. The unbounded initial lint was stopped while scanning generated artifacts. File-length gate: zero violations; 25 existing architecture/legacy warnings. `git diff --check` passed.
- Original traced wordmark 507,016bytes / 116,795gzip → 476,661bytes /110,664gzip, all 892paths retained. External cached SVG avoids hundreds of inline paths per navbar. No wordmark in the full-screen loader path. Geometry/paint-order checks and browser inspection preserve the approved contours; active colored regions use palette-relative luminance while neutral silver contours remain fixed.

## Scope and limits

These are local fixtures and isolated connection/reducer harnesses, not a claim of live two-device audio proof. No owner's active room was changed to manufacture network/admission failures. Actual friends' devices, native PiP behaviour and audible Watch↔Listen continuity remain owner smoke checks after release. Initial/join/leave server-action wiring, redirects, shared approval gate and route error cancellation were source-reviewed; real authenticated create/join mutations were not run. This implementation does not redesign playback synchronization or solve the existing non-atomic durable/live mode write.

The design hook's new loading text color/type findings were corrected to the DESIGN.md neutral colors and24/16px type steps. Existing Watch CSS warnings concern unchanged earlier styles; this milestone neither introduces nor suppresses those rules.

## Next release step

Scoped Git and production release completed after owner acceptance; see release.md. Exclude all unrelated recording-review work. No database migration or Spacetime module publication is needed. Then smoke-test real room entry, both mode directions and owner device/audio continuity. Custom per-player buffering and a new theme editor/persistence remain separate follow-ups.
