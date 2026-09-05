# Acceptance criteria

- Familiar left-player/right-discovery desktop composition; Cinema makes video dominant.
- Same video/iframe instance and source across navigation, dock movement and breakpoint changes; no playback command from navigation.
- Fixed consistent mobile navigation, visible usable player, no horizontal overflow at 360/390px portrait or short landscape; last content/control reachable.
- Explicit details before playback replacement, distinguish Play now/next/add; denied and disconnected actions unavailable; server errors visible.
- Authorized library ready items, real collection counts and searchable history; forbidden catalogue metadata not rendered; no recommendations fabricated from queue.
- Bounded initial catalogue rendering and lazy private posters; search/filter resets window correctly; visible counts honest.
- Full existing queue management, source adding, participants, chat, account/settings and owner library management remain reachable.
- Focus visible; keyboard navigation and Escape restoration; accessible dock movement without drag; reduced motion support.
- Player, queue, media/privacy regressions, typecheck, lint, build and file-length gate pass. Browser fixture tests are distinguished from real backend/provider and physical mobile QA.


## Refinement acceptance

- Watch reuses Listen's artwork extraction, backdrop, preference variables and Slider; active media changes the room palette without remounting the player. Dark accents remain readable; absent or failed artwork has a stable fallback.
- Search focus uses the surrounding field border; collection options are themed, keyboard selectable and dismissible. Invite buttons fit inside their popover with 44px targets and Escape/outside dismissal.
- Catalogue and YouTube & links remain explicit paired choices. Returning preserves catalogue search. Switching workspaces resets the workspace scroll to its heading.
- More account destinations wrap on phones, Leave room is reachable above the dock, and link actions do not overflow. Full Watch fits 320/390/430px widths.

## Queue and fullscreen follow-up acceptance

- Watch Queue has no duplicate Add Media button or inner section heading; mode, Shuffle, Smart and Clear use a compact responsive toolbar. Dedicated adding remains reachable.
- Fullscreen opens the existing media player through the browser Fullscreen API, with no source change or remount. It exits to the prior workspace and restores focus.
- Fullscreen includes play/pause, seek bar, backward/forward 10 and 30 seconds, next item, mute/volume and exit. Shared room permissions still govern playback; volume remains local.
- Direct-video controls fade during playback and return on pointer/touch/keyboard interaction; paused controls remain visible. YouTube controls sit below the iframe to preserve provider chrome.
- Unsupported or rejected browser fullscreen requests show a visible error. Physical mobile browser support and live provider/backend behavior are explicitly distinguished from fixture QA.

## Room identity acceptance

- Save star sits beside the name and uses the existing Listen save action and authority rule.
- Connected authorized members rename by clicking the title: Enter or blur commits through liveRoom.renameRoom; Escape cancels. Canonical name changes remain visible, failed saves preserve the draft and show an error.
- The shared avatar/count trigger opens Listen's existing Active/Idle member dialog, with counts and original authority actions. The compact Watch trigger shows one avatar plus the number of remaining known members. Idle records are not a new historical membership service.
- The portal retains the Watch palette, traps Tab within the dialog and restores focus on close/Escape.
- No horizontal overflow from long names, count badges or crowns at 320/360/390/430px; member lists remain scrollable to the last item in portrait, landscape and reduced-height keyboard layouts.

## Final phone refinement acceptance

- Compact Watch queue rows retain large play targets, Play next, menu/keyboard alternatives and permission checks.
- Dragging to any queued position scrolls at the content edges and submits one final move. Swipe reveal, trash tap and second-swipe removal are distinct from vertical scrolling or playing.
- The smaller dock moves to four corners, expands, honors reduced motion, and never recreates the provider on navigation.
- Back/More leave require Yes/No confirmation; No/Escape preserve the room and restore focus.
- Slow YouTube automatic-next preparation preserves opening seconds. Stale readiness cannot override a newer room command. Joining clients catch up without restarting the source.
- Desktop, small portrait, landscape and keyboard-height layouts remain reachable without document overscroll or horizontal clipping.
- Owner physical Huawei QA accepted all requested final interactions on 2026-09-05. This does not certify unrelated affected-user provider bugs or physical Safari support.
