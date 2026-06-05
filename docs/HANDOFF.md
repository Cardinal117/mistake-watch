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
TASK-002.5A Adaptive Listen Card Drift: next TASK-002 item after TASK-002.5 QA
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

## Local Readiness Gate

Before browser QA or local sync testing, run:

```bash
npm run dev
npm run dev:check
```

`npm run dev:check` must pass before local UI findings are trusted. It reports env readiness, Next.js reachability, SpacetimeDB reachability, `/api/health`, and local port owner PIDs for stale-process cleanup.

## Current Next Task

Proceed to TASK-002.5A Adaptive Listen Card Drift after TASK-002.5 live-room QA.

Scope:

- add subtle adaptive horizontal drift to listen-room recommendation/card rails;
- use current queue/recommendation cards as the motion source;
- only enable continuous drift when there is enough overflow content to avoid blank gaps;
- pause motion on hover, focus, keyboard interaction, pointer/touch interaction, and major overlays;
- respect `prefers-reduced-motion`;
- preserve permission-aware card behavior and all queue/playback/SpacetimeDB state.

Expected verification:

- `npm run dev:check`
- `npm run typecheck`
- `npm run lint`
- targeted UI/unit checks if motion logic is added;
- browser QA against `http://127.0.0.1:5371`;
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
- YouTube iframe audio cannot be sampled directly for true audio-reactive visualizers. TASK-002.5 must keep YouTube visuals honest and use real audio analysis only for accessible direct/HLS/R2 sources.
- Do not commit `.env.local` or other secret-bearing files.
- The current Git repository was initialized after significant project work, so the first commit is expected to be a large baseline commit.

## Handoff Rule

When the user says "proceed", implement only the next incomplete TASK-002 subtask unless they explicitly name a different task number.
