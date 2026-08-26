---
id: TASK-021-ACCEPTANCE
status: proposed
related: [TASK-021]
updated: 2026-08-26
---

# TASK-021 Acceptance Criteria

## Visual And Layout

- The desktop composition visibly matches the approved reference hierarchy:
  floating rounded player rail, open command area, central stage, and inset
  floating queue bar.
- Dynamic background is visible around major surfaces while text and controls
  meet contrast requirements.
- Personalization provides a bounded Background vibrancy control that changes
  gradient presence without changing the extracted artwork palette identity;
  `25%` and `100%` are visibly distinct while preserving readable contrast.
- The room name remains left aligned; participant avatars/count remain right
  aligned until the responsive layout deliberately stacks them.
- The Save Room star follows the rendered room name with a stable small gap;
  longer names truncate before displacing the star or participant cluster.
- On desktop, the mode/search bar, content stage, and collapsed queue share the
  same left and right edges.
- Discover/Visualizer is docked inside the shared content-stage surface rather
  than occupying a detached dark band.
- Long names, counts, labels, and controls never overlap.
- Up Next shows three rows on desktop, two on tablet, and one on compact mobile.
- The queue handle uses the active room accent and remains visible in all themes.

## Interaction

- The room star saves/unsaves through the existing room relationship and does
  not create a second favourite record.
- Player and visualizer Like controls stay synchronized across click, refresh,
  same-account devices, and current-media transitions.
- The primary Play/Pause action is a circular, translucent accent control with
  a visible border, restrained halo, and depth; it must not read as a flat
  square or solid cyan block.
- The player Like control reads as an inline heart and the Visualizer Like
  control as a circular action; neither is presented as an unrelated square.
- Discover and Visualizer preserve playback and queue state when switching.
- The participant cluster opens the correct owner/member/guest audience state.
- Destructive or privileged permission controls remain unavailable to guests.
- Account avatar, Settings, Add Media, TV Mode, provider overflow, and full queue
  remain independently reachable.
- Closing overlays restores focus to their triggering control.

## Discover

- Discover initially presents `Room picks`, contextual `Because you listened
to`, room history, and room playlist-match shelves when each has useful data.
- `Most listened` remains reachable and no existing TASK-011 discovery mode is
  silently removed.
- Room playlist/history data is never labelled as a Google or YouTube account
  playlist.
- Shelf order and source ranking are deterministic; items are not duplicated
  within a shelf and every command remains connected to the correct stable
  media identity after filtering or navigation.
- Play Now, Add to Queue, Play Next, and Like preserve current permission,
  availability, preference, and queue behavior.
- Add to Queue and Play Next preserve explicit duplicate intent when a
  recommendation source is already represented in the room. Play Next also
  preserves its priority flag instead of silently degrading to append.
- A failed or empty shelf does not blank successful shelves. The all-empty state
  offers the existing Add Media route without claiming unavailable data.
- Wide desktop shows a dense row of compact cards; tablet retains horizontal
  shelf navigation; 390px mobile shows one usable card plus a next-card hint
  without horizontal page overflow.
- The reference desktop composition shows five comfortable landscape cards per
  shelf. Shelf scrollbars are visually hidden because arrows remain present,
  while wheel, touch, keyboard, and programmatic scrolling still work.
- Shelf browsing and Browse All are keyboard accessible and restore focus.
- Initial Discover rendering and artwork requests remain bounded and introduce
  no duplicate recommendation request per shelf.

## Provider And Playback

- YouTube iframe initialization, native controls, overflow menu, and source
  identity remain intact; the redesign causes no duplicate initial load.
- Direct, HLS, and uploaded playback retain their current authorized behavior.
- Play/Pause, seek, volume, shuffle, previous, next, repeat, autoplay, natural
  completion, and mode transitions preserve room authority and continuity.
- No permanent uploaded-media URL or private catalogue data enters room state.

## Visualizer And Performance

- Compatible visualizers mount in the central stage without changing their
  input contracts.
- Missing rhythm input produces an explicit fallback state rather than a blank
  or falsely reactive visualization.
- Static Artwork remains the default fallback. Personalization may enable an
  optional deterministic Ambient Waveform fallback, but it defaults off and is
  labelled honestly as non-reactive.
- Personalization separately controls whether artwork remains behind moving
  visualizers and Ambient Waveform. Static Artwork cannot be hidden by this
  preference, while `Off` never renders artwork.
- Paused, hidden, and reduced-motion states perform no continuous fallback work.
- The shell introduces no continuous decorative animation.
- Compared on the same room/device/visualizer, TASK-021 adds no more than two
  percentage points to active median CPU and no sustained memory growth.
- Opening the queue with at least 250 items remains smooth and virtualized.
- Opening Discover and switching shelves or Browse All does not pause media,
  mutate the queue, remount the provider, or create sustained background work.
- Discover owns a bounded vertical scroll viewport inside the stage rather than
  extending underneath the collapsed queue.
- Static Artwork fills the Visualizer stage behind its controls with the current
  artwork treatment and consistent room dimming; it must not appear as an
  isolated black panel.
- Visualizer capability and fallback details are available through a compact
  accessible information popover instead of persistent status panels over the
  artwork. The trigger exposes expanded state and the fallback remains announced.
- The room workspace backdrop uses extracted palette gradients rather than a
  full-room provider-thumbnail copy. The bounded player rail may use the
  current thumbnail as recognizable, readability-shaded artwork behind its
  controls and Up Next content.
- Palette extraction separates dominant background colors from a sufficiently
  represented vivid accent; isolated noisy pixels cannot become the room
  control color.

## Responsive And Accessibility

- Browser QA passes at 1440x900, 1280x720, 1024x768, 768x1024, and 390x844.
- No horizontal overflow, trapped dialog, hidden close control, or inaccessible
  action occurs at the required widths.
- Desktop player metadata, progress, transport, and volume controls have
  comfortable separation; shorter viewports compact progressively without an
  internal scrollbar or hidden Up Next access.
- Keyboard navigation reaches all primary actions in a logical order.
- Selected, fallback, permission, and live states are not communicated by color
  alone.
- The queue drawer disclosure uses one centered room-accent chevron; no separate
  grip bar competes with the open or closed state.
- Personalization switch thumbs remain fully bounded by their tracks in both
  states at desktop and compact widths.

## Must Not Break

- Room creation/join, Google account identity, participant synchronization,
  queue ordering, large-queue performance, recommendations, Add Media, TV Mode,
  uploaded catalogue denial, authorized uploaded playback, and Media Session
  controls retain their current contracts.
