# Mistake Watch

## Main Note / Disclaimer

Mistake Watch is a 98% AI-built web app/website created as an experimental hobby project.

This project is not something I would call production-ready in any serious way, at least not yet. It exists because I am a curious person testing the current capabilities of AI, seeing how far it can go when someone guides it with clear direction, makes the final decisions, and owns the creative choices.

The point is not to pretend the AI is doing everything alone. The point is to explore what becomes possible when a person uses AI as a practical engineering partner, while still steering the product, deciding what matters, correcting the direction, and shaping the experience.

Most of the implementation was written with AI assistance, but the product direction, final judgment, creative decisions, testing feedback, and "this feels right or wrong" calls are mine. That distinction matters to me, because this project is just as much about learning how to guide AI well as it is about building the app itself.

The AI is expected to follow a spec-first workflow, as seen in the `docs/` folder. That workflow helps with longer-term memory, task control, implementation tracking, and keeping old ideas, decisions, planned features, and completed work from being forgotten as the project grows.

This repo may look unusual because it keeps a lot of planning, task history, implementation notes, and recovery documentation. That is intentional. It is part of the experiment: can a mostly AI-built project stay understandable over time if the work is guided through specs, review notes, and tracked decisions?

This is, above all, an experiment in the future of building software. I am testing the tools, but I am also testing myself: how far I can take an idea when the bottleneck becomes less about knowing every technical detail upfront, and more about imagination, judgment, persistence, and the ability to guide the machine well.

Use this repo with that context in mind.

And yes, the text above was enhanced with AI, because why would I not use the tool I am experimenting with?

Mistake Watch is a private watch/listen-together platform for synchronized rooms, shared queues, host-led playback, uploaded media, and music-room experimentation. It is built around a guest-first flow, with optional Google sign-in for durable account identity and owner-level features.

Production:

- `https://watch.mistakestudios.com`
- `https://mistake-watch.vercel.app`

## Current Capabilities

- Create and join private rooms with guest display names.
- Optional Google sign-in for durable profile identity, owner role support, account settings, and future account-only features.
- Sync live playback state, presence, permissions, and queue mutations through SpacetimeDB.
- Store durable rooms, accounts, media library records, upload sessions, folders, and processing events through Supabase.
- Watch YouTube videos, uploaded first-party videos, direct media URLs, and HLS-capable sources.
- Use listen mode for YouTube/YouTube Music-style music sessions with a dedicated music UI, dynamic thumbnail-based theming, room picks, search entry, and TV mode.
- Use watch mode as a cinematic room with a dominant video stage, focused transport, media hub, queue drawer, and audience/chat surface.
- Add single YouTube/direct links to the queue.
- Search YouTube through the Add Media flow, with debounced server-side search and existing queue duplicate handling.
- Import YouTube playlists through a review flow before adding items.
- Manage queue order, removal, clear, shuffle, smart shuffle, pinned-first behavior, play-next, play-now, and history filtering where permissions allow.
- Auto-advance through the queue with next-item preparation, unavailable-media skipping, and reconnect/stale-room recovery work.
- Show current media metadata, thumbnails, views, likes, queue count, next-item context, and processing states where data is available.
- Host controls playback by default, with member-level permissions for queue, playback, browser-control readiness, and room management.
- Hosts can kick members, remove idle members, save rooms, and manage recurring personal rooms.
- Owners can upload videos into the watch media library, organize uploads into folders, hide owner-only media, retry failed processing, recover multipart uploads, and queue batch uploads one file at a time.
- Uploaded media is stored in Cloudflare R2, inspected for browser safety, and processed through CloudConvert when conversion is needed.
- Shared Signal status components now distinguish waiting, loading, uploading, processing, queued, blocked, recoverable, failed, and ready states instead of treating everything as generic loading.

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

- The project has moved beyond the original MVP recovery work and is now deep into the `TASK-002` continuation packet.
- Recently completed areas include listen-room redesign, watch-room cinematic layout, Google account identity, R2 media library uploads, CloudConvert processing, multipart recovery, multi-file owner batch uploads, TV mode, performance quick wins, status-state cleanup, and reconnect/queue stability fixes.
- The next task should always be confirmed from the TASK-002 packet before implementation. Do not rely on this README as the live task board.

