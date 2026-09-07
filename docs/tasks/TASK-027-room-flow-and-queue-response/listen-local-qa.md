# 027.4 local implementation evidence

Current checkpoint (2026-09-07): owner local QA accepted. Git/push and live QA deployment authorized; final merge follows live two-participant acceptance. Historical pending statements below describe their individual checkpoints. See [release candidate](release-candidate.md).

Approved 2026-09-07; local only. Baseline 1b17dd4. Existing generated line-ending
noise and next-env development paths remain outside this slice.

Provider feasibility: existing Listen owns the provider inside NowPlayingPanel.
Preserve that mounted tree through navigation. Direct media already uses an
artwork presentation. YouTube requires a visible viewport of at least 200x200:
https://developers.google.com/youtube/player_parameters . Owner explicitly chose
small visible YouTube player above compact controls while browsing. No hidden
YouTube/audio-only substitute. Expanded view retains the same embed.

Test-first: added real Listen layout route using existing local room fixture and
browser workflow for retained provider, paused bar, expand/minimize and empty state.

Owner follow-up: make Discover room-pick cards mobile-friendly while preserving
recommendation sources and existing actions; include touch sizing and long titles.

Overlap review: original checkout has uncommitted TASK-006 Media Session wiring
in ListenModeLayout; TASK-025 is still a proposed broader performance packet.
Neither was imported or edited. This work preserves existing transport authority;
Media Session integration must be reconciled separately before release.

## Implemented candidate

- Responsive shell keeps the same NowPlayingPanel ownership path on phone,
  landscape and desktop; the desktop rail/header/discovery/queue remain available.
- Home, Queue, Add, Social and More; visited destinations retain their DOM/scroll.
- Direct-media compact bar and owner-selected visible YouTube viewport above its
  compact controls (a side column in short landscape). No duplicate providers.
- Tap/keyboard expansion, upward handle drag, downward minimize, cancellation,
  previous browse restoration and child-dialog-first Escape handling.
- Gestures settle at 64px travel, or 24px with >0.5 px/ms average velocity;
  movement <=6px counts as a click. Pointer cancellation returns to the starting
  state; keyboard activation stays usable after cancellation. Only the handle
  owns touch-action:none; transport and workspace scrolling remain independent.
- Height settles over 220ms; reduced-motion follows the global effectively-zero
  transition policy. Drag progress stays local, never a room command.
- Paused/buffering source retains access; no source removes bar/reserved space.
- Shared compact queue with optimistic movement/virtualization and permissions;
  More reuses room/account controls without dead Room/Members sub-tabs.
- Mobile Discover cards have two-line titles, 44px action rail, clear artwork
  play affordance, horizontal swiping/Browse all; desktop cards are unchanged.
- Workspace module loads on demand; hidden visualizer receives inactive state.

## Verification chronology and outcomes

Initial navigation test failed because Listen room navigation did not exist.
An initial fixture assertion incorrectly expected video; corrected to the existing
Listen audio element before accepting the navigation failure as RED evidence.
The same navigation/provider/paused/empty-state test now passes.

Breakpoint test separately failed on the prior conditional mobile/desktop branch:
the audio identity was lost. A stable responsive ownership tree fixes it; the
same test now passes through mobile -> desktop -> mobile.

Additional gesture, geometry, card, transport and permission tests are post-hoc
coverage, not retroactively claimed as test-first. They exposed and resolved a
compact preparation-strip overlap, landscape artwork alignment, browse scroll
clamping on expansion and a 198px iframe interior caused by borders. Test timing
was corrected to await animation settling before measuring/starting a drag. The
reduced-motion assertion accepts the existing global 10-microsecond transition,
which is effectively immediate, rather than requiring an exact CSS 0s string.

16 browser checks passed (12 Listen plus 4 Watch regressions), including actual
local HTMLAudio play/pause/seek, provider identity, touch-cancel/keyboard/Escape,
permissions, 1000-row bounded queue, mobile card action bounds, portrait390,
landscape844, narrow320 and desktop1440. The YouTube test uses an iframe lifecycle
fake: it proves geometry and identity, not live YouTube audio or network behavior.
Screenshots inspected for expanded/compact/direct/YouTube/desktop/discovery states.

Fresh full Node suite: 608/608 passed. Typecheck and production webpack build
passed. File policy: 0 violations, 18 existing warnings. Git diff check passed.
The fixture remains development-only under WATCH_DESIGN_QA=1.

## Review and remaining gates

Review http://127.0.0.1:5383/dev/listen-design . Watch remains available at
http://127.0.0.1:5383/dev/watch-design . Start with WATCH_DESIGN_QA=1 and Next dev
--webpack --hostname 127.0.0.1 --port 5383 in this isolated worktree.

Owner acceptance, physical Huawei/keyboard/fullscreen rotation and real YouTube/R2
playback remain open. Reconcile the original checkout's Media Session work before
release; no claims of new hardware-key/background support. Existing TV mode is
preserved; TV retains its pre-existing ownership branch and is not included in
compact/expanded continuity claims. No commit, push, merge or deployment in 027.4.

