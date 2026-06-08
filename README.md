# Mistake Watch

Mistake Watch is a private watch/listen-together platform for synchronized rooms, shared queues, and host-led playback. It is built for a guest-first friends-and-family release now, with accounts, friends, uploaded media, voting, and shared browser control planned later through the TASK-002 recovery roadmap.

Production:

- `https://watch.mistakestudios.com`
- `https://mistake-watch.vercel.app`

## Current Capabilities

- Create and join private rooms with guest display names.
- Sync live playback state through SpacetimeDB.
- Store durable room data through Supabase.
- Watch YouTube videos, direct media URLs, and HLS-capable sources.
- Use listen mode for YouTube/YouTube Music-style music sessions with a dedicated music UI.
- Add single YouTube/direct links to the queue.
- Import YouTube playlists through a review flow before adding items.
- Manage queue order, removal, clear, shuffle, smart shuffle, pinned-first behavior, and history filtering.
- Auto-advance through the queue with next-item preparation and fallback continuity handling.
- Show current media metadata, thumbnails, views, likes, queue count, and next-item preparation where data is available.
- Host controls playback by default.
- Guests can add queue items by default.
- Hosts can manage member permissions for queue, playback, and browser-control readiness.
- Hosts can kick members and remove idle members.
- Saved rooms and recent rooms support recurring personal use.
- Listen mode includes dynamic thumbnail-based theming, a queue drawer, room picks, recently added tracks, and a compact members rail.

## Current Roadmap

The active source of truth is:

```text
docs/tasks/TASK-002-incomplete-work-recovery/
```

TASK-001 remains historical MVP context:

```text
docs/tasks/TASK-001-watch-together-platform/
```

Current TASK-002 status:

- `TASK-002.1` Listen Mode Quality Pass: implemented.
- `TASK-002.2` Room Chat: implemented for watch room context only. The user explicitly does not want chat in listen mode.
- `TASK-002.3` Seamless Next Item Loading: implemented.
- `TASK-002.4` YouTube Availability Hardening: complete.
- `TASK-002.5` Provider Recommendations and Room Picks: implemented pending live-room visual and permission QA.
- `TASK-002.5A` Adaptive Listen Card Drift: closed after user QA rejected autonomous drift.
- `TASK-002.5C` Live Room Authority Hardening: implemented pending manual two-client QA.
- `TASK-002.5D` Queue Authority And Add Media UX Stabilization: next implementation task after TASK-002.5C QA/review.
- `TASK-002.5B` Cinematic Watch Room Purpose Pass: follows TASK-002.5D so the watch queue/library surfaces inherit stable queue authority and Add Media behavior.

Do not treat future features as shipped until the TASK-002 packet marks them complete.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase for durable data and future auth/profile systems
- SpacetimeDB for live room state, presence, permissions, queue mutations, and playback sync
- YouTube Data API for metadata
- YouTube IFrame API for embedded YouTube playback
- HLS.js for HLS-capable direct media
- Vercel for frontend hosting
- Cloudflare Stream planned for fast uploaded-video processing/playback
- Cloudflare R2 planned for raw/source archive and supporting media artifacts

## Architecture Boundaries

Supabase owns durable product data:

- rooms
- guest identities
- memberships
- room settings
- durable queue data
- future auth, profiles, friends, and notification systems

SpacetimeDB owns live room state:

- presence
- current playback state
- playback authority
- member permissions
- queue mutations during active sessions
- room events that need low latency

Do not move live media sync to Supabase Realtime. Supabase is not the low-latency room authority for this project.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local env file from the template:

```bash
copy .env.example .env.local
```

