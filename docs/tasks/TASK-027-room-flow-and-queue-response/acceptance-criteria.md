# Acceptance and traceability

Status: All application acceptance pending. Updated: 2026-09-07.
Numbers refer to [owner-intent capture](brain-dump.md). Every row needs evidence
or an explicitly unresolved limitation; a screenshot alone cannot prove sync.

| ID | Intent | Observable acceptance | Required evidence |
| --- | --- | --- | --- |
| AC-01 | 1,7 | Watch foregrounds discovery/Cinema; Listen foregrounds track/artwork/transport/Up Next. Shared navigation/style remains familiar. | Desktop and mobile visual/interaction review |
| AC-02 | 2 | Mobile Home exposes a stable Watch/Listen switch below identity; permission and connection gating remain correct; switching affects the room, expanding does not. | Browser + two participants |
| AC-03 | 3,4 | Fresh Watch entry shows catalogue when permitted and links when denied; loading/error/empty states are distinct; existing media is not restarted. | Access-state browser tests + actual allowed/denied QA |
| AC-04 | 5 | Empty source shows no rail/dock/bar or phantom padding; loaded paused/buffering media keeps resume/transport on both device sizes. | State-transition/browser bounds tests |
| AC-05 | 6 | Desktop browsing has movable/expandable loaded mini-player and a visible Cinema action; four corners, keyboard movement, resize clamping and mobile parity work. | Desktop/mobile browser and visual QA |
| AC-06 | 7 | Listen browsing shows a compact bar above navigation, with title/artwork/primary transport and clear expand action, without hiding content below it. | Portrait/landscape bounds + physical phone |
| AC-07 | Latest request | Drag up expands continuously into the main Listen view; drag down on handle returns to prior browse scroll; short/cancelled gesture settles correctly. | Pointer/touch browser tests + phone |
| AC-08 | Latest request | Tap and keyboard expand/collapse work; seek/volume/list scroll do not accidentally expand/collapse; focus/Escape and reduced motion are correct. | Keyboard/reduced-motion/gesture tests |
| AC-09 | 7,17 | One media/provider instance survives internal navigation, bar/expanded/Cinema/fullscreen transitions and rotation; no seek/reload, doubled audio, lost volume or analysis restart caused by layout. | DOM identity + real playback/auto-advance |
| AC-10 | 8 | Existing discovery/recommendations still work; no fabricated recommendations, new account scopes/imports or extra provider requests from presentation alone. | Network/contract regression + scope review |
| AC-11 | 9 | Dropped row occupies intended place before delayed server confirmation and does not snap back while pending; transport remains usable. | Test with 600 ms confirmation delay |
| AC-12 | 9,10 | Rejection, timeout, disconnect, permission loss and stale responses reconcile correctly; optimistic order never drives canonical playback. | Deterministic client tests + two participants |
| AC-13 | 10 | Two/four actors moving same/different items converge to valid authoritative order with no lost/duplicated items; missing anchor/removal/auto-next handled; server-order winner documented. | Actual reducer tests + multi-client integration |
| AC-14 | 10,13 | Relative placement and legacy numeric moves coexist; current/history cannot be reordered; pin/Play next/mode rules remain correct and visibly explained where relevant. | Characterization + reducer/client tests |
| AC-15 | 11 | Held row, destination gap and settling are clear, accented and smooth; no continuous decorative effects; reduced motion keeps equivalent feedback. | Visual review + recorded interaction trace |
| AC-16 | 12 | Watch desktop/mobile and Listen render a bounded queue window; long-distance drag/edge-scroll works through unmounted rows without focus loss or wrong destination. | 1000-row browser + mounted-row measurements |
| AC-17 | 13 | Compact rows, broad play target, Play next/pin, keyboard/menu top/bottom, swipe reveal and second-swipe/tap-trash removal remain functional; no duplicate Add Media queue bar. | Existing + new Watch/Listen interaction tests |
| AC-18 | 14 | Playlist artwork never overlaps text; themed semantic selection is visible; footer and last row remain reachable at narrow/short heights. | Screenshot fixture + bounds/click/keyboard tests |
| AC-19 | 14 | Duplicate/unavailable states, selected counts, sort/filter selection and selected/all/shuffle imports retain correct identity and permission behaviour. | Existing contracts + shared Watch/Listen browser paths |
| AC-20 | 15 | Account button shows available Google photo; absent/broken photo and guest state use chosen-avatar fallback; no change to member identity/host authority. | Signed-in/guest/error fixtures + account QA |
| AC-21 | 16 | Participants/count sits beside account/settings with distinct accessible targets and padding; large counts/names do not clip. | Desktop/mobile/zoom bounds and screenshots |
| AC-22 | 17 | Save, live rename, invite, members including inactive/previous, leave Yes/No, permissions and Social/More remain reachable and functional. | Header/room regression suite |
| AC-23 | 17 | Fullscreen play/pause, next, +/-10/30 sec, seek, volume/mute and exit retain permissions and source continuity; landscape Home has no blank wasted column or black overscroll. | Browser + physical phone/fullscreen |
| AC-24 | 17 | No playback stalls/correction loop from panel loading or reordering; prepared YouTube auto-next and reconnect catch-up remain correct. | Player/reducer regressions + real provider QA |

