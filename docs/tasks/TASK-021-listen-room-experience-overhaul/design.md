---
id: TASK-021-DESIGN
status: proposed
related: [TASK-021, DESIGN, MW-QOL-012]
updated: 2026-08-25
---

# Listen Room Experience Design

## Design Principles

- Preserve Mistake Watch's Modern-Technical, media-first identity.
- Reveal the dynamic room background through deliberate gutters instead of
  lowering foreground readability.
- Use fewer, larger visual boundaries. Do not wrap every control group in a
  separate card.
- Use existing artwork-derived CSS variables for room state and accents.
- Keep radii hierarchical: 8px controls, 12px supporting surfaces, 16px major
  media/visualizer surfaces, and pills only for segmented modes and disclosure.
- Add no continuous decorative animation.

## Desktop Composition

```text
+---------------- player rail ----------------+  +------ room workspace ------+
| rounded provider/artwork surface             |  | room name + save        users |
| title + Like                                 |  | metadata       actions/avatar |
| progress and rounded primary transport       |  | Watch / Listen + search      |
| volume and percentage                        |  | Discover / Visualizer         |
|----------------------------------------------|  | central stage                 |
| Up Next: 3 compact rows                      |  |                                |
+----------------------------------------------+  + floating queue bar -----------+
```

The player rail and workspace use a real gutter. Neither becomes a nested card
inside another decorative panel.

## Player Rail

- Retain the actual YouTube iframe when the source requires it. Round and clip
  its host surface without removing provider controls or the overflow menu.
- Let the provider or artwork surface fill the available rail width and use a
  bounded responsive height. Non-provider artwork uses `object-cover`; the
  YouTube iframe remains uncropped inside its own provider-controlled frame.
- Keep media title and artist immediately below the player. Like remains beside
  the title and uses the existing preference controller.
- Use comfortable vertical separation between metadata, progress, transport,
  and volume at normal desktop heights. Compress those gaps with bounded
  viewport-height values before allowing the rail to gain an internal scroll
  region.
- Make Play/Pause the strongest transport control with a circular treatment.
  Previous, Next, Shuffle, and Repeat remain quieter icon controls.
- Show a numeric local volume percentage without changing room authority.
- Use the lower rail for immediate Up Next rows: three desktop, two tablet, one
  compact mobile. Each row has stable dimensions and opens the full queue for
  deeper management.

## Room Header

- The room icon and name remain left aligned. The star invokes existing Save
  Room state and must expose `Save room`/`Unsave room` semantics to assistive
  technology.
- Active participant avatars and the existing count blip remain on the right.
  The blip retains the current population meaning; TASK-021 does not create a
  new historical-participant model.
- The participant cluster opens the audience surface. Owners see existing
  permission controls; members and guests see read-only audience information.
- Add Media remains the primary command. TV Mode, account avatar, and Settings
  remain separate controls with distinct tooltips and focus targets.
- Remove the full-width dark backing band. Use local contrast treatments only
  where labels and controls need them.
- Long room names shrink the center metadata region before affecting actions.
  At narrow widths, metadata wraps below the identity and participants collapse
  into the count control.

## Discover And Visualizer

- Use an accessible two-option segmented control.
- Discover presents several existing recommendation contexts together using
  compact horizontal shelves and landscape cards. Its detailed source mapping,
  state behavior, navigation, and data-honesty rules are defined in
  `discover-design.md`.
- Do not label room playlist/history matches as account playlists. Existing
  Most listened behavior remains reachable.
- Visualizer contains the selected production renderer, active title, artist,
  progress, and a mirrored Like control.
- Keep fallback and renderer status available through one circular information
  control. Hover and keyboard focus may reveal it temporarily; click pins an
  anchored popover and Escape dismisses it. Anchor the control to the
  Visualizer's top-right safe area. Do not permanently overlay status copy or a
  renderer badge on the artwork.
- Do not add a visualizer overflow menu. Provider overflow remains in the
  player surface.
- Both Like controls render from and mutate through the same preference state.

## Fallback States

1. Render the selected compatible visualizer when its required input is fresh.
2. When input is unavailable, keep Visualizer selected and visibly state that
   a fallback is active.
3. Use Static Artwork as the release fallback.
4. Offer `Ambient Waveform` as an explicit browser-local fallback preference.
   It is off by default and never replaces Static Artwork unless the user opts
   in. It is deterministic, honestly non-reactive, synchronized to playback
   time, and frozen while paused, hidden, or reduced-motion.
5. Offer a separate browser-local preference for showing artwork behind moving
   visualizers and Ambient Waveform. It defaults on. Explicit Static Artwork
   always remains visible and `Off` always remains artwork-free.

No fallback may fabricate bass, mids, highs, onset, or rhythm lock.

## Ambient Presentation

- Keep palette extraction authoritative for the room's background and accent
  colors. Background vibrancy changes only saturation and presence; it must not
  replace the extracted colors or alter recommendation, playback, or authority
  state.
- Expose `Background vibrancy` beside the existing visual intensity and
  background dimming controls in Personalization. Persist it with the existing
  browser-local Listen presentation preferences.
- Bound the setting from `25%` to `100%`, default it to `70%`, and preserve
  readable foreground contrast at both limits. The endpoints must produce a
  clearly distinguishable change in gradient saturation and presence.

## Queue Drawer

- Match the approved reference: a wide, rounded collapsed bar inset from the
  player/workspace edges with background visible on all sides.
- Treat the entire collapsed drawer as one hover and click target. Accent hover
  state must fill its complete bounded height, including the optional Next
  preview row.
- Keep queue position left and remaining time plus `Open queue` right.
- Center a compact disclosure handle. Its arrow, focus ring, and active edge
  use the current room accent rather than fixed white/cyan.
- Preserve existing virtualization, filters, history, controls, drawer height,
  scroll restoration, and next-item preparation behavior.
- Opening the drawer may expand vertically but must not resize the player rail
  or shift the room header.

## Responsive States

- **Wide desktop:** two-column player/workspace shell and three Up Next rows.
- **Portrait desktop/tablet:** narrower rail or stacked media-first composition,
  two Up Next rows, wrapped metadata, and intact commands.
- **Compact mobile:** one-column player, one Up Next row, touch-sized controls,
  compact participant count, and one persistent route to the full queue.
- Respect safe areas and avoid horizontal scrolling at 390px.
- The account avatar and room identity may move but must not disappear.

## Accessibility

- Preserve logical heading order and landmark semantics.
- Segmented modes, Save Room, Like, participant cluster, transport, and queue
  disclosure must be keyboard operable with visible dynamic-color focus rings.
- Restore focus when the participant surface, queue, settings, or Add Media
  closes.
- Color never carries selected, permission, or fallback state alone.
- Reduced motion freezes ambient fallback and all visualizer motion.
