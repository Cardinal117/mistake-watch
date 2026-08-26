---
id: TASK-021-REVIEW
status: in-progress
related: [TASK-021]
updated: 2026-08-26
---

# TASK-021 Review Notes

## Planning Decision - 2026-08-25

- Documentation level: full packet because this is a major, responsive,
  cross-component UI redesign with provider, queue, permission, and visualizer
  regression risk.
- TASK-021 is used because TASK-020 is already occupied by parallel work.
- No HTML artifact was generated. The Markdown packet is sufficient for the
  current owner/agent workflow and avoids unnecessary documentation overhead.
- No application code, Git staging, commit, push, deployment, database, or live
  room mutation is authorized by this packet.

## Testing Classification

- **Characterization-first:** playback, queue derivation/virtualization,
  provider mounting, room Save state, existing participant-count meaning, and
  current visualizer capability/fallback behavior.
- **Test-first:** Discover/Visualizer state behavior, mirrored Like controls,
  responsive Up Next limits, participant-cluster entry, owner/member/guest
  permission visibility, and focus restoration.
- **Test-first for Discover:** shelf source mapping, deterministic ordering,
  stable deduplication, cross-shelf fallback, card-command identity, and
  independent loading/error behavior.
- **Characterization-first for Discover:** current TASK-011 result composition,
  provider fallback, queue commands, Like state, and room-playlist semantics.
- **Visual-QA required:** surface spacing, background breathing, border/radius
  hierarchy, dynamic color treatment, long names, and reference fidelity.
- **Manual production gate:** Google identity, two-participant synchronization,
  uploaded playback, YouTube provider behavior, and affected-laptop resource
  comparison.

The first meaningful Discover red gate should prove that one input snapshot
produces the approved shelf order and honest labels while preserving stable
media identities. Follow with failures for within-shelf deduplication,
provider-error isolation, and card commands after a Browse All transition.
These tests must exercise observable derivation and command behavior rather
than search source text or mirror component markup.

## Open Implementation Decision

TASK-021 changes YouTube framing in its first release, not provider behavior.
An artwork-first/minimized YouTube presentation remains unapproved until its
provider-policy and playback implications are reviewed separately.

Ambient Waveform is approved for a measured prototype only. Static Artwork
remains the shipping fallback unless the prototype passes performance,
accessibility, honesty, and deterministic cross-client checks.

## Discover Planning Decision - 2026-08-25

- The approved reference is adopted as a multi-shelf presentation direction,
  not as authorization for new recommendation or account data sources.
- `From your playlists` is replaced by `From playlists in this room` until a
  separately approved OAuth/provider feature supplies real account playlists.
- Room Picks, contextual recommendations, room history, playlist matches, and
  Most listened are existing contracts reorganized into one browse surface.
- No HTML artifact was added; `discover-design.md` is the canonical detailed
  comparison and implementation contract.

## Batch A Evidence - 2026-08-25

- Scope stayed within the approved shell contract: open desktop gutters,
  rounded floating player rail, transparent workspace composition, compact
  top command spacing, and collapsed-queue alignment.
- Playback, provider, queue, recommendation, permission, and room-state logic
  were not changed.
- Reference-width QA at `1680x943` measured a `12px` outer inset, `16px`
  rail-to-workspace gap, `403px` player rail, and queue/workspace left edge at
  `431px`, with no horizontal document overflow.
- Responsive checks passed at `1440x900`, `1280x720`, `1024x768`, `768x1024`,
  and `390x844`. Narrow layouts retained the existing stacked behavior.
- The occupied local room check used a real YouTube provider and three queue
  items. Provider mounting, Room Picks, Up Next, and queue state remained
  functional.
- Automated gates passed: `npm test` (`476/476`), typecheck, ESLint,
  file-length policy with zero violations, changed-file Prettier,
  `git diff --check`, and the production build.
- Deliberately deferred: participant entry, Save-star placement, player control
  redesign, expanded Up Next, Discover shelves, Visualizer stage, and the
  floating queue treatment. Those remain Batches B-F.

