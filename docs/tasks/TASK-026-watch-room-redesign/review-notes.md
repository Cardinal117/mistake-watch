# Watch redesign — local review

## Accepted release - 2026-09-05

Owner physical Huawei Y9 Prime QA passed: "This is perfect, I will pass QA, it all works as requested." The owner explicitly approved documentation, atomic commits, push/PR merge to main and final production deployment. This supersedes the temporary-window restoration requirement: retain the accepted candidate while completing Git integration. Earlier limitations and deployment states below are chronological evidence, not the current release status.

Accepted application tree: `0fb144fd9569146eb808f477180c5835249508cc`; Vercel `dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG`. The additive prepared-YouTube backend is deployed. See [release summary](release.md) and [bug reconciliation](bug-reconciliation.md). Merged through [PR #12](https://github.com/Cardinal117/mistake-watch/pull/12), merge 662597a1bda7ec458017303644874353d672d462. Final production/frontend/backend identities are verified in release.md.

Status: local implementation and QA complete, 2026-09-05. Ready for owner design review; live provider/device integration remains a release gate.

Preview: http://127.0.0.1:5381/dev/watch-design
Owner management preview: http://127.0.0.1:5381/dev/watch-design?owner=1

The preview uses the actual Watch components with a fictional catalogue, authored sample artwork and a seekable 60-second local video. Room actions use a local fixture. Account, upload and provider requests do not represent connected production operations. The link is local to this computer.

## Review the flow

1. Browse media: inspect Ready to watch, collections, library search and item details.
2. Open Library and filter a collection. Return from details to the same results.
3. Open Cinema, then return. Queue, Add and Social remain available from room tools.
4. At phone width, switch Home / Queue / Add / Social / More. Move the dock left/right, drag its handle, expand it, or return to the full player.
5. Use the owner preview to inspect the existing management surface.

Screenshots: [desktop browsing](qa/desktop-browse.png), [cinema](qa/desktop-cinema.png), [tablet](qa/tablet-browse.png), [phone browsing](qa/mobile-browse.png), [phone queue](qa/mobile-queue.png), [phone watching](qa/mobile-watch.png).

## Restart the preview

Run in this worktree:

~~~powershell
$env:WATCH_DESIGN_QA='1'
node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 5381
~~~

Worktree: C:/Users/Admin/dev/Personal/watch-together-platform/.worktrees/task-026-watch-redesign
Branch: codex/task-026-watch-redesign
Base: origin/main 259348abfd83089db53283ddb82b5bf119ebf59a

The local node_modules junction reuses the parent checkout's installed dependencies. No packages were added.

## Implementation

- One persistent MediaStage and transport. CSS changes placement between desktop, cinema, mobile watching and docked browsing.
- Real authorized ready-library items, collections, search, room queue/history and details. No invented recommendation, season, resume or progress data.
- Details separate personal browsing/Like actions from room Play now / Play next / Add actions. Play now waits for the requested source reference in canonical state before requesting playback; authority is rechecked after the private-session request.
- Existing Queue, Add Media, participants, chat, account and owner management components are reused. Embedded variants retain their default behavior elsewhere.
- Transport reuses the existing media-session and queue behavior. Private R2 source resolution and player implementations are unchanged.
- Existing theme/type/radius tokens; media posters load near the viewport; initial Library rendering is bounded to 24 cards.
- Visual viewport height handling and reserved player space for short screens. YouTube retains a minimum 200×200 iframe; direct-media docks use a smaller 16:9 canvas.

## Verification

| Check | Result |
|---|---|
| Before-change player/queue baseline | 173 passed |
| Initial browser red check | Failed on missing Browse media, after finding the original player |
| Final regression suite | 516 passed, 0 failed |
| Final browser suite | 20 passed, 0 failed |
| TypeScript | Passed |
| ESLint | 0 errors; one existing room-experience navigation warning |
| Production webpack build | Passed |
| File-length policy | 0 violations; 17 existing threshold/legacy warnings |
| Git whitespace check | Passed |
| Production fixture gates | Page and video both 404, even with WATCH_DESIGN_QA=1 |
| Local preview | HTTP 200 and manually inspected in the in-app browser |

Browser coverage: 320×568, 390×844, 430×932, 768×1024, 1024×768, 1440×900, 1920×1080 and 844×390; additional 390×520 keyboard-size viewport. Covers continuous real local-video playback, DOM identity, navigation without playback commands, focus restoration, collection filtering, 1,000-item search and bounded mounting, retry/denial, permission revocation during a request, explicit queue actions, source-confirmed playback, owner management, embedded account and unobstructed YouTube-sized docking.

Commands:

~~~powershell
node --experimental-strip-types --test
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node scripts/check-file-lengths.mjs
node node_modules/next/dist/bin/next build --webpack
$env:WATCH_DESIGN_QA='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5381'
node node_modules/@playwright/test/cli.js test tests/e2e/watch-redesign-flow.spec.ts tests/e2e/watch-redesign.spec.ts tests/e2e/watch-redesign-youtube.spec.ts --workers=1 --reporter=line
~~~

Run typecheck after build/dev startup settles: both Next processes generate type files, so concurrent generation can produce transient missing-file diagnostics.

## QA findings resolved

- Sample video lacked range support and snapped to zero during sync seeks. Fixed only the gated fixture endpoint; the real player was unchanged.
- Narrow tablet header wrapped invite controls. Replaced header clutter with one Invite disclosure.
- Short portrait screens clipped the player. Added a reserved region and explicit zero-minimum grid column.
- Cinema's removed trigger could not regain focus. Keep the trigger mounted and hidden while in cinema.
- Account overlay covered playback. Added an opt-in embedded account presentation.
- Library retry retained stale failure/authorization state. Added request-generation handling and fail-closed clearing.
- Consumption browsing imported upload/inspection helpers. Extracted a pure media-asset adapter.
- Two existing recommendation route factories were exported as unsupported Next route exports. Made the factories module-private; GET/PUT/POST behavior remains unchanged.
- Updated existing source-contract tests to reflect the approved lazy workspace boundary and whitespace-independent account copy checks.

## Design audit

Scoped Impeccable audit and manual visual review:
- Accessibility 3/4: labeled controls, keyboard/focus checks and readable tokenized text; physical-device/screen-reader certification is not claimed.
- Performance 3/4: bounded cards, lazy images and management/workspaces loaded on demand; no new provider polling.
- Responsive 3/4: eight viewport sizes and keyboard-sized layout checked; physical mobile Safari remains unverified.
- Theming 4/4: production UI uses project colors and typography/radius scales.
- Anti-patterns 4/4: catalogue card grids are the explicitly requested media-browsing structure; sample scenes are QA fixtures, not production imagery.

Remaining detector advisories are classified as contextual false positives: black in the media canvas/letterboxing and scrims/shadows preserves video contrast; the 8px numeral sits inside the rewind/forward icon, whose accessible name already says “10 seconds.” No ignore configuration or suppression was added.

## Integration limits and handoff

Live YouTube IFrame API did not produce a usable iframe within the bounded environment check. A controlled provider fixture verified the same iframe survives navigation and remains unobstructed at 200×200 or larger. This is not live YouTube playback certification.

Private catalogue/session APIs and permission changes were exercised through deterministic browser fixtures. Real R2 expiry, concurrent multi-user sync, provider search credentials and physical phone playback still require integration QA against the final combined branch. Other agents' expiry and Media Session/performance changes are not imported.

Review shared transport/account changes when combining branches. The original checkout's dirty work was preserved. No commit, push, deployment, schema, auth or hosted-data change was performed.

## User refinement QA — 5 September 2026

The Watch layout now reuses Listen's artwork extraction, fallback presets, ambient backdrop, presentation preferences and dynamic Slider. A Watch-only contrast guard lifts dark control accents to at least 4.5:1 against the brightest standard control surface. Active queue artwork is checked against the current source; direct YouTube sources use the provider thumbnail. Missing or failed artwork uses the stable preset. No new metadata polling or extraction algorithm.

Catalogue and YouTube & links are explicit paired choices. Returning preserves catalogue search; workspace scroll resets independently. The embedded composer keeps the shared controller, wraps its mobile actions and removes duplicate headings. Collection filtering uses a themed disclosure and native radio keyboard selection. Invite uses the existing full action layout with Escape/outside dismissal. More groups existing actions with matching icons, wrapping account tabs and an explicit Leave room link.

Manual review of the exact local route in Opera confirmed themed search, collection filtering, slim seek/volume sliders and aligned Invite actions. In-app 390x844 checks covered Watch, Add and More/account navigation. Screenshot review caught intrinsic grid width clipping on the full mobile player; explicit zero-minimum root columns resolved it. Eleven screenshots in qa/ were refreshed. The floating player remains moveable and scroll clearance lets controls reach an unobstructed area.

Verification:
- 29 browser tests passed: original 20 persistence/permission/layout checks plus nine refinement checks.
- 518 Node regression tests passed.
- Typecheck passed. Full lint: zero errors and one existing room-experience.tsx:206 navigation warning. Changed-file lint is clean.
- Final production webpack build passed; file policy: zero violations and 17 existing warnings; git diff --check passed.
- Scoped design detector: six contextual advisories for black letterboxing/scrims/shadows and the existing 8px rewind icon numeral. No suppression added. Root DESIGN.md documents the approved artwork accent exception.

Testing chronology: user screenshots and manual browser inspection supplied defect evidence. New automated refinement coverage was added after initial fixes. Viewport regression checks and final screenshot inspection exposed further clipping. This is post-hoc regression coverage, not a claimed test-first implementation.

Local preview: http://127.0.0.1:5381/dev/watch-design. This development-only fixture renders the actual WatchModeLayout; RoomExperience renders that same component with the real room controller. Fictional media and simulated services belong solely to the fixture. Live R2 renewal, live provider APIs, multi-user synchronization, physical mobile Safari and integration with the other agents' branches remain unverified. No Listen source, R2 delivery, schema, auth or remote data was changed by this refinement. No commit, push or deployment.

Re-run the browser command above with tests/e2e/watch-refinement.spec.ts included alongside the three existing Watch suites. Restart instructions and service limitations above still apply.

## Queue cleanup and fullscreen QA - 5 September 2026

The Watch queue now uses a scoped presentation without duplicate Add Media or inner headings. Its mode selector and actions form one desktop row and two compact mobile rows; existing queue callbacks and other queue presentations are preserved.

Fullscreen now belongs to the persistent Watch player wrapper. It uses the browser Fullscreen API and the existing transport callbacks, retains the video/iframe node, and returns to the prior workspace with focus restored. Controls include play/pause, seek, +/-10 and +/-30 seconds, previous/next, mute/volume, queue autoplay and exit. Relative seeks clamp to media bounds. Direct-video controls fade after inactivity, remain visible when paused or keyboard-focused, and reappear on interaction. The YouTube footer preserves unobstructed provider chrome. The legacy RoomExperience fullscreen listener is skipped only for Watch, and DirectMediaPlayer avoids duplicate native controls only for this wrapper.

Test-first evidence: before the fullscreen fix, the focused browser test failed because clicking Fullscreen video did not put the video inside document.fullscreenElement. It passed after implementation. Expanded tests cover actual video currentTime changes, retained media identity, seek bounds, local volume, existing room commands, denied controls, exit/focus restoration, fading, request rejection, portrait and landscape bounds. Queue presentation tests were added after its low-risk cleanup.

Final verification:
- 37 Watch browser regression tests passed across five suites, including two queue cleanup cases and six fullscreen cases. After final type-only/ref destructuring fixes and added actual-video seek assertions, all six fullscreen cases passed again.
- 518 Node tests passed; focused queue suite also passed 63 tests.
- Typecheck and production webpack build passed. Lint has zero errors and one pre-existing room-experience.tsx navigation warning (now line 208).
- File-length policy: zero violations, 17 existing warnings. git diff --check passed.
- Exact local route manually exercised in Opera: real fullscreen entry, seek/play interaction and exit. A browser-injected body isolation hydration warning was present before fullscreen; this is not claimed as a console-clean Opera session.
- Desktop and mobile queue/fullscreen screenshots are saved in qa/desktop-queue.png, qa/mobile-queue.png, qa/desktop-fullscreen.png and qa/mobile-fullscreen.png. Portrait and short-landscape bounds are covered in browser tests.

Preview remains http://127.0.0.1:5381/dev/watch-design. It renders production Watch UI with fictional media and simulated services. Controlled YouTube iframe persistence is verified; live YouTube playback, real room synchronization/R2 renewal and physical phone/Safari fullscreen are not certified. Browsers without element fullscreen show a clear error and retain Open cinema. No commit, push, deployment, schema or hosted-data change.

## Room identity and mobile QA - 5 September 2026

WatchRoomHeader now reuses ListenRoomSaveButton and ListenMemberAvatarRow. The existing avatar component accepts optional maxVisibleParticipants and themeStyle; Listen defaults remain unchanged. ListenPermissionsDialog receives optional portal styles and now has dialog semantics and a Tab loop. WatchRoomName uses the same liveRoom.renameRoom action as Listen (durable rename followed by the existing room reducer), with duplicate-submit prevention, whitespace normalization, Escape cancellation, canonical name updates, denied/disconnected disabling and visible errors. The existing save action and server authorization are unchanged.

The Watch trigger shows one avatar plus all other known members, including idle records, to fit the compact header. The dialog retains Active/Idle counts and original member controls. No new prior-membership persistence or history query was introduced. The Watch palette is passed through the portal, including shared primary tokens; status/host semantics remain independent.

Files in this follow-up: watch-room-header.tsx, new watch-room-name.tsx, watch-mode-layout.tsx (theme prop), watch-room.css, listen/header/header-participant-tools.tsx (optional props), listen/settings/settings-dialogs.tsx (portal theme/keyboard semantics), tests/fixtures/watch-design-fixture.tsx and tests/e2e/watch-header.spec.ts. Existing unrelated dirty work remains intact.

Test chronology: the initial header browser test failed before production edits because Room name textbox did not exist; the same test passed after implementation. Expanded regression tests verify save/unsave and failure state, rename commit/cancel/remote updates/failure retry, denied controls, focus restoration, portal palette and responsive bounds. The dev fixture simulates save Server Action responses only for its fictional room and records mock rename/member callbacks; no hosted state was changed.

Mobile stress QA found a genuine 2px overflow from the account avatar's crown (header scrollWidth 322 at a 320px viewport). Extra right padding contains the crown without clipping it. After the fix, all 14 header tests passed. Stress viewports: 320x568, 360x640, 390x844, 430x932, 667x375, 844x390 and 390x360; each includes an unbroken long room name, 24 long-named participants, member counts and scrolling to the last member. Additional 768px and 1440px checks cover header/dialog fit. The 390x360 case simulates reduced available keyboard height, not a physical OS keyboard.

Final checks: 14 header tests and all 11 existing refinement tests passed after the crown fix. The other 26 Watch regression cases passed in the preceding broader run; that run exposed the crown failure before correction. All 518 Node tests passed, including Listen header presentation coverage. Typecheck, production webpack build and diff whitespace checks passed; lint has zero errors and one existing room-experience navigation warning; file policy has zero violations and 17 existing warnings.

Manual in-app browser review confirmed the 320px dialog, 390px header, inline rename and save-star state. The first capture immediately after resizing briefly reflected the previous viewport scale; a settled capture and DOM bounds confirmed the actual 390px layout has scrollWidth 390 and the account button inside the viewport. Temporary viewport overrides are reset at handoff. Review images are in qa/header-*.png and qa/audience-*.png.

Preview: http://127.0.0.1:5381/dev/watch-design. This remains the real Watch layout with fictional dev services. Actual two-client rename propagation, durable saved-room persistence and physical phone/browser behavior remain integration checks; no commit, push or deployment.
