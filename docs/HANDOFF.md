# Mistake Watch Handoff

This handoff is the first file another agent should read after `AGENTS.md`.

## Current Project State

Mistake Watch is a guest-first watch/listen room app with:

- dashboard room creation and joining;
- Supabase-backed durable rooms and guest identities;
- SpacetimeDB-backed live room state, presence, permissions, queue, and playback authority;
- YouTube and direct-media playback;
- watch and listen room layouts;
- host-led queue controls and guest queue contribution;
- Vercel production deployment at `https://watch.mistakestudios.com`.

## Current Task Packet

Current source of truth:

```text
docs/tasks/TASK-002-incomplete-work-recovery/
```

Historical MVP source:

```text
docs/tasks/TASK-001-watch-together-platform/
```

Current status:

```text
TASK-002.1 Listen Mode Quality Pass: implemented
TASK-002.2 Room Chat: implemented
TASK-002.3 Seamless Next Item Loading: implemented
TASK-003 Dev Environment Parity: implemented
TASK-002.4 YouTube Availability Hardening: complete; SpacetimeDB build/generate/local publish/Maincloud publish completed after CLI path recovery
TASK-002.5 Provider Recommendations and Room Picks: implemented pending live-room visual and permission QA
TASK-002.5A Adaptive Listen Card Drift: closed; autonomous drift removed after user QA found it annoying
TASK-002.5C Live Room Authority Hardening: implemented; local manual QA confirmed by user
TASK-002.5D Queue Authority And Add Media UX Stabilization: complete after user QA confirmed the corrective pass
TASK-002.5B Cinematic Watch Room Purpose Pass: complete after user-confirmed watch UI and functionality QA
TASK-002.5E Vertical Listen AI DJ Placement Shell: complete after vertical, wide desktop, and mobile browser QA
TASK-002.5F Listen Room Header And Presence Refinement: implemented pending final visual QA
TASK-002.5G Listen Player Rail And Discovery Cleanup: implemented pending final visual QA
TASK-002.6 Real Audio-Reactive Waveform Architecture: complete after resolver, UI wiring, build, and dev-check verification
```

Product clarification:

```text
The user explicitly clarified on 2026-06-02 that chat is not wanted in listen mode. Keep chat out of listen mode unless the user later reverses this decision.
```

Do not skip ahead unless the user explicitly names another TASK-002 subtask.

## Required Reading Order

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/COMMANDS.md`
4. `docs/tasks/TASK-002-incomplete-work-recovery/tasks.md`
5. `docs/tasks/TASK-002-incomplete-work-recovery/review-notes.md`
6. `docs/tasks/TASK-002-incomplete-work-recovery/acceptance-criteria.md`
7. Relevant source files for the active subtask

## Room Source Map

Use this map to find the active room surfaces quickly:

- `components/room/room-shell.tsx`: server entry into the room experience.
- `components/room/room-experience.tsx`: client switch between watch and listen layouts from live SpacetimeDB room mode.
- `components/room/listen-mode-layout.tsx`: main listen-room shell, left player rail, header/search/settings menu, room picks, and listen queue drawer.
- `components/room/watch-mode-layout.tsx`: main watch-room shell, cinematic stage, audience surface, watch media hub, queue/media drawer, and uploaded media library UI.
- `components/room/queue-panel.tsx`: shared queue controls, Add Media flow, queue list, history, and queue-mode controls used by watch/listen surfaces.
- `components/room/youtube-media-player.tsx`: synchronized YouTube playback adapter and sync correction handling.
- `components/room/direct-media-player.tsx`: synchronized direct/HLS media playback adapter and sync correction handling.
- `components/room/youtube-room-stage.tsx`: YouTube stage wrapper for watch/listen layout presentation.
- `components/room/media-stage.tsx`: watch-mode stage switcher for direct/HLS/YouTube/idle media.
- `components/room/members-panel.tsx`: shared member permission/control panel.
- `components/room/room-chat-panel.tsx`: shared room chat panel, currently surfaced in watch/audience flows.
- `components/room/transport-controls.tsx`: shared transport UI used outside the custom listen rail.
- `lib/spacetime/use-live-room.ts`: live room subscription, reducers, mode switching, queue, permissions, and playback mutation helpers.
- `lib/player/sync.ts`: canonical playback-position calculation and drift correction rules for watch/listen players.

## Local Readiness Gate

Before browser QA or local sync testing, run:

```bash
npm run dev
npm run dev:check
```

`npm run dev:check` must pass before local UI findings are trusted. It reports env readiness, Next.js reachability, SpacetimeDB reachability, `/api/health`, and local port owner PIDs for stale-process cleanup.

## Current Next Checkpoint

Proceed to TASK-002.8A Account And Owner Authority Foundation before TASK-002.8 Stream/R2 upload and media-library work.

Future listen-layout note: when TASK-002.10B AI DJ / Session Intelligence becomes active, prefer placing the AI DJ card in the unused below-player space on tall desktop and vertical-monitor listen layouts. This is a reserved layout direction only; AI chat, voice, and waveform interaction remain later explicit scope.

TASK-002.5C implemented scope:

- replace browser-client-authoritative live session seeding with a trusted authority path;
- require server-verified durable room membership before SpacetimeDB can establish host authority;
- issue one-time private SpacetimeDB seed grants from a server identity stored in `SPACETIME_SERVER_AUTH_TOKEN`;
- preserve guest-first joins while preventing guest-provided role/member fields from becoming the authority source;
- align queue play-now behavior with the intended playback permission model;
- add reducer-level duplicate protection for playlist imports;
- add appropriate abuse/quota protection around playlist preview and recommendation API routes.

TASK-002.5D implemented scope:

- add explicit queue-management authority so full queue access matches reducer behavior;
- align enabled queue controls with reducer permissions;
- add server-authoritative playback history for the previous/back transport;
- replace Add Media with a centered modal above drawers and panels;
- add URL preview, duplicate warning/add-anyway behavior, local duplicate preference, playlist review controls, and visible queue notifications.
- add a corrective atomic SpacetimeDB autoplay advancement reducer plus YouTube client guards so backgrounded tabs cannot repeatedly advance/reload the same active item;
- reserve playlist More options duration filters above the scrollable playlist rows so the controls do not overlap songs.

Expected verification:

- `npm run dev:check`
- `npm run typecheck`
- `npm run lint`
- `npm run test:queue`
- `npm run test:sync`
- `npm run test:spacetime`
- `npm run test:youtube`
- browser/two-client QA against `http://127.0.0.1:5371` when local readiness passes;
- update the active task packet and implementation report.