## Batch B Evidence - 2026-08-25

- Test-first chronology was preserved. The owner/member/guest and participant
  count gate failed `3/3` before the presentation contract existed, then passed
  after implementation.
- The host-only Save Room action now appears as a dynamic-accent star beside the
  room name. Members and guests cannot render or invoke that action; the
  existing server-side host check remains unchanged.
- The right-aligned participant cluster shows up to three online avatars and
  preserves the existing remainder calculation across additional online and
  idle participants. The cluster opens the existing audience/permissions
  dialog for every admitted role.
- Owner controls remain governed by `liveRoom.canManageAuthority`. Browser QA
  confirmed that a guest audience view exposes no grant, revoke, kick, or
  removal actions.
- Opening the audience dialog moves focus to its Close control. Closing by the
  button or `Escape` returns focus to the participant cluster.
- Desktop Settings no longer duplicates Save or Permissions. Account identity,
  room Settings, Add Media, and TV Mode remain separate controls. Mobile keeps
  its existing Settings-menu Save and Permissions entries.
- Responsive browser QA passed at `1440x900`, `1280x720`, `1024x768`,
  `768x1024`, and `390x844`, with no horizontal overflow. A clipped participant
  control found at `1024px` was corrected by bounding the header grid tracks.
- `header-tools.tsx` was reduced to `496` lines by extracting the participant
  and Save controls into a focused `177`-line module. The file-length gate now
  reports one fewer warning than Batch A.
- Automated gates passed: focused tests (`3/3`), `npm test` (`479/479`),
  typecheck, ESLint, file-length policy with zero violations, changed-file
  Prettier, `git diff --check`, and the production build.
- Deliberately deferred: player/provider framing, transport refinements,
  expanded Up Next, Discover shelves, Visualizer stage, and floating queue work.
  Those remain Batches C-F.

## Batch C Evidence - 2026-08-25

- Test-first chronology was preserved. The immediate queue-preview contract
  failed `3/3` before its presentation helper existed, then passed after
  implementation.
- The provider remains the existing YouTube or direct-media player. Batch C
  changes only the clipping surface and presentation; it does not alter source
  selection, iframe lifecycle, direct playback, autoplay, or room authority.
- Play/Pause is now the strongest circular transport control. Previous, Next,
  Shuffle, Repeat, Fullscreen, and the existing shared Like controller retain
  their established commands and permission gates.
- The local volume row now exposes a numeric percentage without publishing
  volume into room state.
- Up Next derives a copied preview of at most the first three canonical queued
  items. CSS reveals three rows at wide desktop, two at tablet/portrait widths,
  and one on compact mobile without recalculating or reordering queue data.
- Every visible preview row and the queue summary open the existing full queue
  drawer. No row fakes a context menu or mutates queue state.
- Automated gates passed: focused tests (`3/3`), `npm test` (`482/482`),
  typecheck, ESLint, file-length policy with zero violations, changed-file
  Prettier, and the production build.
- User QA accepted the three/two/one Up Next presentation at all target widths,
  preview-to-drawer opening, native YouTube controls inside the rounded frame,
  and one second-participant media transition.
- Deliberately deferred: Discover shelves, Visualizer stage, and floating queue
  treatment. Those remain Batches D-F.

## Batch D Evidence - 2026-08-25

- Test-first chronology was preserved. Four new derivation tests failed only
  because the shelf builder did not exist, then passed after implementation.
- One bounded input snapshot now produces Room picks, contextual provider or
  room-history results, recent room history, honest room playlist matches, and
  Most listened in the approved order. Shelves deduplicate stable playable
  sources without changing source ranking.
- The old filter tabs and portrait recommendation rail were replaced with
  compact landscape shelves. Existing Play Now, Queue, Play Next, Like,
  availability, and permission callbacks remain the command boundary.
- Provider recommendations use one request and one optional first-party ranking
  pass. Provider failure affects only the contextual shelf and falls back to
  room history with explicit copy.
