# Proposal: Playback Stability and Listen Performance

## Problem
The listen room is functionally strong but has two classes of risk:

1. Playback correctness risk:
   - non-controller YouTube clients can be overcorrected, especially on mobile;
   - autoplay handoff is split across multiple live actions, creating transient room states.

2. Performance risk:
   - UI surfaces that are hidden or offscreen can still render, subscribe, animate, fetch metadata, and process images;
   - long playlists and mobile layouts can become sluggish as the room grows.

## Goal
Create a focused implementation path that stabilizes audio first and then reduces render, animation, and metadata load across listen mode without removing functionality.

## User Value
- Mobile guests can listen without needing playback permission.
- Queue autoplay feels like a transition, not a jump.
- Listen mode remains fast with large playlists.
- The app keeps the premium media-session feel while scaling toward more complex features.

## Scope
- Add an atomic SpacetimeDB autoplay reducer for next-item progression.
- Replace two-step autoplay advancement with the atomic reducer.
- Add a YouTube source-transition guard so old-source events cannot affect the new item.
- Relax or remove the extra unauthorized YouTube micro-correction branch.
- Add focused tests for non-controller listen sync and atomic autoplay progression.
- Lazy-mount closed drawer and collapsed sidebar content.
- Disable heavy waveform/ambient visuals on mobile and reduced-motion contexts.
- Virtualize or otherwise constrain long queue/history rendering.
- Reduce metadata and thumbnail work for offscreen/hidden content.
- Add performance QA notes and measurable checks.

## Non-Goals
- No accounts, profiles, avatar upload, friends, or notification drawer.
- No R2 upload pipeline.
- No shared browser prototype.
- No voting/suggested-next feature.
- No provider recommendation rewrite beyond keeping existing functionality stable.
- No hidden YouTube iframe preloading.
- No redesign of the whole listen room.

## Risks
- SpacetimeDB reducer changes require generate, local publish, production publish, and client compatibility checks.
- Atomic reducer must preserve queue modes, unavailable item skipping, pinned/play-next behavior, and queue history semantics.
- Aggressively lazy-rendering UI can accidentally remove keyboard/focus accessibility or delay visible updates.
- Virtualization can break drag/reorder interactions if implemented without care.
- Mobile performance improvements must not cause desktop feature regression.

## Success Criteria
- Autoplay queue advance is one logical reducer transition from current item to next playing item.
- Followers without playback permission do not receive repeated sub-second YouTube seek/play corrections.
- Old-source YouTube events are ignored during handoff.
- Closed drawer content is not mounted.
- Collapsed sidebar content is not mounted beyond the slim rail.
- Mobile does not run heavy waveform/background animations by default.
- `npm run typecheck`, `npm run lint`, relevant tests, SpacetimeDB generate/build/publish, and browser QA pass before production deploy.