Do not treat future features as shipped until the TASK-002 packet marks them complete.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase for durable data, Google auth, account profiles, media records, upload sessions, folders, and processing events
- SpacetimeDB for live room state, presence, permissions, queue mutations, and playback sync
- YouTube Data API for metadata
- YouTube IFrame API for embedded YouTube playback
- HLS.js for HLS-capable direct media
- Cloudflare R2 for uploaded source/processed media storage
- CloudConvert for browser-safe MP4 conversion and processing status
- Vercel for frontend hosting
- Vercel Speed Insights for production performance telemetry

## Architecture Boundaries

Supabase owns durable product data:

- rooms
- guest identities
- memberships
- room settings
- durable queue data
- Google-authenticated profiles
- media assets
- media folders
- media upload sessions
- media processing events
- future friends, notifications, and account-only social systems

SpacetimeDB owns live room state:

- presence
- current playback state
- playback authority
- member permissions
- queue mutations during active sessions
- room events that need low latency

Do not move live media sync to Supabase Realtime. Supabase is not the low-latency room authority for this project.

Cloudflare R2 owns media object storage:

- original uploaded source files
- processed browser-safe media files
- poster images and media artifacts
- incomplete multipart upload parts until completion, abort, or lifecycle cleanup

CloudConvert owns conversion jobs only:

- it converts files that are not confidently browser-safe;
- direct-ready MP4 files should bypass conversion where possible;
- long or expensive conversions may require owner approval before spending credits.

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
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_PUBLIC_BASE_URL
CLOUDCONVERT_API_TOKEN
CLOUDCONVERT_WEBHOOK_SECRET
CRON_SECRET
```

Optional or context-specific variables used by scripts and upload limits:

```text
CLOUDCONVERT_WEBHOOK_URL
GOOGLE_YOUTUBE_API_KEY
MEDIA_UPLOAD_MAX_BYTES
MEDIA_INGEST_OWNER_USER_ID
MEDIA_INGEST_FOLDER_ID
MISTAKE_WATCH_HOST
MISTAKE_WATCH_PORT
MISTAKE_WATCH_SPACETIME_PORT
SPACETIME_CLI
```

Never commit `.env`, `.env.local`, Vercel secrets, Supabase secret keys, or provider API keys.

Google sign-in is configured through Supabase Auth. The production callback URL should include:

```text
https://watch.mistakestudios.com/auth/callback
```

CloudConvert webhooks should point to the deployed app's webhook route and use the same webhook secret configured in Vercel:

```text
https://watch.mistakestudios.com/api/media/cloudconvert/webhook
```

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
- Uploaded media currently uses R2 plus CloudConvert, not Cloudflare Stream.
- Direct-ready MP4 files should avoid CloudConvert when they are confidently browser-safe. MKV, HEVC/H.265, unsupported audio, unknown formats, or large uncertain files may need conversion and owner approval.
- CloudConvert credits are a real cost boundary. The app should keep inspecting before converting and should not blindly convert every upload.
- Multipart uploads can be resumed only after the user reselects the same local file. Browsers do not keep durable file handles for normal file inputs.
- Active browser uploads are not force-cancelled by the batch queue pause button. Pause applies to waiting items; active transfers finish or fail normally.
- Uploaded media playback still depends on browser codec support, correct content type, successful processing, and public R2/custom-domain access.
- Shared browser control is not implemented yet and must remain a separate future subsystem.
- Friends, voting, notification drawers, durable personal recommendation history, and shared browser control remain future work.
- This is not a hardened commercial product. Permissions, upload processing, and room recovery continue to evolve through the spec-first task flow.

## Handoff Reading Order

Before implementing the next task, read:

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/COMMANDS.md`
4. `docs/HANDOFF.md`
5. `docs/tasks/TASK-002-incomplete-work-recovery/tasks.md`
6. `docs/tasks/TASK-002-incomplete-work-recovery/review-notes.md`
7. `docs/tasks/TASK-002-incomplete-work-recovery/acceptance-criteria.md`

The next expected checkpoint should be read from the TASK-002 packet, not from this README.

Future listen-layout note: `TASK-002.10B AI DJ / Session Intelligence` should use the unused below-player space on tall desktop and vertical-monitor listen layouts as the preferred AI DJ card home. Keep this as advisory placement only until the AI interaction task is active.