Post-build preview smoke: all 4 checks passed (navigation, mobile cards, real
local HTMLAudio transport and YouTube lifecycle fixture). Full-source lint passed.

## Owner rejection and focused follow-up

Owner rejected the initial visual QA on 2026-09-07: duplicate Up Next/preparation
rows, missing account header control, Discover scrolling failure and oversized
cards. Prior test counts did not establish these interactions. Current scope:
reproduce scrolling with actual wheel/touch input; compact accented thumbnails
expand to existing actions on tap and collapse on outside interaction; restore
account control adjacent to audience; fix Up Next navigation/duplication. Return
to wider player/swipe review only after this focused pass.

Owner also requested desktop audience/permission controls beside the account icon,
matching Watch. Included in this focused header follow-up; desktop card layout remains unchanged.

### Focused follow-up verification (2026-09-07)

Implemented mobile account entry beside audience (Google photo with avatar fallback),
and moved the desktop audience/permissions module immediately before the existing
account panel button. Browser checks verify adjacency, spacing and account opening
at 390px and 1440px. Desktop retains its existing account/settings surfaces.

Discover now has one vertical scroll owner. A real wheel gesture over its cards
advances the outer scroll position. Mobile cards start as 112px accented thumbnails;
tapping reveals the existing action card without playing media, and outside
pointer/focus interaction collapses it. Reduced-motion styling suppresses motion.
Up Next routes to mobile Queue, and the redundant mobile preparation strip is removed.
Expanded player workspaces are hidden behind the player instead of leaking headings.

Fresh verification: 20/20 browser checks passed (Listen flow/provider lifecycle,
owner follow-ups and Watch detail/menu regression), TypeScript and scoped ESLint
passed, and diff whitespace check passed. Inspected screenshots at 320px, 390px
and desktop 1440px. The prior production build predates this follow-up; these are
local browser/static checks, not production or physical-device acceptance.
The YouTube check remains an iframe lifecycle fixture, not live provider playback.
Owner review remains open. No commit, push or deployment performed.

### Approved Home navigation correction

Home opens browsing with the compact player, including initial mobile entry.
Only tapping/swiping the player bar expands it. Expansion uses the same full
content area below the room header and above bottom navigation on every tab;
hide the Watch/Listen switch while expanded. Home swipe left selects Discover,
swipe right selects Visualizer. Preserve vertical scrolling and horizontal card
rails; gestures on interactive controls/cards must not switch workspace views.
Keep the existing player mounted and keep desktop behavior unchanged.

### Additional approved interaction polish

Keep a released queue row above its siblings and place it at its optimistic
position immediately, avoiding a second travel animation from its original slot.
Retain neighbor displacement motion and canonical server confirmation/rollback.
Discover cards need a matching return animation on outside dismissal, with
reduced-motion support. These shared queue fixes must also be regression checked
in Watch; no synchronization protocol changes are intended.

### Home and motion follow-up verification (2026-09-07)

Home entry/navigation now keeps the player compact. Explicit expansion hides the
mode toggle and uses identical header-to-bottom-navigation bounds on Home/Queue.
Actual emulated touch swipes select Discover left and Visualizer right; native
scrolling and card rails are excluded from workspace gesture ownership.

Shared virtual queue release previously removed the held row's elevation and
re-enabled its slot transition, causing a second travel from the old index beneath
siblings. Keep the released slot elevated and skip that second transform animation
for the 200ms settlement period; neighbor animations remain. Existing optimistic
projection and canonical confirmation/rollback behavior are unchanged.
Listen and Watch browser tests verify final index, topmost hit target, no slot
animation on the next frame, with server confirmation deliberately delayed 1200ms.

Card outside dismissal now reverses into the thumbnail over 180ms. A browser check
observes the closing animation and verifies immediate reduced-motion dismissal.
Home initially failed the two new checks; both passed after the correction.
The broader run passed 19 checks; its Watch drop test used the wrong navigation
label and was stopped. Corrected focused run: all 5 passed, including Watch drop.
Typecheck and scoped ESLint passed. Home expanded/browse screenshots inspected.
These are local fixture checks; owner and physical-phone acceptance remain open.

### Approved integrated Home toolbar

Merge mobile Home controls into one transparent toolbar below the identity header:
icon-only Watch/Listen pair (existing Video/Headphones icons, accessible labels),
a subtle divider, then Discover/Visualizer text tabs with dynamic accent underline.
No nested pill containers. Retain 44px touch targets at 320px. Hide it while the
player is expanded and outside Home. Share stage selection with swipe gestures;
preserve existing mode-switch authority, transition/error handling and desktop UI.

Owner also requested that the Listen account/settings icon open the same settings
surface as Watch. Reuse Watch's Room & account workspace (mode, invite/save,
embedded account sections, authorized library management and leave confirmation)
in Listen More. Preserve Listen-specific TV mode entry and existing authorization.

### Integrated toolbar and settings verification

Mobile Home now has one toolbar: existing Video/Headphones icon controls, divider,
and Discover/Visualizer text tabs with the live artwork-accent underline. The mode
switcher reuses its existing pending/error/authority behavior; icon-only presentation
is opt-in so other rooms retain their labels. Mobile stage selection is shared with
Home swipes; desktop retains its existing stage selector.