Required public variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SPACETIME_URI
NEXT_PUBLIC_SPACETIME_MODULE
```

Required server-only variables:

```text
SUPABASE_SECRET_KEY
SPACETIME_SERVER_AUTH_TOKEN
YOUTUBE_API_KEY
```

Never commit `.env`, `.env.local`, Vercel secrets, Supabase secret keys, or provider API keys.

Live-room host seeding uses a SpacetimeDB server identity, not a shared SpacetimeDB environment secret. Generate a server identity/token pair for each target database:

```bash
npm run spacetime:server-token
```

Store the printed token as `SPACETIME_SERVER_AUTH_TOKEN` in `.env.local` and Vercel. Add the printed identity hex to the private `trusted_seed_issuer` table in that SpacetimeDB database. The identity string is not secret; the auth token is secret. SpacetimeDB does not need `SPACETIME_ROOM_SEED_SECRET`.

Start the app and local SpacetimeDB together:

```bash
npm run dev
```

Local app:

```text
http://127.0.0.1:5371
```

Local SpacetimeDB:

```text
127.0.0.1:5372
```

If the combined command is not appropriate, run each service separately:

```bash
npm run spacetime:start
npm run dev:next
```

Check whether local development is ready:

```bash
npm run dev:check
```

Run this in a second terminal after `npm run dev` when browser QA or sync testing depends on the local app. The check validates the local env shape, Next.js port, SpacetimeDB port, SpacetimeDB module parity, the app URL, and `/api/health` without printing secret values.

If `npm run dev` reports that port `5371` is already in use, close the existing Next.js process before starting a fresh session. The script deliberately does not kill processes automatically.

If reducers fail with argument or serialization errors, confirm that `.env.local`, `spacetime.local.json`, and `spacetime.json` all point to the same SpacetimeDB database. The expected local database is:

```text
mistake-watch-rooms
```

## SpacetimeDB Commands

Start local SpacetimeDB:

```bash
npm run spacetime:start
```

Publish the module to the local server:

```bash
npm run spacetime:publish
```

Generate client bindings:

```bash
npm run spacetime:generate
```

Generate a server identity/token pair for live-room seed grants:

```bash
npm run spacetime:server-token
```

Production SpacetimeDB uses:

```text
NEXT_PUBLIC_SPACETIME_URI=https://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIME_MODULE=mistake-watch-rooms
```

## Verification

Run these after meaningful implementation work:

```bash
npm run dev:check
npm run typecheck
npm run lint
npm run build
```

Targeted tests:

```bash
npm run test:identity
npm run test:queue
npm run test:sync
npm run test:youtube
```

For UI changes, also verify the local app in the browser:

```text
http://127.0.0.1:5371
```

Local browser QA should use production only as a final confirmation path. If local QA is blocked, document the local blocker and exact remediation before relying on production.

## Deployment

Deploy to Vercel production:

```bash
npx vercel --prod
```

Health checks:

```text
https://watch.mistakestudios.com/api/health
https://mistake-watch.vercel.app/api/health
```

## Known Constraints

- YouTube can block specific videos from embedded playback due to provider, region, age, copyright, live-premiere, or embedding restrictions.
- YouTube autoplay and background-tab behavior is browser-controlled. The app owns queue progression and recovery, but user gesture and provider limits still apply.
- YouTube iframe audio cannot be sampled directly for true audio-reactive visualizers. Real audio analysis must use direct/HLS/first-party media sources where browser access is allowed.
- Uploaded watch-room video should use the approved Cloudflare Stream + R2 hybrid direction: Stream for fast processing/playback, R2 for raw/source archive and supporting artifacts where needed.
- Shared browser control is not implemented yet and must remain a separate future subsystem.
- Supabase auth, profiles, friend invites, custom avatar uploads, and notification drawers are future tasks.
- Google OAuth and owner authority are now scheduled before Stream/R2 media work so owner-only upload and source ingestion can be verified server-side.

## Handoff Reading Order

Before implementing the next task, read:

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/COMMANDS.md`
4. `docs/HANDOFF.md`
5. `docs/tasks/TASK-002-incomplete-work-recovery/tasks.md`
6. `docs/tasks/TASK-002-incomplete-work-recovery/review-notes.md`
7. `docs/tasks/TASK-002-incomplete-work-recovery/acceptance-criteria.md`

The next expected checkpoint is TASK-002.5C QA/review, then `TASK-002.5D: Queue Authority And Add Media UX Stabilization`, then `TASK-002.5B: Cinematic Watch Room Purpose Pass`.