- Browse All remains inside Discover. Browser QA found and corrected a stale
  trigger-node focus defect; Back now restores focus by stable shelf trigger ID.
- Shelf arrow buttons and keyboard Left/Right use native bounded scrolling.
  Artwork uses fixed placeholders, lazy loading, and asynchronous decoding.
- The occupied throwaway room rendered five shelves with no console warnings or
  errors. Measurements showed five visible cards at `1680px`, three at
  `1024px`, and one full `221px` card plus a `52px` next-card hint at `390px`.
  Every width had zero horizontal document overflow.
- Automated gates passed: focused Discover and recommendation UI tests
  (`17/17`), `npm test` (`487/487`), typecheck, ESLint, file-length policy with
  zero violations, changed-file Prettier, `git diff --check`, and the production
  build.
- The Discover/Visualizer segmented control remains coupled to Batch E so this
  batch does not expose an empty or misleading Visualizer destination.
- User QA accepted the Discover surface, player framing, three/two/one Up Next
  rows, preview-to-drawer action, native YouTube controls, and a
  second-participant transition.
- Deliberately deferred: the functional Visualizer stage and floating queue
  treatment. Those remain Batches E-F.

## Batch E Evidence - 2026-08-25

- Test-first chronology was preserved. The stage-view, capability-presentation,
  and Ambient sample contracts failed because the new exports did not exist,
  then passed after implementation.
- Discover and Visualizer now form one accessible segmented workspace. Both
  controls remain keyboard reachable, and the Discover panel stays mounted but
  hidden so switching does not refetch its data or remount the media provider.
- Visualizer presents the selected compatible renderer in a bounded central
  stage with active title, artist, progress, capability status, and the same
  `MediaPreferenceController` used by the player Like action.
- Missing local detail or shared rhythm reports the exact missing capability and
  renders Static Artwork instead of a blank or fabricated visualization.
- Browser QA preserved one unchanged YouTube iframe while switching workspaces.
  The stage remained overflow-free at `1680x943`, `1280x720`, `1024x768`, and
  `390x844`; the narrow layout retained both workspace controls and readable
  status copy.
- The development-only Ambient Waveform prototype uses one bounded `12 FPS`,
  DPR-1 canvas with 48 deterministic mirrored samples and no blur. A five-second
  active browser sample mounted one `1187x221` canvas and recorded zero long
  tasks. Paused, hidden, and reduced-motion paths stop its frame loop by design.
- The prototype remains disabled unless
  `NEXT_PUBLIC_ENABLE_AMBIENT_WAVEFORM_PROTOTYPE=true`. This local measurement is
  not sufficient to promote it; Static Artwork remains the shipping fallback.
- Automated gates passed: focused renderer/stage tests (`17/17`), `npm test`
  (`490/490`), typecheck, ESLint, file-length policy with zero violations,
  changed-file Prettier, `git diff --check`, and the production build.
- Deliberately deferred: the floating queue treatment and integrated responsive
  release gate. Those remain Batch F.

### Batch E User QA Follow-up - 2026-08-26

- User visual QA accepted the Visualizer workspace.
- During the same integration pass, switching an actively playing YouTube item
  from Listen to Watch reproduced `MW-BUG-003`: the provider surface entered a
  persistent `ERR_TOO_MANY_REDIRECTS` state attributed to `www.google.com`.
- The supplied console log contained sustained iframe `postMessage`
  target-origin mismatches but no Mistake Watch route redirect. Repository
  inspection confirmed that the mode switch replaces one
  `YoutubeMediaPlayer` instance with another.
- TASK-021 visual work remains accepted, but Batch F is blocked until the
  serialized iframe handoff passes focused lifecycle tests and repeated local
  mode-switch QA.
- The focused correction passed five active local mode-switch cycles with one
  iframe per state, no redirect frame, no console error, and canonical playback
  recovery. Batch F remains paused only for affected-browser production
  verification, not for further visualizer implementation.

## Visual-Parity Correction - 2026-08-26

