# Design and interaction contract

Use root DESIGN.md: existing Signal Aperture identity, charcoal base, artwork-derived playback accents shared with Listen, gold host emphasis, Geist, 4px spacing, 8–12px standard radii, 16px media maximum. Generated references are in references/. Media title and metadata remain visible. Hardware avatar and host crown semantics remain unchanged.

One Watch parent owns local navigation and a single player subtree. CSS changes placement/size; never move the media node between React parents, mount separate desktop/mobile players, or change source on navigation. Cinema is local, distinct from shared Watch/Listen switching and browser fullscreen. Escape returns to the preceding workspace and restores focus. Browse retains search/filter/scroll state.

Desktop: stable left media/transport/Up Next; larger right discovery workspace. Cinema expands stage, with Queue and Social available on demand. Mobile: Home / Queue / Add / Social / More. Home has Watch/Browse. Secondary workspaces retain a visible player dock, external drag handle, four-corner movement alternatives and expand/full-player actions. Minimum YouTube viewport 200x200; reserve content scroll clearance. Short landscape/keyboard layouts use a reserved player region. Reduced motion avoids movement animation. Navigation does not issue playback commands.

Library uses the existing authorized assets API, ready-only items for consumption, existing folders as collections, progressive batches and lazy posters. Owners access existing management tools separately. Detail selection is distinct from Play now, Play next and Add to queue. Retain server authorization and session references, never permanent R2 URLs. Loading, denied, error, no-results and empty states stay distinct. Guest playback access is not catalogue access.

Reuse existing queue, member, chat, account, provider search and Add Media components. Keep requests bounded/on demand; no background provider search for decorative shelves. Future first-party recommendation shelves remain a later integration slice as agreed in the reference guide. Use actual room history and queue labels today.


Implementation clarification: The new details Play now action may start a newly selected source only after that exact session reference appears in canonical room state. This uses existing load and playback actions, requires both relevant permissions, and cancels the pending start when details close or control is revoked. This detail-selection path uses existing reducers and no schema change; the separately approved automatic-next readiness protocol is documented below.

## Approved refinement, 5 September

Reuse Listen's artwork extraction, fallback presets, ambient backdrop, presentation preferences and dynamic Slider. Accent active navigation, search icons, selected controls, playback actions and subtle surface borders; retain neutral readable text and independent host/status semantics. The currently playing source determines the palette, never a hovered or browsed card. Keep video pixels unfiltered.

Catalogue and YouTube & links form a persistent paired source switch above the browsing/composer workspace. The composer has an explicit catalogue return; preserve browsing state and the single mounted player. Restyle collection filtering as an accessible themed disclosure with native radio selection. Focus stays visible through restrained outer search borders and keyboard cues. Align Invite actions, make More destinations and account sections fully reachable, and preserve mobile dock clearance and the liked five-destination navigation.

The development fixture simulates services only at /dev/watch-design. Real rooms render the same WatchModeLayout with the existing live-room controller and service clients. Local fixture QA is not evidence of real-service synchronization or signed R2 delivery.


Queue cleanup approved 5 September: the Watch workspace omits the shared panel's duplicate Queue/Up next heading and Add Media entry point. Its existing queue-mode, shuffle, smart shuffle and clear actions form a compact responsive toolbar. Other QueuePanel presentations retain their existing behavior. Dedicated room Add and catalogue navigation remain authoritative entry points.

Fullscreen controls approved 5 September: the fullscreen action must work on both the development fixture and the actual Watch room. Fullscreen contains the existing media/player subtree and a permission-aware control surface for play/pause, timeline, +/-10 and +/-30 seconds, volume/mute, next item and exit. Direct video controls overlay the video and fade during playback, reappearing on pointer/touch/keyboard interaction. Preserve canonical room actions, clamp seeks to duration, keep the same player and restore the preceding workspace/focus on exit. Fullscreen failures must be visible. The later phone refinement uses supported controls=0 in Watch and a room-owned timeline; provider branding/start prompts are never covered or cropped. R2 delivery is unchanged.


Room identity parity approved 5 September: place the existing Listen save star beside the Watch room name; allow authorized, connected members to rename inline via the existing liveRoom.renameRoom action (Enter/blur commit, Escape cancel, visible failure). Reuse Listen's avatar/count trigger and members dialog with active and idle participants and existing authority actions. Carry the current artwork palette into the portal and keep desktop/mobile headers compact. No new membership history, permission rules, backend actions or schema.

## Accepted touch and autoplay refinement

Compact Watch queue rows use a title/thumbnail play target, explicit Play next, a pointer/touch drag handle with edge scrolling, and a secondary action menu. Left swipe reveals trash; trash tap or a second left swipe removes. Keyboard arrows/Home/End and menu top/bottom remain alternatives. Only the final drag drop submits the canonical move command. Listen queue presentation stays unchanged.

The tall-phone dock defaults to 214px wide with less chrome, four snap corners, pointer and keyboard movement, and restrained 180ms movement respecting reduced-motion preferences. YouTube retains a 200x200 provider viewport; direct video uses a shorter viewport. Expand restores a larger player. Short landscape Home emphasizes the full-width player and keeps transport reachable. Body overscroll is contained; supporting content scrolls inside its own viewport.

Leaving through either the back arrow or More requires a native Yes/No dialog, initial focus on No, Escape cancellation and focus restoration. The room remains playing while the dialog is open.

Prepared YouTube automatic next uses two additive, authority-checked reducers. The next item is selected paused at zero; the initiating browser starts its existing iframe, and its first PLAYING event acknowledges the source/item/occurrence/raw timestamp. The server starts the clock only if that exact paused command remains current. A newer pause/seek, disconnect or lost authority cancels preparation. Rejoining follows the existing clock and never starts this local intent. Existing manual/Direct/R2 advance paths remain intact. See ../../sync-model.md.