## Runtime Boundaries

Supabase owns durable product data:

- rooms;
- guest identities;
- memberships;
- room settings;
- durable queue data;
- future auth/profile/friend systems.

SpacetimeDB owns latency-sensitive room state:

- live presence;
- playback authority;
- current playback state;
- permissions;
- queue mutations during a live session;
- future live chat for TASK-002.2.

Do not move low-latency media sync to Supabase Realtime.

## UI Direction

Use `DESIGN.md` as the visual source of truth.

Important current direction:

- dark technical room aesthetic;
- grounded side panels, not floating decorative cards;
- compact controls;
- cyan and gold accent system from the current Mistake Watch logo direction;
- no fake personalized, provider-trending, or listening-history data;
- honest unavailable states when provider data is not wired.
- live host authority must come from verified membership, not browser-provided reducer payload fields.
- queue add, queue management, playback control, and host authority should remain distinct capabilities.
- Add Media should be a centered modal surface before watch queue/library drawer work builds on it.
- watch mode should feel focused, cinematic, synchronized, and media-first rather than like a dashboard.
- Cloudflare Stream is the approved fast video processing/playback path for uploaded watch-room video; R2 remains available for raw/source archive, waveform/analysis JSON, supporting artifacts, and future non-Stream media needs.
- Google OAuth and owner authority must land before Stream/R2 media-library work so owner-only upload and source ingestion can be enforced server-side.

## Deployment Context

Production URL:

```text
https://watch.mistakestudios.com
```

Vercel alias:

```text
https://mistake-watch.vercel.app
```

Deploy command:

```bash
npx vercel --prod
```

See `docs/COMMANDS.md` for full local, SpacetimeDB, verification, and deployment commands.

## Known Caveats

- Local dev-server background startup has previously hit stale Next/Turbopack lock or process issues. Use `npm run dev:check` as the readiness gate. If local QA is blocked, document the blocker and remediation before relying on production/manual review.
- YouTube iframe audio cannot be sampled directly for true audio-reactive visualizers. TASK-002.6 must keep YouTube visuals honest and use real audio analysis only for accessible direct/HLS/first-party media sources.
- Do not commit `.env.local` or other secret-bearing files.
- Live-room seed grant setup requires `SPACETIME_SERVER_AUTH_TOKEN` in `.env.local` and Vercel, plus the matching identity hex in SpacetimeDB's private `trusted_seed_issuer` table. SpacetimeDB does not use `SPACETIME_ROOM_SEED_SECRET`.
- The current Git repository was initialized after significant project work, so the first commit is expected to be a large baseline commit.

## Handoff Rule

When the user says "proceed", implement only the next incomplete TASK-002 subtask unless they explicitly name a different task number.
