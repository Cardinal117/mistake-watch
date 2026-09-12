---
name: Obsidian Lounge
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#f6f5ff'
  on-tertiary: '#00277f'
  tertiary-container: '#d0d8ff'
  on-tertiary-container: '#004fe8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#001550'
  on-tertiary-fixed-variant: '#003ab2'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: 0
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: 0
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  container-max: 1440px
---

## Brand & Style

Approved Personal Discover refinement (2026-09-11): compact list actions retain
44px touch targets and accessible tooltips/names. View all uses a list by default,
with two columns only when the content area supports readable rows. Regular tile
borders and count badges use each tile's artwork-derived accent with readable
text contrast; room backgrounds remain driven by current playback. Artwork fills
card frames with centered cover crops. See TASK-030's compact browse follow-up.

### TASK-029 Personal Discover approval (2026-09-09)

Personal Discover uses a compact regulars artwork grid, aligned recommendation
rows and subordinate Rediscover section. Desktop Discover/Visualizer controls are
left-aligned underline tabs. Preserve the existing per-song ambient gradient and
accent from artwork; the neutral canvas in the reference image is explicitly
overridden by owner instruction. Keep translucent content surfaces, existing
tokens, one vertical discovery scroller and stable playback. See
`docs/tasks/TASK-029-recommendation-quality-baseline/design.md`.

The design system is engineered for Mistake Watch, a premium watch/listen-together media experience evoking the atmosphere of a high-end private screening room combined with a futuristic command center. The target audience consists of close friends and family who value immersion, comfort, and technical precision.

The aesthetic follows a **Modern-Technical** approach:
- **Cinematic Depth:** Focus on dark, layered surfaces that recede to make media content the protagonist.
- **Precision Engineering:** Minimalist layouts with thin borders and functional data visualizations that feel like a high-tech HUD.
- **Glassmorphic Accents:** Strategic use of translucency to maintain spatial awareness without breaking immersion.
- **Minimal Clutter:** A "media-first" philosophy where UI elements appear only when needed and vanish to allow for full-bleed content.

### Signal Aperture Identity
The Mistake Watch product identity uses the **Signal Aperture** direction as the primary brand mark: cinematic gold aperture/chip blades around a blue play/sync core on a dark glass tile. The mark should feel like a private screening device, not a decorative badge.

**Usage rules:**
- Use the supplied transparent horizontal Signal Aperture PNG lockup for the dashboard navbar. Preserve the original concept file in `Logo Concepts/`; app-serving copies may live under `public/brand/` and should be scaled down with CSS rather than replaced by a lesser variant.
- Use the supplied square Signal Aperture icon concept for favicon/app-icon usage. Preserve the original concept file in `Logo Concepts/`; app-serving copies may live under `public/brand/`.
- Treat the navbar lockup and square icon as the authoritative brand color source. The app remains dark neutral first, but the logo's gold and blue are the primary accent pair across all pages.
- Keep motion restrained: aperture rotation, blue core pulse, or trace-sweep effects are acceptable for joining, loading, connecting, and syncing states only.
- Respect reduced-motion preferences by making logo-derived motion static.
- Do not overuse the logo inside active media surfaces, queue rows, member cards, or playback controls. Media, artwork, and room actions stay visually dominant.
- Keep identity roles separate: Signal Aperture is product identity, hardware avatars are user identity, and the crown remains a host-role overlay only.
- Do not introduce unrelated accent colors for brand work. Use deep charcoal, Signal Aperture gold, Signal Aperture blue, and soft light.

## Colors
The palette is built on a "Deep Charcoal" foundation to maximize display contrast. From this task forward, the Signal Aperture navbar logo defines the app accent language:

1.  **Signal Blue:** The technical/playback accent. Use for active cores, links, focus rings, live state, and primary technical affordances.
2.  **Signal Gold:** The premium/listen/director accent. Use for listen mode, highlights, host/authority emphasis, and warm status details.
3.  **Deep Charcoal:** The dominant neutral foundation. The app must remain dark and media-first; blue/gold accents should clarify state, not flood the UI.