- User comparison against the approved reference identified four missed
  composition details after Batch E: a detached Discover/Visualizer band,
  excessive player-to-workspace spacing, an unbounded Discover page, and Like
  actions that read too small or too square.
- The room Save star now follows the variable-width title directly. Browser
  geometry measured a stable `4px` title-to-star gap without changing Save Room
  semantics.
- The player rail and workspace use bounded responsive sizing. Follow-up
  compaction settled the desktop rail at `clamp(380px, 22.5vw, 420px)` while
  preserving the reference-width `420px` rail at `1870x920`.
- The mode/search bar, shared stage, and collapsed queue retain identical
  desktop edges. Earlier reference-width measurement produced zero left/right
  edge delta between all three surfaces. Final `1680x943` geometry leaves a
  `17px` mode-to-stage gutter and a `16px` stage-to-queue gutter, so the queue
  no longer covers Discover rows or Visualizer controls.
- The segmented switcher is now positioned inside one continuous content stage.
  Discover owns a bounded vertical `overflow-y:auto` viewport, and the
  Visualizer artwork extends behind the switcher instead of beginning beneath a
  separate dark row.
- Static Artwork confines the provider thumbnail to the Visualizer stage. A
  clear `object-cover` layer sits above a low-opacity blurred fill and palette
  gradient, while the surrounding room uses palette gradients only.
- Player Like uses a larger borderless inline heart; Visualizer Like remains a
  circular action. Compact recommendation-card hearts keep their existing size.
- Browser checks passed at `1870x920`, `1680x943`, `1280x720`, `1024x768`, and
  `390x844` with no horizontal document overflow. Discover remained contained,
  the Visualizer artwork was present, and Discover/Visualizer switching kept one
  unchanged YouTube iframe.
- The local browser still reports pre-existing Spacetime readiness errors during
  initial room connection. No new interaction-specific error appeared during
  stage switching or queue checks.
- Automated verification passed: focused tests (`25/25`), full test suite
  (`494/494`), typecheck, ESLint, file-length policy with zero violations,
  changed-file Prettier, `git diff --check`, and the production build.
- Full Batch F remains open: the expanded drawer, safe-area behavior,
  large-queue interaction, and integrated production-candidate gate have not
  been claimed complete.

## Density, Command, And Palette Correction - 2026-08-26

- Test-first coverage was added for duplicate recommendation queue intent,
  Play Next priority, deterministic Browse state, dominant/minority artwork
  palette separation, noisy-pixel rejection, and safe fallback behavior.
- Browser inspection found that the full-width transparent workspace-switch
  wrapper intercepted Back to Discover. Only the visible pill now accepts
  pointer events, and Browse content reserves the switch height at every
  breakpoint. Browser QA confirmed `Back to Discover` returns to all three
  shelves.
- Recommendation Add to Queue and Play Next now issue explicit source commands
  with duplicate intent. In the disposable room, Add to Queue changed the
  queue from `1` to `2`, and Play Next changed it from `2` to `3` without
  remounting the provider.
- Compact landscape cards now measure `208x116px` at the reference desktop
  width. Shelf tracks can display six cards at `1870px` when data is available,
  while compact mobile preserves one card plus the next-card hint.
- The right workspace reserves the collapsed queue height. At `1870x920`, the
  Discover surface ended at `819px` and the queue began at `836px`, leaving a
  `17px` visible gutter. The player rail measured `420x896px` with equal client
  and scroll heights, so no internal player scrollbar appeared.
- The old full-room blurred thumbnail was removed. Quantized palette analysis
  now derives two dominant darkened background colors and a distinct vivid
  accent that must represent at least two percent of sampled pixels (and at
  least three samples). This prevents isolated image noise from controlling the
  room theme.
- The Visualizer stage retains the actual thumbnail through a clear
  `object-cover` layer at `72%` opacity plus a restrained blurred fill. Browser
  inspection confirmed two artwork layers only inside the Visualizer stage and
  separate background/accent CSS variables on the room shell.
