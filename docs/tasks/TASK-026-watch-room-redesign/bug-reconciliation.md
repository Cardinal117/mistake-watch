# TASK-026 bug and request reconciliation

Verified against origin/main f84a775, accepted application tree 0fb144fd9569146eb808f477180c5835249508cc, the current intake/index and open GitHub issues on 2026-09-05. Owner accepted physical Huawei Y9 Prime QA and authorized release. This is a scoped reconciliation, not a claim that every historical product bug is solved.

## Fixed and accepted in this task

| Report / request | Delivered behavior | Evidence |
| --- | --- | --- |
| Search focus glow, native collection selector, mismatched sliders and Invite | Listen-derived theme/slider primitives, restrained search focus, accessible themed collection disclosure and aligned Invite | Refinement browser tests and visual review |
| Missing artwork accents/background and unclear catalogue versus links | Current-media artwork palette and ambient presentation; explicit Catalogue / YouTube & links switch with retained browsing state | Theme, filtering, permission and navigation tests; owner QA |
| Missing save star, live rename and audience counts | Shared Listen save/member actions, inline canonical rename, themed Active/Idle dialog and keyboard focus | Header tests, two-client rename/permissions and owner QA |
| Duplicate queue adding and oversized controls/cards | Compact toolbar and rows, broad play target, Play next and secondary menu | Queue tests and owner QA |
| Arrow-only reorder and tedious removal | Drag with edge scrolling, one final reducer command, short reorder animation; swipe reveal/trash tap/second swipe; keyboard alternatives | Gesture/revoked-authority regressions and physical acceptance |
| Accidental room exit | Yes/No dialog from back and More, No focused, Escape/focus restoration | Browser tests, actual live dialog and owner QA |
| Nonfunctional fullscreen and missing overlay transport | Existing media wrapper fullscreen, play/pause, timeline, +/-10/30, previous/next, volume/mute, exit and clear failure state | Real video/currentTime/fullscreen tests, live browser and Huawei QA |
| Black mobile overscroll, clipped controls and blank landscape Home | Stable viewport/internal scrolling, reachable final content, full-width landscape Home and accessible transport | Eight responsive sizes, keyboard-height tests, phone QA |
| Large obstructive two-position mini-player | Smaller default, four corners, smooth drag/snap and expand; supported provider minimum viewport | Dock identity/bounds tests and owner QA |
| Cold Queue/Add chunk replaces room with loading | Dynamic panel-local loading boundaries preserve playing media while an uncached panel loads | Delayed actual-chunk browser regression |
| Choppy repeated YouTube corrections / delayed dock controls | Stable correction cadence under unrelated snapshots, bounded buffering/seek settling, immediate new canonical commands | 0ms/1600ms seek fixtures, shared player regressions and phone QA |
| YouTube automatic next skips opening seconds | Pause-at-zero preparation then guarded readiness acknowledgement starts canonical clock | Real local server clients, slow provider fixture, live start at 0.035897s, phone acceptance |
| Duplicate embedded transport | Supported Watch controls=0 plus room timeline/transport; branding/start prompts retained | Provider configuration/identity tests and owner QA |
| Integration authority regressions found during QA | Permission snapshots match online member/role authority; route-factory exports removed to satisfy Next production-route constraints without changing authorization | Integration notes, permission/route regression suites and two-client checks |

## Existing reports: disposition after comparison

| Existing report | Outcome |
| --- | --- |
| MW-BUG-004 uploaded expiry freeze | Already resolved by TASK-024 / merged PR #11. Preserved; TASK-026 separately verified continuous R2 playback beyond 30 minutes and an unbuffered seek. No Worker or lease changes here. |
| MW-QOL-002 drag/drop queue | Watch portion delivered and accepted. Keep active as In progress: Listen queue gesture parity was not changed or certified. |
| MW-BUG-006 host refresh minutes away from participant | Related startup/correction improvements and canonical rejoin tests pass, but the specific multi-minute affected-profile report was not reproduced. Keep Needs reproduction. |
| MW-BUG-003 Google redirect black player | Bounded recovery remains intact; successful Watch navigation is not proof of affected-profile recovery across Watch/Listen. Keep In progress. |
| MW-BUG-014 provider too-many-requests | No affected-versus-working throttling capture. Keep Needs reproduction. |
| MW-BUG-009 high browser resource usage | Phone responsiveness and bounded UI work improved. TASK-015C's measured laptop/animated Listen performance matrix remains open. |
| MW-QOL-001 simplify Listen embed | Supported native-control reduction applies to Watch. Listen copy-link/provider-action scope remains Planned. |
| MW-QOL-003 Media Session authority | Existing authority preserved; unfinished owner-checkout Media Session edits remain excluded. Keep Needs verification. |
| MW-QOL-005 local volume persistence | Shared existing storage retained. No separate affected-case closure asserted. |
| MW-BUG-001 long-name admission | Header stress tests cover display, not the historical admission failure. Keep Needs reproduction. |
| MW-BUG-002 / 007, MW-FEAT-003 Account Rooms | Room save integration passes, but sign-out/cross-account lifecycle reports need their existing acceptance matrix. Leave active. |
| MW-BUG-011 Room Picks toast | Catalogue/details permissions tested; original Listen recommendation-action report not reproduced. Leave Needs verification. |
| MW-OBS-001 participant cache warning | No dedicated missing-row reproduction/diagnosis. Leave active. |
| MW-OPS-002 documentation refresh | README, product, roadmap, handoff, commands, sync docs and TASK-026 reconciled here. Broader living-documentation audit remains separate. |
| GitHub #6 CloudConvert webhook, #7 direct metadata access | Separate security reports remain open. No webhook/RLS/schema remediation or security closure is implied by Watch QA. |

Other feature/QoL/operations entries are outside this accepted slice. The original checkout's new personal/global-room Quick Capture, TASK-025 draft and unfinished performance/Media Session files were inspected read-only and are not imported or overwritten. Recommendation-engine expansion remains follow-up work under TASK-002.10F, not a shipped provider-account feed.