**Artwork-driven room surfaces (TASK-026, approved 5 September 2026):** Watch reuses Listen's artwork theme and ambient backdrop. Active navigation, search icons, sliders, playback actions and subtle surface accents may follow the currently playing thumbnail. Keep text neutral, host gold and error semantics independent. Lift dark extracted accents for readable control labels; use the stable Listen preset when artwork is missing or unavailable. Browsing a card must not recolor the active room or alter playback.

**Functional Application:**
- **Backgrounds:** Use `neutral` (#0A0A0B) for the base and `surface` (#121214) for raised panels.
- **Borders:** Use low-opacity white (8-10%) to create "hairline" definitions that feel technical rather than heavy.
- **Gradients:** Subtle radial gradients (Primary color at 5% opacity) may be used behind active video panels to create a "glow" effect.

## Typography
The typography system prioritizes technical clarity and hierarchy. 
- **Primary Typeface:** **Geist** provides a clean, geometric, and developer-centric feel that fits the futuristic command center aesthetic.
- **Secondary Typeface:** **JetBrains Mono** is reserved for metadata, timestamps, and technical readouts (e.g., bitrates, participant counts) to reinforce the "instrument panel" vibe.
- **Scaling:** Headlines use strong weight and clear hierarchy for a modern look, while labels use increased tracking for legibility at small sizes on dark backgrounds.

## Layout & Spacing

### Approved TASK-027 target (2026-09-07; implementation pending)

These scoped rules govern the next room-flow slice and override earlier generic
rail/dock guidance only where they conflict. Existing tokens and the accepted
TASK-026 artwork-driven theme remain unchanged.

- Watch is catalogue-first when permitted, with a YouTube & links entry state
  when catalogue access is denied. Unresolved/error states stay explicit.
- Empty media has no reserved player rail/dock. Loaded paused or buffering media
  retains its player. Desktop browsing uses the available width with a movable
  compact player and an obvious Cinema action when a source exists.
- Watch's loaded paused dock may be manually minimized to a non-scrollable
  thumbnail/title bar. Restore on click and return to full provider presentation
  when playback resumes. Preserve the mounted media instance. Dock actions are
  drag, minimize and Home/Cinema; fullscreen stays with transport controls.
- Desktop and mobile Watch mode controls share the room's compact outlined pill
  treatment, Video/Headphones icons and artwork-derived selected accent. Keep
  visible labels, touch targets and existing shared-room permission semantics.
- Media details center artwork and metadata in a bounded column. Replace browse
  tabs/source selection with Back to results while details are visible; restore
  browsing state on return. Use a subtle 180ms downward entrance, disabled for
  reduced motion. Queue ellipsis menus dismiss on outside pointer/focus events.
- Watch browsing uses a continuous ambient surface without the extra navigation
  strip or outer content box. Keep the mobile compact mode bar below identity,
  Cinema return action, and Catalogue access through the source controls.
- Queue text/background accepts mouse dragging and touch hold-to-lift. Artwork
  remains the independent play target; quick vertical touch scrolls, horizontal
  swipe retains reveal-then-remove, and menu/actions never start reordering.
- Mobile Listen browsing uses a compact now-playing bar above bottom navigation;
  dragging up expands it into the main track/artwork/embed and transport view.
  Provide reverse handle drag, tap/keyboard alternatives, preserved browse state
  and reduced motion. Validate supported provider geometry and keep one player.
- Keep Watch/Listen visible below the mobile Home identity while Home scrolls;
  its shared-room permission semantics remain distinct from local expansion.
- Group participant access beside account/settings. Use an available Google
  profile image for account identity with chosen-avatar fallback. Preserve
  separate participant identity, host role, labels and comfortable touch targets.
- Queue lift, insertion and settling use restrained artwork-accent feedback and
  transform/opacity motion, typically 150–220 ms. The visual drop must not wait
  for server confirmation. Reduced motion retains clear static placement cues.
- Playlist rows have separate selection/artwork/text/status columns; themed
  semantic checkboxes and reachable footer actions follow existing controls.

Detailed state, gesture, concurrency and accessibility contracts live in
[TASK-027 design](docs/tasks/TASK-027-room-flow-and-queue-response/design.md).

### Existing layout foundations

This design system employs a **Fluid-Grid hybrid** model. 
- **Media Content:** Always attempts to occupy the maximum available real estate (aspect-ratio preserved).
- **Control Overlays:** Float above the media using fixed margins (24px) from the edges.
- **Sidebars (Chat/Queue):** Use a fixed-width drawer system (320px - 380px) that can be toggled to provide a distraction-free viewing experience.
- **Rhythm:** All spacing is derived from a 4px base unit. Component internal padding should favor 12px (small) or 20px (large) to maintain a spacious, premium feel.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.
- **Layer 0 (Base):** Deep Charcoal (#0A0A0B).
- **Layer 1 (Cards/Panels):** Near-black (#121214) with a 1px border at 8% white.
- **Layer 2 (Overlays/Modals):** Semi-transparent background (70% opacity of Layer 1) with a 20px Backdrop Blur.
- **Shadows:** Use extremely soft, large-radius shadows (Blur: 40px, Opacity: 30%) with a slight tint of the Primary color to simulate light emission from the screens.

## Shapes
The shape language balances modern approachability with technical structure.
- **Standard Radius:** 8px for small components (Buttons, Inputs).
- **Container Radius:** 12px for standard room, dashboard, queue, and sidebar panels; reserve 16px for major media canvases and modals that need stronger separation.
- **Consistency:** Avoid pill-shapes for primary actions; stay with the "Soft" to "Rounded" range to maintain the command center's structured geometry.

## Components
- **Buttons:** Primary buttons use a solid fill of the active mood color (Cyan/Gold/Blue) with black text. Secondary buttons use a "Ghost" style with a 1px border and the active mood color for the label.
- **Inputs:** Minimalist fields with only a bottom border or a very subtle 4% white fill. Focus states trigger a glow effect using the primary mood color.
- **Media Cards:** Feature a slight zoom-in effect on hover. Metadata (title, duration) is hidden until hover or displayed using the `label-sm` technical font.
- **Chips/Status:** Use the `label-sm` font. Online status or "Live" indicators use a subtle pulse animation in the primary color.
- **Volume/Progress Sliders:** Thin 2px tracks. The "thumb" or "handle" only appears on hover to minimize visual noise during playback.
- **Lounge HUD:** A specialized component containing the room code, participant avatars, and settings; this should be semi-transparent and docked at the top-center of the screen.
- **Transport Bar:** Session controls should use a grounded bottom bar integrated with the viewport, following the Cinematic Room Page reference. Avoid detached floating bubble-style control docks.

### TASK-027.4 local Listen candidate

Mobile direct media uses the compact bar; owner chose a visible >=200x200 YouTube
viewport above its compact controls, with a side column in short landscape.
The responsive shell keeps one provider tree across breakpoints. Existing desktop
rail and discovery styling remain. Expansion uses a 220ms settle, handle-only
vertical gestures and reduced-motion fallback. Mobile Discover cards keep readable
two-line titles and a separate 44px action rail; horizontal swipe and Browse all
replace narrow-screen arrow clutter. This is local QA evidence, not a live release.

TASK-027.4 mobile Discover follow-up: cards begin as compact accented thumbnails.
Tap expands the existing metadata/action card with restrained motion; outside
pointer/focus dismisses it. Desktop cards retain their established presentation.
Listen header audience controls sit immediately beside the account entry on both
mobile and desktop. Keep one vertical scrolling container for mobile Discover.

Listen mobile Home is browse-first. Tapping Home never expands the player;
explicit bar expansion covers the content area between the room header and bottom
navigation uniformly on all tabs. Hide mode switching while expanded. Home swipe
left selects Discover, right selects Visualizer; controls and card rails keep their
own gestures. Cards reverse their expansion on dismissal (180ms, reduced-motion
fallback). Queue drop settlement skips a second travel from the original slot and
retains row elevation while neighboring rows finish their displacement.

Mobile Listen Home uses one continuous toolbar below the room header: 44px
Video/Headphones icon targets, subtle divider, then Discover/Visualizer text tabs
with dynamic-accent underline. No nested pill shells. The toolbar stays outside the
scrolling content and hides while the player is expanded. Listen uses the same
Room & account workspace component as Watch, keeping its full embedded account
settings and existing permissions; Listen-specific TV entry is retained.

### Shared mobile settings and Social

Settings open as compact category rows using existing room accents, 8px corners,
consistent mobile insets and >=44px targets. Open one category at a time, keep Back
to settings prominent, and separate Leave room with confirmation. Watch Home/Add/
settings use the icon mode toolbar plus Catalogue/YouTube & links; no Watch swipe
navigation. Listen settings uses its Discover/Visualizer toolbar to return Home.
Social uses the same member section in both modes, plus an expandable compact invite
bar above it. Avoid nested member padding/scroll containers. Listen chat separates
from members by24px, with a bounded message area and composer aligned to page edges.

Expanded Listen mobile playback reaches the viewport top, covering the inert room
header and preserving the bottom navigation/minimize handle. Drag progress is
frame-batched visual state using measured travel, without pointer-frequency room
rerenders. Safe-area padding protects top controls.

Watch mini-player positioning is free within the usable viewport (2026-09-07). The existing grip follows pointer/touch movement and retains the released position without corner snapping. Arrow keys move 20px; Shift+arrows move 4px. Re-clamp on resize, rotation and size changes; Cinema/fullscreen retain their existing geometry. Short landscape keeps a movable bounded player above the bottom navigation. No new colors or decorative motion.

## Listen player polish — owner-approved 2026-09-12

Expanded mobile Listen uses a quiet centered Now playing header, smaller square
provider stage (minimum 200px), ambient blurred artwork and dark readability
scrim, 24px title, song-accent heart and a filled accent transport button using
the existing desktop Play/Pause glyphs. Keep one provider mounted through
browsing, expansion and rotation. Use the existing readable accent lift for
controls when source artwork colors are too dark.

YouTube, views and likes remain visible as padded inline icons/text without
individual boxes, on both mobile and desktop. Volume opens from a compact
speaker control with outside/Escape dismissal. Mobile exposes Visualizer beside
it and one compact Up next row; its bottom navigation follows Watch spacing and
icons. Desktop retains its existing rail/transport composition, with only the
approved metadata, heart and volume presentation changes.

Fit ordinary portrait phones by scaling media and tightening short-height gaps;
allow scrolling for landscape, enlarged text and exceptional titles rather than
clipping controls. See docs/tasks/listen-mobile-player-polish/task.md and its
approved reference for the visual contract.

### Approved Watch desktop reference update — 2026-09-12

The owner-approved Browse/Watch references and subsequent three-item preview
correction supersede TASK-027's full-width floating-player default on desktop
(1024px and wider). Retain the existing artwork-driven room colours and Listen
mode-tab component. Browse places bounded collections, Ready to watch and recent
history beside an anchored player. Cinema expands the same mounted provider on
the left; explicit Float player remains available. Empty media reserves no rail.

Below the anchored player, show only three Up next items using Listen's compact
artwork/title/artist/duration treatment. The heading and rows open the dedicated
queue; keep Play next as an independent action. No preview search, Social tab,
shuffle or separate footer button. Social remains a header destination; search,
shuffle and full management remain in the full queue. Keep player metadata
unboxed, hearts accented, and the original transport icons. Small viewports and
large text must retain reachable controls through contained scrolling.

Catalogue actions use one shared, permission-aware playback request coordinator.
Intentional repeated Add remains allowed. Do not infer mockup metadata, replace
media instances, or change mobile gestures. Detailed acceptance and release
proof: `docs/tasks/watch-desktop-product-polish/`.

Expanded Watch/Cinema is an explicit exception to the three-item Browse preview:
its right column is a full-height, searchable mini queue with ordinary queue
controls, flat Listen-style rows and bounded virtualization. The structural
column divider supplies separation; do not add a card box inside it. Browse's
three-item preview uses an adaptive 16-28px gap below the player controls.

Expanded Watch refinement: when the right mini queue is visible, omit the redundant
below-player Up next row. Give the transport adaptive vertical padding and the
volume slider a 128px usable track with a 44px interaction height. Browse keeps
its separate three-item preview.