- Reference-width and `390x844` browser checks produced no horizontal document
  overflow.
- Final correction gates passed: focused interaction, palette, visualization,
  and shelf tests (`25/25`), full suite (`500/500`), typecheck, ESLint,
  file-length policy with zero violations, changed-file Prettier,
  `git diff --check`, and the production build. The file-length policy retains
  15 known warnings and introduced no new violation.

## Player, Discover, And Ambient Refinement - 2026-08-26

- The player media surface now fills the available rail width with a bounded
  `clamp(16rem, 36vh, 20rem)` height. Non-provider artwork covers the frame;
  the real YouTube iframe and its native controls remain provider-owned and
  uncropped.
- Follow-up clarification: the approved reference keeps the provider iframe
  intact while using the same current thumbnail as a recognizable background
  across the bounded player rail. The rail artwork now uses the existing
  Background vibrancy variables, an 8px static softening pass, and bounded
  readability shading instead of the previous 48px blur and 82% bottom
  blackout. The room workspace remains palette-gradient-only.
- Local browser QA at `1280x720` confirmed the application-owned thumbnail is
  recognizable behind player metadata, controls, and Up Next while the opaque
  YouTube iframe remains unchanged. The artwork covered the complete rail at a
  computed `0.6494` opacity, the rail client and scroll heights both measured
  `694px`, and document horizontal overflow remained zero.
- Follow-up verification passed: focused visualization, preference, and Up Next
  tests (`17/17`), typecheck, ESLint, file-length policy with zero violations,
  changed-file Prettier, `git diff --check`, and the production build. This
  static presentation correction adds no continuous animation or provider
  lifecycle work.
- Final surface polish lowers only the collapsed queue, mode/search shell, and
  idle search-field opacity so the extracted room palette remains visible
  through their glass surfaces. The expanded queue retains its stronger
  readable surface. The desktop player rail no longer preserves the compact
  layout's bottom padding, removing the visible nested-surface lip.
- Metadata, progress, transport, and volume spacing now uses bounded
  viewport-height values. At `1870x920`, the player rail measured `896px` high
  with equal `886px` client and scroll heights, preserving all three Up Next
  rows without an internal scrollbar.
- Discover cards now use a stable `232x116px` desktop track. The physical shelf
  scrollbar is hidden while arrow controls, keyboard, wheel, and touch movement
  remain available.
- Personalization now exposes browser-local `Background vibrancy` from `25%` to
  `100%`, defaulting to `70%`. The room continues to use extracted palette
  colors; the setting changes only background saturation and presence.
- Persistent `ARTWORK MODE` and `STATIC ARTWORK` overlays were replaced by one
  circular information control. Hover/focus exposes the explanation, click
  pins its anchored popover, and Escape closes it; fallback text remains
  available to assistive technology.
- Browser checks passed at `1870x920` and `390x844` with zero horizontal page
  overflow. The desktop player had no internal overflow, the five-card Discover
  intent was preserved, and the Visualizer information disclosure opened
  without moving the stage.
- The Personalization control and its `70%` default were confirmed in the
  rendered account surface. Automated browser control could not reliably drag
  the native range input, so final manual QA should still verify the visual
  difference between low and high vibrancy.
- One existing local Spacetime readiness error appeared during a hot reload;
  reloading restored the disposable room. No new error was observed from the
  refinement interactions themselves.
- Final automated gates passed: full suite (`500/500`), typecheck, ESLint,
  production build, changed-file Prettier, and `git diff --check`. File-length
  policy reported zero violations and the same 15 tracked warnings.

## Final Surface Alignment - 2026-08-26

- Discover cards gained a `36px` action row and a `120px` total height. Every
  rail action now fills and centers within its own cell, avoiding the clipped
  lower edge visible at the previous `116px` boundary. The embedded rail also
  explicitly removes the shared standalone rail's `8px` top margin.
- The collapsed queue toggle now fills the drawer's complete `48px` or `72px`
  height, so its room-accent hover treatment reads as one continuous surface.
