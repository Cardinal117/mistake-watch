# Lighthouse Performance Baseline - 2026-06-23

## Context

These Lighthouse reports were captured against the local dev server at `http://127.0.0.1:5371` in incognito mode on June 23, 2026. The listen and watch room runs used a stress-test room with about 250 queued songs.

Important caveat: this is a useful direction-finding baseline, not a production score. Dev mode includes unminified scripts, Next dev tooling, local dynamic route latency, and a Chrome extension content script in the trace. Production Lighthouse should be captured after the first cleanup pass.

## Attachment Mapping

The second uploaded JSON is the dashboard because its `requestedUrl` is `/`. The third uploaded JSON is the watch room because it contains watch-room audience content. The prompt order said watch/dashboard in the opposite order, so this report uses the JSON evidence.

| Surface | Attachment | URL Evidence |
| --- | --- | --- |
| Listen Room | `bab01aec-5bb5-4dd6-a4a8-7d94cab2c107` | `/rooms/...`, contains `Room picks` |
| Dashboard | `ee0aa62f-c2f7-4c7d-9fd9-36351caa2af8` | `/`, contains dashboard hero text |
| Watch Room | `badcbe9d-42cd-497e-9667-e3b5f32bb2d0` | `/rooms/...`, contains `Audience` |

## Score Summary

| Surface | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Listen Room | 10 | 98 | 100 | 100 |
| Watch Room | 23 | 100 | 100 | 100 |
| Dashboard | 60 | 100 | 100 | 100 |

Accessibility, best practices, and SEO are healthy. The performance issue is not general page correctness; it is payload size, client work, and room rendering pressure.

## Core Metrics

| Surface | FCP | LCP | TBT | CLS | Speed Index | TTI | Server Response |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Listen Room | 1.2s | 32.6s | 129,600ms | 1.03 | 30.3s | 139.6s | 1,510ms |
| Watch Room | 1.2s | 5.4s | 5,690ms | 0.41 | 8.2s | 15.6s | 1,505ms |
| Dashboard | 1.1s | 3.6s | 5,170ms | 0 | 2.7s | 8.4s | 430ms |

## Top Findings

### 1. Listen room is the worst by far under a 250-item queue

The listen room shows extreme main-thread work:

- Main-thread work: `149.0s`
- Script evaluation: `115.6s`
- Bootup time: `115.9s`
- TBT: `129.6s`

This is beyond normal dev-mode overhead. The likely cause is a combination of the large queue, eager room rendering, repeated metadata/card work, and dev-mode script overhead. The 250-song queue is exactly the kind of case that needs list virtualization and stronger memo boundaries.

### 2. Both room modes eagerly ship code for the other mode

`components/room/room-experience.tsx` imports both:

- `ListenModeLayout`
- `WatchModeLayout`

Current file sizes:

- `components/room/listen-mode-layout.tsx`: about 4,801 lines
- `components/room/watch-mode-layout.tsx`: about 3,979 lines
- `components/room/queue-panel.tsx`: about 2,107 lines

Lighthouse confirms this with unused chunks:

- Watch room reports unused `listen-mode-layout` JS.
- Listen room reports unused `watch-mode-layout` JS.

This is a strong candidate for route/component-level code splitting without removing features.

### 3. HLS is shipped eagerly even when the current source is YouTube

`components/room/direct-media-player.tsx` statically imports `hls.js`.

Lighthouse shows the HLS chunk in both room audits:

- `node_modules_hls_js_dist_hls_mjs...js`: about 307 KiB transferred.
- Unused JS estimate: about 280 KiB.

This should be dynamically imported only when the active source is HLS.

### 4. Favicon is far too large

`public/favicon.svg` is about 4.75 MB locally and Lighthouse downloads it as about 3.4 MiB.

This appears as the largest request on all three surfaces. A favicon should be tiny. This should be replaced with a small optimized SVG or PNG/ICO pair while preserving the Signal Aperture identity.

### 5. YouTube iframe scripts are a real room-mode cost