## Risk-based test chronology

Queue/concurrency, permissions, playback-state transitions and confirmed clipping
bugs require meaningful failing contract tests before production edits. Use
passing characterization first for behaviour-preserving refactors. Pure visual
spacing/token/documentation changes are exempt from new unit tests but require
visual/read-back review. A missing service or broken fixture is not red evidence.
Record exact commands, assertions, baseline, red and green results by batch in
review-notes.md. Test a reducer against real module behavior, not source strings.

## Performance targets (unmeasured until implementation)

- Local drop should settle by the next render opportunity; aim for <=100 ms
  input-to-visible placement in the documented baseline. Artificial 600 ms
  server latency must not impose that same visible delay. Record a distribution
  of repeated samples and CPU/device settings, not a single favourable number.
- Record command confirmation separately; improve measured server/client work
  where feasible without inventing a network latency guarantee.
- At a fixed viewport, mounted rows must remain bounded as queue length grows
  from 250 to 1000 (visible rows + documented overscan + at most one drag layer).
  Do not keep offscreen interactive duplicates or load every thumbnail.
- Drag/bar animation should avoid attributable >50 ms main-thread tasks in the
  representative trace. Target smooth frame-paced motion on the accepted Huawei;
  emulated CPU throttling is supporting evidence, not a device guarantee.
- Navigation/expansion should create zero additional provider instances or
  provider loads solely due to presentation. Unrelated panels must not delay
  transport; compare before/after with large queues and active playback.

## QA matrix

Desktop 1440x900 and 1920x1080; tablet 768x1024; phone 360x800, 390x844 and 412x915;
short landscape 844x390 and the owner's physical Huawei Y9 Prime. Also test 320px
width, 200% text zoom, reduced motion, keyboard-reduced viewport, long names,
broken artwork/profile image and expanded participant counts.

Exercise empty/current/paused/buffering/error media; direct audio/video, R2 and
YouTube; 0/1/50/250/1000 queue rows; host, authorized guest, denied guest and
permission change mid-gesture; two and four participants; history/filter changes,
disconnect/reconnect and navigation during a pending move. Use synthetic queue
fixtures for volume without paid imports or mutations to real rooms by default.

## Release gates

Run `node --test tests/*/*.test.mjs`, affected Playwright projects, typecheck,
lint, build and file policy using the repository commands. Record inherited
warnings separately. Supply a working local QA route and review screenshots.
Live provider/device tests, when unavailable, remain visibly pending. Final
acceptance and Git/deployment actions require their own concrete review; no
intake report is closed merely because this task has a similar symptom.

## First-slice evidence

See [local-qa.md](local-qa.md) for local evidence against AC-11 through AC-19
and regression coverage for AC-22 through AC-24. Physical-device/live-provider
acceptance, the early convergence diagnostic and complete baseline performance
distributions remain open. AC-01 through AC-10 and AC-20/21 belong to later
batches and are not claimed complete.


## 027.3 local evidence checkpoint

[Watch local QA](watch-local-qa.md) supplies local evidence for AC-02 through
AC-05, the Watch portion of AC-09, and AC-20 through AC-24. Actual account,
room-authority, real-provider and physical-device checks listed in the matrix
remain integrated acceptance gates; they are not closed by fixture tests.
Listen-specific AC-06 through AC-08 remain in pending 027.4.
