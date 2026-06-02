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