- Visualizer status information moved from the left content area to the
  top-right safe area. Its popover opens inward from the right edge and retains
  the same hover, focus, click, and Escape behavior.
- Desktop browser geometry confirmed `232px x 120px` cards with four centered
  `36px` action cells and a `0px` action-to-card bottom gap. The collapsed
  drawer measured `72px` with a `70px` inner toggle and only its `1px` borders
  outside the hover surface.
- The visualizer information control measured `20px` from both the stage top
  and right edges. At a `390px` viewport its `320px` popover remained fully
  inside the viewport and introduced no horizontal page overflow.

## Final Glass And Rail Polish - 2026-08-26

- The Watch/Listen and search shell now uses a `22%` background surface, while
  the idle search field uses `24%`, allowing the artwork palette to pass through
  without reducing input contrast.
- The collapsed queue drawer now uses a `66%` surface. Its expanded state stays
  at `94%` so dense queue content remains readable.
- Desktop Listen mode no longer inherits the compact rail's bottom padding,
  removing the visible nested-surface lip while preserving compact-mode spacing.
- Browser QA at `1280x720` confirmed the rail ends at the intended `12px` shell
  inset, has equal `694px` client and scroll heights, and introduces zero
  horizontal overflow.
- Focused UI tests (`17/17`), typecheck, ESLint, production build, file-length
  policy, changed-file formatting, and `git diff --check` passed.

## Integrated QA And Optional Ambient Follow-up - 2026-08-26

- User production QA passed Listen-to-Watch switching in the previously
  affected Opera environment, two-participant playback continuity, uploaded
  playback and guest catalogue denial, and owner/member/guest permissions.
- Ambient Waveform is now an explicit browser-local fallback preference rather
  than a build-time development flag. It defaults off, remains deterministic
  and non-reactive, and is announced as a fallback when the selected renderer
  lacks fresh input.
- A separate browser-local preference controls artwork behind moving
  visualizers and Ambient Waveform. It defaults on; explicit Static Artwork is
  never hidden and `Off` never renders artwork.
- The Background vibrancy mapping now spans a materially stronger bounded
  range: presentation presence moves from `0.625` to `1.0` and saturation from
  `1.06` to `1.9` between `25%` and `100%`.
- The primary Play/Pause action now uses the approved `56px` circular glass
  treatment with a dynamic accent border, inset highlight, restrained halo,
  and lower depth shadow instead of a flat solid fill.
- Local browser QA confirmed both new switches have the intended defaults,
  persist across reload, and mount exactly one Ambient canvas when enabled.
  The browser was restored to Static Artwork, Ambient off, and artwork on.
- `queue-drawer.tsx` remains at `693` lines. Per the agreed policy, files over
  `700` lines require immediate architecture attention; the current drawer is
  a recorded follow-up rather than a blocker for this bounded release.
- Final gates passed: focused visualization tests (`10/10`), full suite
  (`503/503`), typecheck, ESLint, production build, changed-file Prettier, and
  `git diff --check`. File-length policy reported zero violations and 16
  tracked architecture warnings.

## Final Disclosure And Switch Correction - 2026-08-26

- User visual QA accepted the final integrated Listen surface, including the
  circular Play/Pause control, queue disclosure, Personalization switches,
  optional Ambient fallback, and artwork preference behavior.
- Atomic implementation checkpoints were recorded as `471bad0`, `ac7d675`, and
  `be1c8bf`; branch publication and release review remain separate gates.
- The collapsed queue drawer now uses one centered disclosure chevron inside a
  compact rounded pill. The removed grip bar no longer competes with the icon,
  and the chevron inherits the current room accent in both drawer states.
- Personalization switch thumbs now have a fixed left origin, bounded
  translations, and track clipping. Checked switches remain entirely inside
  their controls at narrow widths without changing the surrounding card layout.
- Focused regression coverage records both visual contracts so the interim
  queue grip and unbounded switch geometry cannot return silently.