Room pages load YouTube embed scripts:

- `player_embed_es6...base.js`: about 446 KiB.
- `ytembeds...`: about 197 KiB and 141 KiB.

This cost is expected when a YouTube player is mounted, but it should not be paid before the player is actually needed, and it should not cause unrelated room surfaces to rerender.

### 6. CLS is poor in rooms

Listen room CLS is `1.03`; watch room CLS is `0.41`.

Lighthouse layout-shift entries point at fixed playback/queue surfaces and room content sections. We need reserve stable dimensions for fixed bars, drawers, player panels, and room cards so late-loaded state does not move the viewport.

### 7. Dashboard is comparatively healthy

Dashboard score is `60` on dev server:

- FCP: `1.1s`
- LCP: `3.6s`
- CLS: `0`
- Main-thread work: `9.3s`

The dashboard still pays for the oversized favicon and dev tooling, but it does not show the same catastrophic queue/render behavior as listen mode.

## No-Rewrite Performance Plan

### Phase 1 - Quick Wins

1. Replace `public/favicon.svg` with a small optimized icon asset.
2. Dynamically import `hls.js` only for HLS sources.
3. Capture one production Lighthouse baseline after these two changes.
4. Verify whether the room server response issue remains on production/Vercel.

Expected result: immediate payload reduction on every page and about 280 KiB less unused JS on non-HLS room loads.

### Phase 2 - Room Code Splitting

1. Split watch and listen layouts so the inactive mode is not in the initial client bundle.
2. Lazy-load heavy overlays:
   - account command panel
   - queue/media hub internals
   - upload manager
   - YouTube search result surface
   - audience/permissions panels
3. Keep the active player and core transport eager.

Expected result: lower initial JS and less parsing/bootup work without removing any functionality.

### Phase 3 - Queue And Media Virtualization

1. Virtualize queue rows for large queues.
2. Virtualize uploaded media grids/lists and folder contents.
3. Render only visible recommendation cards and thumbnails.
4. Keep queue counts and next item summaries separate from full queue row rendering.

Expected result: large 250-item queues stop crushing listen/watch room startup.

### Phase 4 - Render Boundary Cleanup

1. Stop passing the full `liveRoom` object into broad component subtrees when only small slices are needed.
2. Memoize queue rows, member chips, media cards, and search result rows.
3. Isolate playback clock updates so they do not rerender room picks, media hub, account UI, or member panels.
4. Keep ambience/color extraction isolated from queue and member updates.

Expected result: less UI jank during playback and sync updates.

### Phase 5 - Metadata And Image Discipline

1. Cache YouTube metadata by video ID server-side and dedupe concurrent requests.
2. Prefer already-stored queue metadata before refetching.
3. Lazy-load offscreen YouTube thumbnails.
4. Use smaller thumbnail URLs for small cards instead of `maxresdefault.jpg` where possible.

Expected result: lower network pressure and faster room-pick rendering.

### Phase 6 - Layout Stability

1. Reserve fixed dimensions for room header, player rail, transport bar, queue drawer, and recommendation rows.
2. Avoid fixed surfaces changing height after hydration.
3. Give player embeds, thumbnails, and cards explicit aspect ratios.
4. Re-run Lighthouse specifically for CLS after each layout fix.

Expected result: room CLS moves toward acceptable values without visual redesign.

## Recommended First Performance Task

Create `TASK-002.5I Performance Quick Wins`:

- Optimize favicon/app icons.
- Lazy-load HLS.
- Add a production Lighthouse capture checklist.
- Add bundle inspection notes for watch/listen mode split.

This is low-risk and avoids rewriting room architecture while giving immediate measurable improvement.

## Recommended Second Performance Task

Create `TASK-002.5J Room Bundle And Queue Rendering Performance`:

- Split inactive room mode code out of the initial room bundle.
- Lazy-load non-critical panels.
- Add queue/media virtualization for large queues.
- Add memo boundaries around high-repeat UI.

This is the larger performance task and should be done after the quick wins are verified.