Listen More now renders WatchWorkspaces' actual Room & account section instead of
its older abbreviated room-tools view. It includes the embedded AccountCommandPanel,
mode, invite/save, owner library management and leave confirmation. Existing library
management component is lazy-loaded and owner-gated. Listen TV entry remains.

18/18 local browser checks passed: toolbar geometry and 44px targets at 320/390/844,
Home swipe/expansion, card return/reduced motion, retained audio/transport, and
Watch/Listen account section parity including clicking each account section and
opening/dismissing leave confirmation. Inspected toolbar and account screenshots.
Typecheck and scoped ESLint passed. Owner/physical-device acceptance remains open;
no commit, push or deployment performed.

## Approved shared settings categories and Watch toolbar parity

Local-only scope: Watch Home/Add/More get the integrated icon mode switch and
Catalogue/YouTube & links toolbar; no Watch swipe navigation. Listen More keeps
its Discover/Visualizer toolbar as a route back to Home. Shared settings initially
show category buttons, not all controls: Profile, Appearance, Room, People &
permissions, My rooms, Privacy & account, and owner-only Library management.
Open one category with Back to settings; leave confirmation stays separate.
Reuse existing account content, room actions and permissions without changing
backend authority. Match mobile padding, dynamic accent, >=44px targets and
scrolling above the compact player/navigation. Check desktop for regressions.

Additional approved Social scope: both modes expose a compact expandable Invite
people bar at the top of Social, containing the existing room-code copy, invite
link copy and native share/fallback actions. Use the shared InviteActions component,
keyboard-accessible expansion and reduced-motion handling; no new invitation logic.

Listen Social chat follow-up: add 24px separation below members, remove inherited
full-height chat sizing, bound the message viewport to mobile screen space, keep
composer/log aligned to the existing 16px page inset, and use a 44px Send target.
Baseline browser check caught the undersized Send button; screenshot confirmed
members/chat touched and the empty chat viewport consumed excessive height.

Listen Social members parity: remove the legacy ListenMobileRoomTools wrapper and
its inner scroll/padding layer. Watch and Listen Social now use one shared member
section with the identical MembersPanel props, connected authority gate and controls.
Preserve the compact invite bar and separate Listen chat spacing below members.

### Category/settings/Social final local checkpoint

Shared RoomSettings category menu now opens one section at a time, reuses existing
account content directly, restores category-button focus on Back, and preserves
room/people authority checks and owner-only management. Watch Home/Add/More reuse
the integrated mode/source toolbar without swipe navigation. Listen More retains
its toolbar as a direct return to Home. Removed duplicate Listen settings padding.

Social in both modes now uses SocialInviteBar and SocialMembers. The latter replaces
Listen's legacy outer frame and constrained inner scroller; member data, permissions
and controls are identical. Listen chat has 24px separation, bounded message area,
aligned composer and 44px Send control.

Verification: category/toolbar checks passed at 320/390 and Watch desktop1440;
existing Listen desktop control preserved. Watch detail/menu regression 4/4 passed
with its selector updated from the old source group to the new tablist. Latest Social
pass 4/4: shared member text/control/width parity, both invite copy/share actions
(stubbed, no external sharing), and chat composer spacing above the compact player.
Screenshots inspected. Final TypeScript and scoped lint passed; whitespace diff
check passed. Production webpack build passed before the final chat/member-only
follow-ups; those follow-ups were checked in the local browser and with TypeScript.
Local dev server restored on5383. Owner/physical-phone QA remains pending.
No commit, push, merge, deployment or backend authority change.

Owner correction: expanded Listen mobile player reaches the top of the viewport,
covering the identity header as well as the Home toolbar. Keep bottom navigation
and minimize handle available; covered header is inert. Apply the same top edge
across destinations and orientations, with safe-area padding for the handle.

Drag precision follow-up: replace pointer-frequency React progress updates with
one animation-frame CSS update on the retained player element. Measure travel from
the actual shell height, bottom navigation and compact bar. Preserve the latest
visual progress across unrelated room renders; settle/cancel restores state once.
Track pointer identity and suppress click after a drag even if the finger returns.

### Full-height expansion and drag verification

Expanded Listen player now reaches viewport y=0, covering the inert room identity
header while preserving bottom navigation and minimize. Safe-area inset protects
the handle. Portrait/landscape tap and emulated touch swipe checks passed.

Expansion drag updates only a retained CSS property at most once per animation
frame, rather than rerendering the entire mobile layout on each pointer event.
Travel uses measured shell/navigation/compact dimensions, including short-landscape
YouTube geometry. Release/cancel returns to authoritative UI state once. Provider
ownership and room playback authority are unchanged.

Focused browser checks passed for finger-to-panel movement at 30/60/90/120px,
progress surviving a fixture room queue update during the hold, cancellation,
reduced motion, dialog dismissal and retained audio. Earlier 8-check flow pass and
final focused 2-check pass succeeded. TypeScript and scoped ESLint passed. These
are local/emulated checks; physical Huawei drag feel still needs owner review.
